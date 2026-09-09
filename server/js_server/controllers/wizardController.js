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
const { Op } = require("sequelize");
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
  GenerationCheckpoint,
  LanggraphCheckpoint,
  LanggraphWrite,
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

    const user_role = req.user?.role || "user";
    const input_payload = { topic, content_type, details, skill_level, goal, learning_style, user_role };

    const thread_id = `job_${wizardContent.id}_${Date.now()}`;
    await GenerationJob.create({
      wizard_content_id: wizardContent.id,
      status: "queued",
      thread_id,
      input_payload,
    });

    // Fire off agentic pipeline — do not await (background task)
    pyAxios.post("/wizard/generate-agentic", {
      content_id: wizardContent.id,
      job_id: thread_id,
      ...input_payload
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
 * Publish a reviewed course draft with tutor author attribution,
 * and clean up intermediate generation checkpoints, writes, and jobs.
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

    // Capture tutor author attribution
    const authorName = (req.body && req.body.author_name && req.body.author_name.trim())
      ? req.body.author_name.trim()
      : (req.user.full_name || req.user.email);

    const currentContent = content.content || {};
    const updatedContentPayload = {
      ...currentContent,
      author: authorName,
      author_id: req.user.id,
      author_role: req.user.role || "tutor",
      published_at: new Date().toISOString(),
    };

    await content.update({
      status: "published",
      content: updatedContentPayload,
    });

    // Clean up unnecessary checkpoints, writes, and completed generation jobs to optimize storage and performance
    try {
      const jobs = await GenerationJob.findAll({
        where: { wizard_content_id: content.id },
        attributes: ["id", "thread_id"],
      });
      const threadIds = jobs.map((j) => j.thread_id).filter(Boolean);
      const jobIds = jobs.map((j) => j.id);

      if (threadIds.length > 0) {
        await LanggraphWrite.destroy({ where: { thread_id: threadIds } });
        await LanggraphCheckpoint.destroy({ where: { thread_id: threadIds } });
      }
      if (jobIds.length > 0) {
        await GenerationCheckpoint.destroy({ where: { job_id: jobIds } });
        await GenerationJob.destroy({ where: { id: jobIds } });
      }
      logger.info(`[WIZARD] Cleaned up generation checkpoints and jobs for published content_id=${content.id}`);
    } catch (cleanupErr) {
      logger.warn(`[WIZARD] Non-critical: Checkpoint cleanup failed for content_id=${content.id}: ${cleanupErr.message}`);
    }

    res.json(content);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /wizard/:content_id/lesson/:lesson_id
 * Update a lesson's metadata, sections, and exercises during tutor review.
 */
async function updateCourseLesson(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { content_id, lesson_id } = req.params;
    const { title, summary, estimated_time, learning_objectives, sections, exercises } = req.body;

    // Verify content ownership
    const content = await WizardContent.findOne({
      where: { id: content_id, user_id: req.user.id },
      transaction: t,
    });
    if (!content) {
      await t.rollback();
      return res.status(404).json({ detail: "Content not found or unauthorized" });
    }

    const lesson = await CourseLesson.findOne({
      where: { id: lesson_id, content_id },
      transaction: t,
    });
    if (!lesson) {
      await t.rollback();
      return res.status(404).json({ detail: "Lesson not found" });
    }

    // Update basic fields
    const updateFields = { status: "reviewed" };
    if (title !== undefined) updateFields.title = title;
    if (summary !== undefined) updateFields.summary = summary;
    if (estimated_time !== undefined) updateFields.estimated_time = estimated_time;
    if (learning_objectives !== undefined) updateFields.learning_objectives = learning_objectives;

    await lesson.update(updateFields, { transaction: t });

    // If sections provided, update existing sections or create new
    if (Array.isArray(sections)) {
      for (const sec of sections) {
        if (sec.id) {
          await LessonSection.update(
            {
              title: sec.title,
              content_markdown: sec.content_markdown || sec.body,
              section_type: sec.section_type || "explanation",
              language: sec.language || null,
            },
            { where: { id: sec.id, lesson_id: lesson.id }, transaction: t }
          );
        } else if (sec.body || sec.content_markdown) {
          await LessonSection.create(
            {
              lesson_id: lesson.id,
              title: sec.title || null,
              content_markdown: sec.content_markdown || sec.body,
              section_type: sec.section_type || "explanation",
              language: sec.language || null,
              sequence: sec.sequence || 1,
            },
            { transaction: t }
          );
        }
      }
    }

    // If exercises provided, update existing or create new
    if (Array.isArray(exercises)) {
      for (const ex of exercises) {
        if (ex.id) {
          await LessonExercise.update(
            {
              title: ex.title,
              description: ex.description,
              exercise_type: ex.exercise_type || "reflection",
              starter_code: ex.starter_code || null,
              language: ex.language || null,
              solution_hint: ex.solution_hint || null,
              expected_output: ex.expected_output || null,
            },
            { where: { id: ex.id, lesson_id: lesson.id }, transaction: t }
          );
        } else if (ex.title && ex.description) {
          await LessonExercise.create(
            {
              lesson_id: lesson.id,
              title: ex.title,
              description: ex.description,
              exercise_type: ex.exercise_type || "reflection",
              difficulty: ex.difficulty || "medium",
              starter_code: ex.starter_code || null,
              language: ex.language || null,
              solution_hint: ex.solution_hint || null,
              expected_output: ex.expected_output || null,
              sequence: ex.sequence || 1,
            },
            { transaction: t }
          );
        }
      }
    }

    await t.commit();

    // Return updated lesson with all children
    const updated = await CourseLesson.findOne({
      where: { id: lesson_id },
      include: [
        { model: LessonSection, as: "sections", order: [["sequence", "ASC"]] },
        { model: LessonResource, as: "resources", order: [["relevance_score", "DESC"]] },
        { model: LessonExercise, as: "exercises", order: [["sequence", "ASC"]] },
      ],
    });

    res.json(updated);
  } catch (err) {
    await t.rollback();
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
      attributes: ["id", "topic", "content_type", "status", "content", "created_at"],
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
    const { content_id, status, label, job_id, state_cache } = req.body;
    const content = await WizardContent.findByPk(content_id);
    if (content) {
      // Store both machine status + human label for frontend polling
      const updatedContent = { ...(content.content || {}), _status_label: label };
      if (state_cache) {
        updatedContent.langgraph_state = state_cache;
      }
      await content.update({
        status,
        content: updatedContent,
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
 * GET /internal/wizard-webhook/incomplete
 * Retrieves jobs that were abandoned mid-generation (e.g. server crash).
 */
async function getIncompleteGenerations(req, res, next) {
  try {
    const jobs = await GenerationJob.findAll({
      where: { status: { [Op.in]: ['queued', 'running'] } },
      include: [{ model: WizardContent, as: 'wizard_content' }]
    });

    const result = jobs.map(j => {
      const wc = j.wizard_content;
      const input = j.input_payload || {};
      return {
        content_id: wc.id,
        job_id: j.thread_id,
        topic: input.topic || wc.topic,
        content_type: input.content_type || wc.content_type,
        details: input.details,
        skill_level: input.skill_level,
        goal: input.goal,
        learning_style: input.learning_style,
        user_role: input.user_role,
        state_cache: wc.content?.langgraph_state || null
      };
    });

    res.json(result);
  } catch (err) {
    logger.error(`[WIZARD WEBHOOK] Failed to fetch incomplete generations: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch incomplete generations" });
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

    const reqStatus = req.body.status;
    const userMessage = req.body.user_message;
    const retryInfo = req.body.retry_info;

    if (error || reqStatus === 'failed' || reqStatus === 'degraded') {
      const contentStatus = reqStatus === 'degraded' ? 'generating' : 'error';
      await content.update({ status: contentStatus, content: { error } }, { transaction: t });
      
      if (job_id) {
        const updatePayload = {
          status: reqStatus || 'failed',
          error_details: error || null,
          user_message: userMessage || "Something unexpected happened. Our system will try again automatically."
        };
        if (retryInfo && retryInfo.retry_count !== undefined) {
          updatePayload.retry_count = retryInfo.retry_count;
        }
        await GenerationJob.update(updatePayload, { where: { thread_id: job_id }, transaction: t });
      }
      await t.commit();
      return res.status(200).json({ success: true });
    }

    // ── Course format ──────────────────────────────────────────────────────
    const isCourse = content.content_type === "course" || data?.content_type === "course";
    if (isCourse) {
      if (!data || data.error || !Array.isArray(data.phases) || data.phases.length === 0) {
        const errorMsg = data?.error || "Course package is incomplete or missing phases";
        await content.update({ status: "error", content: { error: errorMsg } }, { transaction: t });
        if (job_id) {
          await GenerationJob.update(
            { status: "failed", error_details: errorMsg, user_message: "Course generation could not be completed." },
            { where: { thread_id: job_id }, transaction: t }
          );
        }
        await t.commit();
        logger.error(`[WEBHOOK] Course id=${content_id} failed package validation: ${errorMsg}`);
        return res.status(400).json({ error: errorMsg });
      }

      await _persistCourseData(content, data, t);
      await content.update(
        {
          status: "pending_approval",
          content: {
            ...(content.content || {}),
            _course_stored_in_tables: true,
            domain: data.domain || "general",
            domain_label: data.domain_label || "General",
            exercise_paradigm: data.exercise_paradigm || "mixed",
          },
        },
        { transaction: t }
      );
      if (job_id) {
        await GenerationJob.update({ status: "completed" }, { where: { thread_id: job_id }, transaction: t });
      }
      await t.commit();
      logger.info(`[WEBHOOK] Course id=${content_id} persisted successfully via bulkCreate`);
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
 * Optimized with Sequelize bulkCreate for sections, resources, and exercises
 * to reduce DB round-trips from ~250+ down to ~5-10.
 *
 * @param {WizardContent} content - Parent WizardContent record
 * @param {object} data - CoursePackageSchema JSON from py_server
 * @param {Transaction} t - Sequelize transaction
 */
async function _persistCourseData(content, data, t) {
  // Clear any previously generated course data for this content_id
  await CoursePhase.destroy({ where: { content_id: content.id }, transaction: t });

  const sectionsToCreate = [];
  const resourcesToCreate = [];
  const exercisesToCreate = [];

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
          status: "reviewed",
        }, { transaction: t });

        // Collect lesson sections for bulk insertion
        let secSeq = 1;
        for (const section of lesson.sections || []) {
          sectionsToCreate.push({
            lesson_id: dbLesson.id,
            section_type: section.section_type || "explanation",
            title: section.title || null,
            body: section.body || "",
            language: section.language || null,
            sequence: section.sequence || secSeq++,
          });
        }

        // Collect lesson resources for bulk insertion
        for (const resource of lesson.resources || []) {
          if (!resource.url) continue;
          resourcesToCreate.push({
            lesson_id: dbLesson.id,
            content_id: content.id,
            title: resource.title || "Resource",
            url: resource.url,
            resource_type: resource.resource_type || "other",
            source: resource.source || "",
            description: resource.description || null,
            relevance_score: resource.relevance_score || 0.0,
            supports: resource.supports || [],
          });
        }

        // Collect lesson exercises for bulk insertion
        let exSeq = 1;
        for (const exercise of lesson.exercises || []) {
          exercisesToCreate.push({
            lesson_id: dbLesson.id,
            title: exercise.title || "Exercise",
            description: exercise.description || "",
            exercise_type: exercise.exercise_type || "reflection",
            difficulty: exercise.difficulty || "medium",
            starter_code: exercise.starter_code || null,
            language: exercise.language || null,
            solution_hint: exercise.solution_hint || null,
            expected_output: exercise.expected_output || null,
            sequence: exercise.sequence || exSeq++,
          });
        }
      }
    }
  }

  // High-performance batch insertion for all child entities
  if (sectionsToCreate.length > 0) {
    await LessonSection.bulkCreate(sectionsToCreate, { transaction: t });
  }
  if (resourcesToCreate.length > 0) {
    await LessonResource.bulkCreate(resourcesToCreate, { transaction: t });
  }
  if (exercisesToCreate.length > 0) {
    await LessonExercise.bulkCreate(exercisesToCreate, { transaction: t });
  }

  logger.info(
    `[WEBHOOK] Course data persisted via bulkCreate: content_id=${content.id}, phases=${data.phases?.length || 0}, sections=${sectionsToCreate.length}, resources=${resourcesToCreate.length}, exercises=${exercisesToCreate.length}`
  );
}

/**
 * POST /internal/wizard-webhook/lesson-incremental
 * Incremental lesson save from py_server.
 */
async function webhookAgenticLessonIncremental(req, res, next) {
  const { content_id, job_id, lesson_data, phase_title, module_title, sequence_info, state_cache } = req.body;

  if (!content_id || !lesson_data || !lesson_data.title) {
    return res.status(400).json({ error: "Missing required incremental payload (content_id or lesson_data.title)" });
  }

  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    const t = await sequelize.transaction();
    try {
      const content = await WizardContent.findByPk(content_id, { transaction: t });
      if (!content) {
        await t.rollback();
        return res.status(404).json({ error: "Content not found" });
      }

      if (state_cache) {
        await content.update({
          content: { ...(content.content || {}), langgraph_state: state_cache }
        }, { transaction: t });
      }

      // Upsert Phase
      const [dbPhase] = await CoursePhase.findOrCreate({
        where: { content_id, title: phase_title },
        defaults: {
          description: "",
          sequence: sequence_info?.phase_seq || 1,
          estimated_duration: "",
        },
        transaction: t
      });

      // Upsert Module
      const [dbModule] = await CourseModule.findOrCreate({
        where: { phase_id: dbPhase.id, content_id, title: module_title },
        defaults: {
          description: "",
          learning_objectives: [],
          key_takeaways: [],
          difficulty: "beginner",
          estimated_time: "",
          sequence: sequence_info?.module_seq || 1,
        },
        transaction: t
      });

      // Upsert Lesson
      const [dbLesson] = await CourseLesson.findOrCreate({
        where: { module_id: dbModule.id, content_id, title: lesson_data.title },
        defaults: {
          overview: lesson_data.overview || "",
          estimated_time: lesson_data.estimated_time || "",
          sequence: sequence_info?.lesson_seq || 1,
          status: "draft",
        },
        transaction: t
      });

      // Update existing lesson fields
      await dbLesson.update({
        overview: lesson_data.overview || "",
        estimated_time: lesson_data.estimated_time || "",
        status: "draft",
      }, { transaction: t });

      // Clear old sections/resources/exercises for this lesson if re-generating
      await LessonSection.destroy({ where: { lesson_id: dbLesson.id }, transaction: t });
      await LessonResource.destroy({ where: { lesson_id: dbLesson.id }, transaction: t });
      await LessonExercise.destroy({ where: { lesson_id: dbLesson.id }, transaction: t });

      // Write lesson sections in bulk
      let secSeq = 1;
      const sectionsToCreate = (lesson_data.sections || []).map(section => ({
        lesson_id: dbLesson.id,
        section_type: section.section_type || "explanation",
        title: section.title || null,
        body: section.body || "",
        language: section.language || null,
        sequence: section.sequence || secSeq++,
      }));
      if (sectionsToCreate.length > 0) {
        await LessonSection.bulkCreate(sectionsToCreate, { transaction: t });
      }

      // Write lesson resources in bulk
      const resourcesToCreate = (lesson_data.resources || [])
        .filter(r => r && r.url)
        .map(resource => ({
          lesson_id: dbLesson.id,
          content_id,
          title: resource.title || "Resource",
          url: resource.url,
          resource_type: resource.resource_type || "other",
          source: resource.source || "",
          description: resource.description || null,
          relevance_score: resource.relevance_score || 0.0,
          supports: resource.supports || [],
        }));
      if (resourcesToCreate.length > 0) {
        await LessonResource.bulkCreate(resourcesToCreate, { transaction: t });
      }

      // Write lesson exercises in bulk
      let exSeq = 1;
      const exercisesToCreate = (lesson_data.exercises || []).map(exercise => ({
        lesson_id: dbLesson.id,
        title: exercise.title || "Exercise",
        description: exercise.description || "",
        exercise_type: exercise.exercise_type || "reflection",
        difficulty: exercise.difficulty || "medium",
        starter_code: exercise.starter_code || null,
        language: exercise.language || null,
        solution_hint: exercise.solution_hint || null,
        expected_output: exercise.expected_output || null,
        sequence: exercise.sequence || exSeq++,
      }));
      if (exercisesToCreate.length > 0) {
        await LessonExercise.bulkCreate(exercisesToCreate, { transaction: t });
      }

      await t.commit();
      logger.info(`[WEBHOOK] Incremental lesson saved: ${lesson_data.title}`);
      return res.status(200).json({ success: true });

    } catch (err) {
      await t.rollback();
      const isDeadlock = err.original?.errno === 1213 || (err.message && err.message.includes('Deadlock'));
      if (isDeadlock && attempt < MAX_RETRIES) {
        logger.warn(`[WIZARD WEBHOOK] Deadlock detected during incremental save (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${attempt * 100}ms...`);
        await new Promise(r => setTimeout(r, attempt * 100));
        continue;
      }
      logger.error(`[WIZARD WEBHOOK] Incremental save error: ${err.message}`, err);
      return res.status(500).json({ error: "Failed to save incremental lesson" });
    }
  }
}

/**
 * GET /wizard/generation/:content_id
 * User-facing endpoint for polling generation status.
 */
async function getGenerationStatus(req, res, next) {
  try {
    const { content_id } = req.params;
    const content = await WizardContent.findOne({
      where: { id: content_id, user_id: req.user.id }
    });
    if (!content) return res.status(404).json({ error: "Content not found" });

    const job = await GenerationJob.findOne({
      where: { wizard_content_id: content_id },
      order: [['created_at', 'DESC']]
    });

    if (!job) return res.status(404).json({ error: "Job not found" });

    // Try to get progress from checkpoints
    const { GenerationCheckpoint } = require('../models');
    const checkpoints = await GenerationCheckpoint.findAll({ where: { job_id: job.id } });

    res.json({
      job_id: job.thread_id,
      status: job.status,
      content_type: content.content_type,
      current_stage: job.current_stage,
      retry_count: job.retry_count,
      error: job.error_details,
      checkpoints: checkpoints.map(c => ({ stage: c.stage, status: c.status, node: c.node })),
      label: content.content?._status_label
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /internal/wizard-webhook/job/:job_id
 */
async function getJobStatus(req, res, next) {
  try {
    const job = await GenerationJob.findOne({ where: { thread_id: req.params.job_id } });
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
}

/**
 * POST /internal/wizard-webhook/job/:job_id/retry
 */
async function retryJob(req, res, next) {
  try {
    const job = await GenerationJob.findOne({ where: { thread_id: req.params.job_id } });
    if (!job) return res.status(404).json({ error: "Job not found" });

    await job.update({ status: 'pending', retry_count: job.retry_count + 1 });

    // Trigger python pyAxios
    pyAxios.post(`/wizard/generation/${job.thread_id}/retry`).catch(e => logger.error(`Retry ping failed: ${e.message}`));

    res.json({ success: true, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
}

/**
 * POST /internal/wizard-webhook/job/:job_id/cancel
 */
async function cancelJob(req, res, next) {
  try {
    const job = await GenerationJob.findOne({ where: { thread_id: req.params.job_id } });
    if (!job) return res.status(404).json({ error: "Job not found" });

    await job.update({ status: 'cancelled' });

    // Trigger python pyAxios
    pyAxios.post(`/wizard/generation/${job.thread_id}/cancel`).catch(e => logger.error(`Cancel ping failed: ${e.message}`));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
}

/**
 * POST /internal/wizard-webhook/checkpoint
 * Upserts a GenerationCheckpoint
 */
async function webhookAgenticCheckpoint(req, res, next) {
  try {
    const { job_id, stage, node, status } = req.body;
    const job = await GenerationJob.findOne({ where: { thread_id: job_id } });
    if (!job) return res.status(404).json({ error: "Job not found" });

    const { GenerationCheckpoint } = require('../models');

    // Upsert using Sequelize findOrCreate + update or native upsert
    const [checkpoint, created] = await GenerationCheckpoint.findOrCreate({
      where: { job_id: job.id, stage },
      defaults: { node, status }
    });

    if (!created) {
      await checkpoint.update({ node, status });
    }

    res.json({ success: true });
  } catch (err) {
    logger.error(`[WIZARD WEBHOOK] Checkpoint error: ${err.message}`);
    res.status(500).json({ error: "Internal error" });
  }
}

/**
 * Resume waiting, queued, or failed generation tasks.
/**
 * Get count of resumable failed/pending generation tasks for a user.
 * Used for login notifications.
 */
async function getFailedGenerationsCount(userId) {
  try {
    const contents = await WizardContent.findAll({
      where: { user_id: userId },
      attributes: ['id']
    });
    const contentIds = contents.map(c => c.id);
    if (contentIds.length === 0) return 0;

    const limitDate = new Date();
    limitDate.setHours(limitDate.getHours() - 48);

    const count = await GenerationJob.count({
      where: {
        wizard_content_id: { [Op.in]: contentIds },
        status: { [Op.in]: ['queued', 'failed', 'degraded', 'pending', 'resuming'] },
        retry_count: { [Op.lt]: 3 },
        created_at: { [Op.gte]: limitDate }
      }
    });
    return count;
  } catch (err) {
    logger.error(`[RESUME] Error getting failed generation count: ${err.message}`);
    return 0;
  }
}

/**
 * Resume waiting, queued, or failed generation tasks.
 * Applies max age (48h) and max retry (< 3) guards.
 * Stale jobs (> 48h) are permanently marked as cancelled and their checkpoints cleaned.
 */
async function resumePendingGenerations(userId = null) {
  const result = { resumed: 0, skipped: 0, reasons: [] };
  try {
    const whereClause = {
      status: {
        [Op.in]: ['queued', 'failed', 'degraded', 'pending', 'resuming']
      }
    };
    
    if (userId) {
      const contents = await WizardContent.findAll({
        where: { user_id: userId },
        attributes: ['id']
      });
      const contentIds = contents.map(c => c.id);
      if (contentIds.length === 0) return result;
      whereClause.wizard_content_id = { [Op.in]: contentIds };
    }

    const jobs = await GenerationJob.findAll({ where: whereClause });
    const limitDate = new Date();
    limitDate.setHours(limitDate.getHours() - 48);

    for (const job of jobs) {
      // 1. Max age guard & Cleanup
      if (new Date(job.created_at) < limitDate) {
        logger.info(`[RESUME] Skipping and cleaning stale job ${job.thread_id} (created: ${job.created_at})`);
        job.status = 'cancelled';
        job.user_message = "Generation expired and was cancelled automatically.";
        await job.save();

        // Mark associated wizard content as error
        await WizardContent.update(
          { status: 'error' },
          { where: { id: job.wizard_content_id } }
        );

        // Cleanup stale checkpointer data from DB to maintain performance
        const { LanggraphCheckpoint, LanggraphWrite } = require('../models');
        await LanggraphCheckpoint.destroy({ where: { thread_id: job.thread_id } });
        await LanggraphWrite.destroy({ where: { thread_id: job.thread_id } });

        result.skipped++;
        result.reasons.push(`Job ${job.thread_id} too old (>48h)`);
        continue;
      }

      // 2. Max retry guard
      if (job.retry_count >= 3) {
        logger.info(`[RESUME] Skipping job ${job.thread_id} - max retries reached`);
        result.skipped++;
        result.reasons.push(`Job ${job.thread_id} max retries (3) reached`);
        continue;
      }

      // 3. Resume execution
      logger.info(`[RESUME] Triggering retry for GenerationJob ${job.thread_id} (status: ${job.status})`);
      job.status = 'resuming';
      await job.save();

      // Update associated content status to generating so UI updates correctly
      await WizardContent.update(
        { status: 'generating' },
        { where: { id: job.wizard_content_id } }
      );

      try {
        await pyAxios.post(`/wizard/generation/${job.thread_id}/retry`);
        result.resumed++;
      } catch (err) {
        logger.error(`[RESUME] Failed to retry job ${job.thread_id}: ${err.message}`);
        result.reasons.push(`Job ${job.thread_id} pyAxios POST failed`);
      }
    }
    return result;
  } catch (err) {
    logger.error(`[RESUME] Error checking pending generations: ${err.message}`);
    return result;
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
  updateCourseLesson,
  getPublishedCourses,
  webhookAgenticStatus,
  webhookAgenticComplete,
  webhookAgenticLessonIncremental,
  getIncompleteGenerations,
  getGenerationStatus,
  getJobStatus,
  retryJob,
  cancelJob,
  webhookAgenticCheckpoint,
  resumePendingGenerations,
  getFailedGenerationsCount,
};


