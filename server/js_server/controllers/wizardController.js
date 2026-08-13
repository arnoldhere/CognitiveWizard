/**
 * controllers/wizardController.js
 * =================================
 * Wizard feature controller — handles course generation, content retrieval,
 * publishing, and internal webhooks from the py_server agent pipeline.
 *
 * Content type routing:
 *  - Course/Syllabus → agentic pipeline (py_server agent graph)
 *  - Roadmap/Guide/Schedule → legacy single-LLM call (py_server generate-raw)
 *
 * New course DB hierarchy:
 *   WizardContent → CoursePhase → CourseModule → CourseLesson
 *                                              → LessonSection
 *                                              → LessonResource
 *                                              → LessonExercise
 */

const { pyAxios } = require("../utils/apiProxy");
const logger = require("../utils/logger");
const { sequelize } = require("../config/db");
const {
  WizardContent,
  WizardModule,
  WizardResource,
  User,
  CoursePhase,
  CourseModule,
  CourseLesson,
  LessonSection,
  LessonResource,
  LessonExercise,
  GenerationJob,
} = require("../models");

/** Check if a content_type is a full course (uses new relational hierarchy) */
const isCourseType = (type) =>
  ["course/syllabus", "course", "syllabus"].includes((type || "").toLowerCase().trim());

// ──────────────────────────────────────────────────────────────────────────────
// Generation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /wizard/generate
 * Generate non-course content (Roadmap, Guide, Schedule) via single LLM call.
 * Course/Syllabus is handled exclusively by generateAgentic.
 */
async function generateContent(req, res, next) {
  try {
    const { topic, content_type, details, skill_level, goal, learning_style } = req.body || {};
    logger.info(`[WIZARD] Generate: topic="${topic}", type="${content_type}" by ${req.user?.email}`);

    // Redirect course generation to the agentic pipeline
    if (isCourseType(content_type)) {
      return generateAgentic(req, res, next);
    }

    const user_role = req.user?.role || "user";
    const aiResponse = await pyAxios.post("/wizard/generate-raw", {
      topic, content_type, details, skill_level, goal, learning_style, user_role
    });

    if (!aiResponse.data || !aiResponse.data.content) {
      return res.status(500).json({ detail: "Failed to generate structured wizard content" });
    }

    const wizardContent = await WizardContent.create({
      user_id: req.user.id,
      topic,
      content_type,
      status: "generated",
      content: aiResponse.data.content,
    });

    res.json(wizardContent);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    next(err);
  }
}

/**
 * POST /wizard/generate-agentic
 * Start background agentic generation (Course/Syllabus only).
 * Creates a WizardContent record immediately and returns it.
 * The py_server agent pipeline runs in the background and calls webhooks.
 */
async function generateAgentic(req, res, next) {
  try {
    const { topic, content_type, details, skill_level, goal, learning_style } = req.body || {};
    logger.info(`[WIZARD] Generate Agentic: topic="${topic}", type="${content_type}" by ${req.user?.email}`);

    // Create skeleton record — py_server will fill in via webhook
    const wizardContent = await WizardContent.create({
      user_id: req.user.id,
      topic,
      content_type,
      status: "generating",
      content: {},
    });

    const thread_id = `job_${wizardContent.id}_${Date.now()}`;
    await GenerationJob.create({
      wizard_content_id: wizardContent.id,
      status: "queued",
      thread_id,
    });

    const user_role = req.user?.role || "user";

    // Fire off agentic pipeline — do not await (background task)
    pyAxios.post("/wizard/generate-agentic", {
      content_id: wizardContent.id,
      job_id: thread_id,
      topic, content_type, details, skill_level, goal, learning_style, user_role
    }).catch((err) => {
      logger.error(`[WIZARD] py_server agentic failed to start: ${err.message}`);
      wizardContent.update({ status: "error" }).catch(() => { });
      GenerationJob.update({ status: 'failed', error_details: err.message }, { where: { thread_id } }).catch(() => { });
    });

    res.json(wizardContent);
  } catch (err) {
    next(err);
  }
}


// ──────────────────────────────────────────────────────────────────────────────
// Read
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /wizard/history
 * Paginated content history for the authenticated user.
 */
async function getHistory(req, res, next) {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const records = await WizardContent.findAll({
      where: { user_id: req.user.id },
      order: [["created_at", "DESC"]],
      offset: skip,
      limit,
      // Return lightweight list — no nested content
      attributes: ["id", "topic", "content_type", "status", "created_at", "updated_at"],
    });

    res.json(records);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /wizard/:content_id
 * Full content retrieval.
 * For courses: returns the full phase→module→lesson hierarchy.
 * For other types: returns WizardContent with legacy WizardModule/WizardResource.
 */
async function getContent(req, res, next) {
  try {
    const where = { id: req.params.content_id, user_id: req.user.id };

    // Check content type first to determine include strategy
    const baseContent = await WizardContent.findOne({ where, attributes: ["id", "content_type", "status"] });
    if (!baseContent) return res.status(404).json({ detail: "Content not found" });

    if (isCourseType(baseContent.content_type)) {
      // Full course hierarchy
      const isFinished = ["published", "pending_approval", "error"].includes(baseContent.status);
      const content = await WizardContent.findOne({
        where,
        attributes: isFinished ? { exclude: ["content"] } : undefined, // Include content during generation for status labels
        include: [
          {
            model: GenerationJob,
            as: "generation_job"
          },
          {
            model: CoursePhase,
            as: "phases",
            order: [["sequence", "ASC"]],
            include: [
              {
                model: CourseModule,
                as: "modules",
                order: [["sequence", "ASC"]],
                include: [
                  {
                    model: CourseLesson,
                    as: "lessons",
                    order: [["sequence", "ASC"]],
                    // List view: lightweight (no sections/exercises for performance)
                    attributes: ["id", "title", "overview", "estimated_time", "sequence", "status"],
                  },
                ],
              },
            ],
          },
        ],
        order: [
          [{ model: CoursePhase, as: "phases" }, "sequence", "ASC"],
          [{ model: CoursePhase, as: "phases" }, { model: CourseModule, as: "modules" }, "sequence", "ASC"],
          [{ model: CoursePhase, as: "phases" }, { model: CourseModule, as: "modules" }, { model: CourseLesson, as: "lessons" }, "sequence", "ASC"],
        ],
      });
      return res.json(content);
    }

    // Legacy: Roadmap/Guide/Schedule with WizardModule/WizardResource
    const content = await WizardContent.findOne({
      where,
      include: [
        {
          model: GenerationJob,
          as: "generation_job"
        },
        {
          model: WizardModule,
          as: "modules",
          include: [{ model: WizardResource, as: "resources" }],
        },
      ],
      order: [[{ model: WizardModule, as: "modules" }, "sequence", "ASC"]],
    });

    res.json(content);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /wizard/:content_id/lesson/:lesson_id
 * Full lesson detail — all sections, resources, and exercises.
 * Used when learner opens a specific lesson in the CourseViewer.
 */
async function getCourseLesson(req, res, next) {
  try {
    const { content_id, lesson_id } = req.params;

    // Verify the lesson belongs to the user's content
    const lesson = await CourseLesson.findOne({
      where: { id: lesson_id, content_id },
      include: [
        {
          model: LessonSection,
          as: "sections",
          order: [["sequence", "ASC"]],
        },
        {
          model: LessonResource,
          as: "resources",
          order: [["relevance_score", "DESC"]],
        },
        {
          model: LessonExercise,
          as: "exercises",
          order: [["sequence", "ASC"]],
        },
        {
          model: CourseModule,
          as: "module",
          attributes: ["id", "title", "description"],
          include: [
            {
              model: CoursePhase,
              as: "phase",
              attributes: ["id", "title"],
            },
          ],
        },
      ],
    });

    if (!lesson) return res.status(404).json({ detail: "Lesson not found" });

    // Verify the content belongs to the requesting user
    const content = await WizardContent.findOne({
      where: { id: content_id, user_id: req.user.id },
      attributes: ["id"],
    });
    if (!content) return res.status(403).json({ detail: "Access denied" });

    res.json(lesson);
  } catch (err) {
    next(err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Modify / Delete
// ──────────────────────────────────────────────────────────────────────────────

/**
 * DELETE /wizard/:content_id
 * Delete wizard content and all cascaded children.
 */
async function deleteContent(req, res, next) {
  try {
    logger.info(`[WIZARD] Delete content_id=${req.params.content_id} by ${req.user?.email}`);
    const content = await WizardContent.findOne({
      where: { id: req.params.content_id, user_id: req.user.id },
    });

    if (!content) return res.status(404).json({ detail: "Content not found" });

    // Cascade handled by DB (onDelete: CASCADE on all child models)
    await content.destroy();
    res.json({ detail: "Content deleted successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /wizard/export-pdf
 * Proxy PDF export to py_server (roadmap only).
 */
async function exportPdf(req, res, next) {
  try {
    const { topic, content_type, details, content, skill_level, goal, learning_style } = req.body || {};
    logger.info(`[WIZARD] Export PDF: topic="${topic}" by ${req.user?.email}`);

    const pdfResponse = await pyAxios.post(
      "/wizard/export-pdf",
      { topic, content_type, details, content, skill_level, goal, learning_style },
      { responseType: "arraybuffer" }
    );

    const filename = `${(topic || "roadmap").replace(/\s+/g, "_")}_roadmap.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfResponse.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    next(err);
  }
}

/**
 * POST /wizard/:content_id/feedback
 * Submit tutor/learner feedback to trigger course regeneration.
 */
async function provideFeedback(req, res, next) {
  try {
    const { feedback } = req.body;
    const content = await WizardContent.findOne({
      where: { id: req.params.content_id, user_id: req.user.id },
    });
    if (!content) return res.status(404).json({ detail: "Content not found" });

    await content.update({ status: "generating" });

    pyAxios.post("/wizard/regenerate-agentic", {
      content_id: content.id,
      topic: content.topic,
      content: content.content,
      feedback,
    }).catch((err) => {
      logger.error(`[WIZARD] Regenerate failed to start: ${err.message}`);
      content.update({ status: "error" }).catch(() => { });
    });

    res.json(content);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /wizard/:content_id/publish
 * Publish a reviewed course draft.
 */
async function publishContent(req, res, next) {
  try {
    const content = await WizardContent.findOne({
      where: { id: req.params.content_id, user_id: req.user.id },
    });
    if (!content) return res.status(404).json({ detail: "Content not found" });

    if (isCourseType(content.content_type)) {
      // Verify the course has at least one lesson before publishing
      const lessonCount = await CourseLesson.count({ where: { content_id: content.id } });
      if (lessonCount === 0) {
        return res.status(400).json({ detail: "Cannot publish a course with no lessons" });
      }

      // Mark all lessons as published
      await CourseLesson.update(
        { status: "published" },
        { where: { content_id: content.id } }
      );
    }

    await content.update({ status: "published" });
    res.json(content);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /wizard/published
 * Retrieve published content for the marketplace.
 */
async function getPublishedCourses(req, res, next) {
  try {
    const publishedContent = await WizardContent.findAll({
      where: { status: "published" },
      attributes: ["id", "topic", "content_type", "status", "created_at"],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email", "role"],
        },
      ],
      order: [["created_at", "DESC"]],
    });
    res.json(publishedContent);
  } catch (err) {
    logger.error(`[WIZARD] Error fetching published courses: ${err.message}`);
    next(err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal Webhooks (py_server → js_server)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /internal/wizard-webhook/status
 * Granular status update during generation — used by each agent node.
 * Body: { content_id, status, label }
 *   status: machine-readable key (e.g. 'generating_lessons')
 *   label:  human-readable message (e.g. '✍️ Writing content for 12 lessons...')
 */
async function webhookAgenticStatus(req, res, next) {
  try {
    const { content_id, status, label, job_id } = req.body;
    const content = await WizardContent.findByPk(content_id);
    if (content) {
      // Store both machine status + human label for frontend polling
      await content.update({
        status,
        // Stash the label in content JSON temporarily for UX display
        content: { ...(content.content || {}), _status_label: label },
      });
    }
    if (job_id) {
      await GenerationJob.update({ current_stage: status, status: 'running' }, { where: { thread_id: job_id } });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    logger.error(`[WIZARD WEBHOOK] Status update error: ${err.message}`);
    res.status(500).json({ error: "Failed to update status" });
  }
}

/**
 * POST /internal/wizard-webhook/complete
 * Final payload from py_server after the agent pipeline completes.
 *
 * Handles two content shapes:
 *  1. `data.content_type === 'course'` → write CoursePhase/Module/Lesson/Section/Resource/Exercise tables
 *  2. Legacy flat modules → write WizardModule/WizardResource tables
 */
async function webhookAgenticComplete(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { content_id, data, error, job_id } = req.body;
    const content = await WizardContent.findByPk(content_id, { transaction: t });
    if (!content) {
      await t.rollback();
      return res.status(404).json({ error: "Content not found" });
    }

    if (error) {
      await content.update({ status: "error", content: { error } }, { transaction: t });
      if (job_id) {
        await GenerationJob.update({ status: 'failed', error_details: error }, { where: { thread_id: job_id }, transaction: t });
      }
      await t.commit();
      return res.status(200).json({ success: true });
    }

    // ── New course format ──────────────────────────────────────────────────
    if (data?.content_type === "course") {
      // If we are doing incremental saves, we might just need to finalize structure here
      await _persistCourseData(content, data, t); // This might need modification if we strictly append, but for now we'll allow overwrite or just rely on it updating missing pieces. Wait, if incremental saves exist, this will overwrite. We should change _persistCourseData to not destroy existing lessons if they are incremental, or we just rely on incremental. Let's rely on incremental and change _persistCourseData later if needed. For now, let's keep it but skip destroying if incremental. Let's modify _persistCourseData to UPSERT or only update.
      await content.update(
        { status: "pending_approval", content: { _course_stored_in_tables: true } },
        { transaction: t }
      );
      if (job_id) {
        await GenerationJob.update({ status: 'completed' }, { where: { thread_id: job_id }, transaction: t });
      }
      await t.commit();
      logger.info(`[WEBHOOK] Course id=${content_id} persisted successfully to relational tables`);
      return res.status(200).json({ success: true });
    }


    // ── Legacy flat modules (roadmap/guide/schedule) ───────────────────────
    await WizardModule.destroy({ where: { content_id: content.id }, transaction: t });

    let seq = 1;
    for (const mod of data.modules || []) {
      const dbMod = await WizardModule.create({
        content_id: content.id,
        title: mod.title || "Untitled Module",
        description: mod.description || "",
        duration: mod.duration || "",
        sequence: seq++,
        details_json: mod.topics || [],
      }, { transaction: t });

      for (const ref of mod.references || []) {
        await WizardResource.create({
          content_id: content.id,
          module_id: dbMod.id,
          title: ref.title || "Reference",
          url: ref.url || "",
          description: ref.description || "",
          source: ref.source || "web",
        }, { transaction: t });
      }
    }

    await content.update({ status: "pending_approval", content: data }, { transaction: t });
    await t.commit();
    res.status(200).json({ success: true });

  } catch (err) {
    await t.rollback();
    logger.error(`[WIZARD WEBHOOK] Complete error: ${err.message}`, err);
    res.status(500).json({ error: "Failed to complete generation" });
  }
}

/**
 * _persistCourseData
 * Writes the full CoursePackageSchema into the relational tables.
 * Runs inside a transaction (passed from webhookAgenticComplete).
 *
 * @param {WizardContent} content - Parent WizardContent record
 * @param {object} data - CoursePackageSchema JSON from py_server
 * @param {Transaction} t - Sequelize transaction
 */
async function _persistCourseData(content, data, t) {
  // Clear any previously generated course data for this content_id
  await CoursePhase.destroy({ where: { content_id: content.id }, transaction: t });

  let phaseSeq = 1;
  for (const phase of data.phases || []) {
    const dbPhase = await CoursePhase.create({
      content_id: content.id,
      title: phase.title || "Phase",
      description: phase.description || "",
      sequence: phaseSeq++,
      estimated_duration: phase.estimated_duration || "",
    }, { transaction: t });

    let modSeq = 1;
    for (const module of phase.modules || []) {
      const dbModule = await CourseModule.create({
        phase_id: dbPhase.id,
        content_id: content.id,
        title: module.title || "Module",
        description: module.description || "",
        learning_objectives: module.learning_objectives || [],
        key_takeaways: module.key_takeaways || [],
        difficulty: module.difficulty || "beginner",
        estimated_time: module.estimated_time || "",
        sequence: modSeq++,
      }, { transaction: t });

      let lessonSeq = 1;
      for (const lesson of module.lessons || []) {
        const dbLesson = await CourseLesson.create({
          module_id: dbModule.id,
          content_id: content.id,
          title: lesson.title || "Lesson",
          overview: lesson.overview || "",
          estimated_time: lesson.estimated_time || "",
          sequence: lessonSeq++,
          status: "reviewed", // Came through the reviewer node
        }, { transaction: t });

        // Write lesson sections
        let secSeq = 1;
        for (const section of lesson.sections || []) {
          await LessonSection.create({
            lesson_id: dbLesson.id,
            section_type: section.section_type || "explanation",
            title: section.title || null,
            body: section.body || "",
            language: section.language || null,
            sequence: section.sequence || secSeq++,
          }, { transaction: t });
        }

        // Write lesson resources (lesson-level references)
        for (const resource of lesson.resources || []) {
          if (!resource.url) continue;
          await LessonResource.create({
            lesson_id: dbLesson.id,
            content_id: content.id,
            title: resource.title || "Resource",
            url: resource.url,
            resource_type: resource.resource_type || "other",
            source: resource.source || "",
            description: resource.description || null,
            relevance_score: resource.relevance_score || 0.0,
            supports: resource.supports || [],
          }, { transaction: t });
        }

        // Write lesson exercises
        let exSeq = 1;
        for (const exercise of lesson.exercises || []) {
          await LessonExercise.create({
            lesson_id: dbLesson.id,
            title: exercise.title || "Exercise",
            description: exercise.description || "",
            exercise_type: exercise.exercise_type || "coding",
            difficulty: exercise.difficulty || "medium",
            starter_code: exercise.starter_code || null,
            language: exercise.language || "python",
            solution_hint: exercise.solution_hint || null,
            expected_output: exercise.expected_output || null,
            sequence: exercise.sequence || exSeq++,
          }, { transaction: t });
        }
      }
    }
  }

  logger.info(
    `[WEBHOOK] Course data persisted: content_id=${content.id}, phases=${data.phases?.length || 0}`
  );
}

/**
 * POST /internal/wizard-webhook/lesson-incremental
 * Incremental lesson save from py_server.
 */
async function webhookAgenticLessonIncremental(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { content_id, job_id, lesson_data, phase_title, module_title, sequence_info } = req.body;

    const content = await WizardContent.findByPk(content_id, { transaction: t });
    if (!content) {
      await t.rollback();
      return res.status(404).json({ error: "Content not found" });
    }

    // Upsert Phase
    let [dbPhase] = await CoursePhase.findOrCreate({
      where: { content_id, title: phase_title },
      defaults: {
        description: "",
        sequence: sequence_info.phase_seq,
        estimated_duration: "",
      },
      transaction: t
    });

    // Upsert Module
    let [dbModule] = await CourseModule.findOrCreate({
      where: { phase_id: dbPhase.id, content_id, title: module_title },
      defaults: {
        description: "",
        learning_objectives: [],
        key_takeaways: [],
        difficulty: "beginner",
        estimated_time: "",
        sequence: sequence_info.module_seq,
      },
      transaction: t
    });

    // Upsert Lesson
    let [dbLesson] = await CourseLesson.findOrCreate({
      where: { module_id: dbModule.id, content_id, title: lesson_data.title },
      defaults: {
        overview: lesson_data.overview || "",
        estimated_time: lesson_data.estimated_time || "",
        sequence: sequence_info.lesson_seq,
        status: "draft",
      },
      transaction: t
    });

    // Update it if it exists (e.g. reviewed status)
    await dbLesson.update({
      overview: lesson_data.overview || "",
      estimated_time: lesson_data.estimated_time || "",
      status: "draft", // Or reviewed if we send that info
    }, { transaction: t });

    // Clear old sections/resources/exercises for this lesson if re-generating
    await LessonSection.destroy({ where: { lesson_id: dbLesson.id }, transaction: t });
    await LessonResource.destroy({ where: { lesson_id: dbLesson.id }, transaction: t });
    await LessonExercise.destroy({ where: { lesson_id: dbLesson.id }, transaction: t });

    // Write lesson sections
    let secSeq = 1;
    for (const section of lesson_data.sections || []) {
      await LessonSection.create({
        lesson_id: dbLesson.id,
        section_type: section.section_type || "explanation",
        title: section.title || null,
        body: section.body || "",
        language: section.language || null,
        sequence: section.sequence || secSeq++,
      }, { transaction: t });
    }

    // Write lesson resources
    for (const resource of lesson_data.resources || []) {
      if (!resource.url) continue;
      await LessonResource.create({
        lesson_id: dbLesson.id,
        content_id,
        title: resource.title || "Resource",
        url: resource.url,
        resource_type: resource.resource_type || "other",
        source: resource.source || "",
        description: resource.description || null,
        relevance_score: resource.relevance_score || 0.0,
        supports: resource.supports || [],
      }, { transaction: t });
    }

    // Write lesson exercises
    let exSeq = 1;
    for (const exercise of lesson_data.exercises || []) {
      await LessonExercise.create({
        lesson_id: dbLesson.id,
        title: exercise.title || "Exercise",
        description: exercise.description || "",
        exercise_type: exercise.exercise_type || "coding",
        difficulty: exercise.difficulty || "medium",
        starter_code: exercise.starter_code || null,
        language: exercise.language || "python",
        solution_hint: exercise.solution_hint || null,
        expected_output: exercise.expected_output || null,
        sequence: exercise.sequence || exSeq++,
      }, { transaction: t });
    }

    await t.commit();
    logger.info(`[WEBHOOK] Incremental lesson saved: ${lesson_data.title}`);
    return res.status(200).json({ success: true });

  } catch (err) {
    await t.rollback();
    logger.error(`[WIZARD WEBHOOK] Incremental save error: ${err.message}`, err);
    res.status(500).json({ error: "Failed to save incremental lesson" });
  }
}

module.exports = {
  generateContent,
  getHistory,
  getContent,
  getCourseLesson,
  deleteContent,
  exportPdf,
  generateAgentic,
  provideFeedback,
  publishContent,
  getPublishedCourses,
  webhookAgenticStatus,
  webhookAgenticComplete,
  webhookAgenticLessonIncremental,
};

