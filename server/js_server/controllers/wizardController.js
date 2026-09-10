/**
 * controllers/wizardController.js
 * =================================
 * AI Wizard feature controller — handles course generation, content retrieval,
 * publishing, tutor review, and internal webhooks from the py_server agent pipeline.
 *
 * New normalized database architecture:
 *   wizard_contents (common metadata / root)
 *     ├── 1:1 wizard_roadmaps
 *     ├── 1:1 wizard_guides
 *     ├── 1:1 wizard_courses
 *     │         └── 1:N wizard_course_sections
 *     │                   └── 1:N wizard_lessons
 *     │                             ├── 1:N wizard_lesson_sections
 *     │                             └── 1:N wizard_lesson_exercises
 *     ├── 1:N wizard_generation_jobs
 *     ├── 1:N wizard_content_versions
 *     └── 1:N wizard_content_metadata
 *
 * Polymorphic resources:
 *   wizard_resources (linked to roadmap, guide, course, or lesson)
 *     └── 1:N wizard_resource_links
 */

const { pyAxios } = require("../utils/apiProxy");
const logger = require("../utils/logger");
const { sequelize } = require("../config/db");
const { Op } = require("sequelize");
const { encodeCursor, decodeCursor, buildCursorWhere } = require("../utils/paginationHelper");
const {
  WizardContent,
  Roadmap,
  Guide,
  Course,
  CourseSection,
  Lesson,
  LessonSection,
  LessonExercise,
  Resource,
  ResourceLink,
  GenerationJob,
  ContentVersion,
  ContentMetadata,
  User,
  LanggraphCheckpoint,
  LanggraphWrite,
} = require("../models");

/** Check if a content_type is a full course (uses relational course hierarchy) */
const isCourseType = (type) =>
  ["course/syllabus", "course", "syllabus"].includes((type || "").toLowerCase().trim());

// ──────────────────────────────────────────────────────────────────────────────
// Generation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /wizard/generate
 * Generate non-course content (Roadmap, Guide) via single LLM call.
 * Course/Syllabus is handled exclusively by generateAgentic.
 */
async function generateContent(req, res, next) {
  try {
    const { topic, content_type, details, skill_level, goal, learning_style } = req.body || {};
    logger.info(`[WIZARD] Generate: topic="${topic}", type="${content_type}" by ${req.user?.email}`);

    const normalizedType = (content_type || "").toLowerCase().trim();
    if (normalizedType === "schedule") {
      return res.status(400).json({
        detail: "Schedule generation is no longer supported. Allowed types are: Course/Syllabus, Roadmap, Guide."
      });
    }

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

    const payload = aiResponse.data.content;
    const title = payload.title || topic;
    const description = payload.description || "";

    // 1. Create root WizardContent
    const wizardContent = await WizardContent.create({
      user_id: req.user.id,
      topic,
      title,
      description,
      content_type: normalizedType === "roadmap" ? "Roadmap" : "Guide",
      status: "generated",
      skill_level: (skill_level || "beginner").toLowerCase(),
      content: payload, // Preserved for immediate frontend compatibility
    });

    // 2. Persist type-specific specialization (Roadmap or Guide)
    if (normalizedType === "roadmap") {
      const rawModules = payload.phasewise_modules || payload.modules || [];
      const dbRoadmap = await Roadmap.create({
        content_id: wizardContent.id,
        title,
        description,
        learning_style: learning_style || null,
        total_modules: rawModules.length,
        modules_data: rawModules,
        prerequisites: payload.prerequisites || [],
        outcomes: payload.outcomes || [],
        graph_data: payload.graph_data || null,
      });

      // Persist common references if returned
      const references = payload.references || {};
      const refCategories = Object.keys(references);
      for (const cat of refCategories) {
        const items = references[cat] || [];
        for (const item of items) {
          if (!item.url && !item.link) continue;
          const resource = await Resource.create({
            entity_type: "roadmap",
            entity_id: dbRoadmap.id,
            title: item.title || item.name || "Learning Reference",
            description: item.description || null,
            category: cat,
            resource_type: item.resource_type || "article",
            provider: item.source || item.provider || null,
          });
          await ResourceLink.create({
            resource_id: resource.id,
            url: item.url || item.link,
            link_type: "primary",
            domain: item.domain || null,
          });
        }
      }
    } else {
      // Guide specialization
      const rawModules = payload.modules || [];
      const dbGuide = await Guide.create({
        content_id: wizardContent.id,
        title,
        description,
        summary: payload.summary || "",
        guide_style: payload.guide_style || null,
        reading_time_minutes: payload.reading_time_minutes || 0,
        tools_required: payload.tools_required || [],
        modules_data: rawModules,
        body_markdown: payload.body_markdown || null,
      });

      // Persist references if any
      const references = payload.references || {};
      const refCategories = Object.keys(references);
      for (const cat of refCategories) {
        const items = references[cat] || [];
        for (const item of items) {
          if (!item.url && !item.link) continue;
          const resource = await Resource.create({
            entity_type: "guide",
            entity_id: dbGuide.id,
            title: item.title || item.name || "Learning Reference",
            description: item.description || null,
            category: cat,
            resource_type: item.resource_type || "article",
            provider: item.source || item.provider || null,
          });
          await ResourceLink.create({
            resource_id: resource.id,
            url: item.url || item.link,
            link_type: "primary",
            domain: item.domain || null,
          });
        }
      }
    }

    // 3. Create initial ContentVersion snapshot
    await ContentVersion.create({
      wizard_content_id: wizardContent.id,
      version_number: 1,
      title,
      change_summary: "Initial AI Generation",
      snapshot_data: payload,
      created_by_user_id: req.user.id,
      is_current: true,
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
 * Creates a WizardContent + Course record and returns it immediately.
 * The py_server agent pipeline runs in the background and posts webhooks.
 */
async function generateAgentic(req, res, next) {
  try {
    const { topic, content_type, details, skill_level, goal, learning_style } = req.body || {};
    logger.info(`[WIZARD] Generate Agentic: topic="${topic}", type="${content_type}" by ${req.user?.email}`);

    // Create skeleton root record
    const wizardContent = await WizardContent.create({
      user_id: req.user.id,
      topic,
      title: topic,
      content_type: "Course/Syllabus",
      status: "generating",
      skill_level: (skill_level || "beginner").toLowerCase(),
      content: {},
    });

    // Create skeleton Course record
    await Course.create({
      content_id: wizardContent.id,
      title: topic,
      domain: "general",
      domain_label: "General",
      exercise_paradigm: "mixed",
    });

    const user_role = req.user?.role || "user";
    const input_payload = { topic, content_type, details, skill_level, goal, learning_style, user_role };
    const thread_id = `job_${wizardContent.id}_${Date.now()}`;

    // Create GenerationJob tracker
    await GenerationJob.create({
      wizard_content_id: wizardContent.id,
      status: "queued",
      thread_id,
      input_payload,
      total_steps: 6,
      stage_progress_percent: 5,
    });

    // Fire off agentic pipeline in background
    pyAxios.post("/wizard/generate-agentic", {
      content_id: wizardContent.id,
      job_id: thread_id,
      ...input_payload
    }).catch((err) => {
      logger.error(`[WIZARD] py_server agentic failed to start: ${err.message}`);
      wizardContent.update({ status: "error" }).catch(() => { });
      GenerationJob.update({ status: "failed", error_details: err.message }, { where: { thread_id } }).catch(() => { });
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
    const skip = parseInt(req.query.skip, 10) || 0;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    const records = await WizardContent.findAll({
      where: { user_id: req.user.id },
      order: [["created_at", "DESC"]],
      offset: skip,
      limit,
      attributes: ["id", "topic", "title", "content_type", "status", "created_at", "updated_at"],
    });

    res.json(records);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /wizard/:content_id
 * Full content retrieval.
 * For courses: returns the course with sections and lessons.
 * For roadmaps: returns the roadmap with modules and resources.
 * For guides: returns the guide with mastery sections and resources.
 */
async function getContent(req, res, next) {
  try {
    const where = { id: req.params.content_id, user_id: req.user.id };

    const baseContent = await WizardContent.findOne({ where, attributes: ["id", "content_type", "status"] });
    if (!baseContent) return res.status(404).json({ detail: "Content not found" });

    // ── Course Content Type ───────────────────────────────────────────────────
    if (isCourseType(baseContent.content_type)) {
      const content = await WizardContent.findOne({
        where,
        include: [
          {
            model: GenerationJob,
            as: "generation_job",
          },
          {
            model: Course,
            as: "course",
            include: [
              {
                model: CourseSection,
                as: "sections",
                order: [["sequence", "ASC"]],
                include: [
                  {
                    model: Lesson,
                    as: "lessons",
                    order: [["sequence", "ASC"]],
                    attributes: ["id", "title", "slug", "overview", "estimated_time", "sequence", "status"],
                  },
                ],
              },
            ],
          },
        ],
        order: [
          [{ model: Course, as: "course" }, { model: CourseSection, as: "sections" }, "sequence", "ASC"],
          [{ model: Course, as: "course" }, { model: CourseSection, as: "sections" }, { model: Lesson, as: "lessons" }, "sequence", "ASC"],
        ],
      });

      if (!content) return res.status(404).json({ detail: "Content not found" });
      const json = content.toJSON();

      // Backwards-compatible `chapters` alias for existing frontend components (CourseViewer, etc.)
      if (json.course && Array.isArray(json.course.sections)) {
        json.chapters = json.course.sections.map((sec, idx) => ({
          id: sec.id,
          title: sec.title,
          description: sec.description,
          sequence: sec.sequence,
          estimated_duration: sec.estimated_duration,
          modules: [
            {
              id: sec.id,
              title: sec.title,
              description: sec.description,
              sequence: 1,
              lessons: sec.lessons || [],
            },
          ],
        }));
      }

      return res.json(json);
    }

    // ── Roadmap Content Type ──────────────────────────────────────────────────
    if ((baseContent.content_type || "").toLowerCase() === "roadmap") {
      const content = await WizardContent.findOne({
        where,
        include: [
          { model: GenerationJob, as: "generation_job" },
          { model: Roadmap, as: "roadmap" },
        ],
      });
      if (!content) return res.status(404).json({ detail: "Content not found" });
      const json = content.toJSON();

      // Load resources for roadmap
      if (json.roadmap) {
        const resources = await Resource.findAll({
          where: { entity_type: "roadmap", entity_id: json.roadmap.id },
          include: [{ model: ResourceLink, as: "links" }],
        });
        json.roadmap.resources = resources;

        // Populate content object for existing RoadmapDisplay component
        json.content = {
          ...(json.content || {}),
          title: json.roadmap.title || json.topic,
          description: json.roadmap.description,
          modules: json.roadmap.modules_data,
          phasewise_modules: json.roadmap.modules_data,
          prerequisites: json.roadmap.prerequisites,
          outcomes: json.roadmap.outcomes,
          graph_data: json.roadmap.graph_data,
        };
      }
      return res.json(json);
    }

    // ── Guide Content Type ────────────────────────────────────────────────────
    const content = await WizardContent.findOne({
      where,
      include: [
        { model: GenerationJob, as: "generation_job" },
        { model: Guide, as: "guide" },
      ],
    });
    if (!content) return res.status(404).json({ detail: "Content not found" });
    const json = content.toJSON();

    if (json.guide) {
      const resources = await Resource.findAll({
        where: { entity_type: "guide", entity_id: json.guide.id },
        include: [{ model: ResourceLink, as: "links" }],
      });
      json.guide.resources = resources;

      json.content = {
        ...(json.content || {}),
        title: json.guide.title || json.topic,
        description: json.guide.description,
        summary: json.guide.summary,
        modules: json.guide.modules_data,
        body_markdown: json.guide.body_markdown,
        reading_time_minutes: json.guide.reading_time_minutes,
        tools_required: json.guide.tools_required,
      };
    }
    return res.json(json);

  } catch (err) {
    next(err);
  }
}

/**
 * GET /wizard/:content_id/lesson/:lesson_id
 * Full lesson detail — all sections, resources, and exercises.
 * Used when learner opens a specific lesson in the CourseViewer / LessonReader.
 */
async function getCourseLesson(req, res, next) {
  try {
    const { content_id, lesson_id } = req.params;

    // Verify parent content belongs to user
    const content = await WizardContent.findOne({
      where: { id: content_id, user_id: req.user.id },
      attributes: ["id"],
    });
    if (!content) return res.status(403).json({ detail: "Access denied" });

    // Fetch lesson with sections and exercises
    const lesson = await Lesson.findOne({
      where: { id: lesson_id },
      include: [
        {
          model: LessonSection,
          as: "sections",
          order: [["sequence", "ASC"]],
        },
        {
          model: LessonExercise,
          as: "exercises",
          order: [["sequence", "ASC"]],
        },
        {
          model: CourseSection,
          as: "section",
          attributes: ["id", "title", "description"],
          include: [
            {
              model: Course,
              as: "course",
              attributes: ["id", "title", "content_id"],
            },
          ],
        },
      ],
    });

    if (!lesson) return res.status(404).json({ detail: "Lesson not found" });

    // Verify lesson belongs to the expected course
    if (lesson.section?.course?.content_id !== parseInt(content_id, 10)) {
      return res.status(403).json({ detail: "Lesson does not belong to this content" });
    }

    // Load resources linked to this lesson
    const rawResources = await Resource.findAll({
      where: { entity_type: "lesson", entity_id: lesson.id },
      include: [{ model: ResourceLink, as: "links" }],
      order: [["relevance_score", "DESC"]],
    });

    const json = lesson.toJSON();

    // Map resources to format expected by LessonReader.jsx
    json.resources = rawResources.map((r) => {
      const primaryLink = r.links?.[0];
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        resource_type: r.resource_type,
        source: r.provider,
        url: primaryLink ? primaryLink.url : "",
        relevance_score: r.relevance_score,
        tags: r.tags,
        links: r.links || [],
      };
    });

    // Provide module/chapter context adapter for LessonReader header
    json.module = {
      id: lesson.section?.id,
      title: lesson.section?.title,
      description: lesson.section?.description,
      chapter: {
        id: lesson.section?.id,
        title: lesson.section?.title,
      },
    };

    res.json(json);
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

    // Foreign keys with CASCADE will automatically remove children
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
 * Publish a reviewed course draft with tutor author attribution.
 */
async function publishContent(req, res, next) {
  try {
    const content = await WizardContent.findOne({
      where: { id: req.params.content_id, user_id: req.user.id },
      include: [{ model: Course, as: "course" }],
    });
    if (!content) return res.status(404).json({ detail: "Content not found" });

    if (isCourseType(content.content_type) && content.course) {
      // Find all sections for this course
      const sections = await CourseSection.findAll({
        where: { course_id: content.course.id },
        attributes: ["id"],
      });
      const sectionIds = sections.map((s) => s.id);

      const lessonCount = await Lesson.count({
        where: { section_id: { [Op.in]: sectionIds } },
      });

      if (lessonCount === 0) {
        return res.status(400).json({ detail: "Cannot publish a course with no lessons" });
      }

      // Mark all lessons as published
      if (sectionIds.length > 0) {
        await Lesson.update(
          { status: "published" },
          { where: { section_id: { [Op.in]: sectionIds } } }
        );
      }
    }

    const authorName = (req.body && req.body.author_name && req.body.author_name.trim())
      ? req.body.author_name.trim()
      : (req.user.full_name || req.user.email);

    await content.update({
      status: "published",
      published_at: new Date(),
      author_name: authorName,
      author_role: req.user.role || "tutor",
    });

    // Record published version snapshot
    await ContentVersion.create({
      wizard_content_id: content.id,
      version_number: 2,
      title: content.title || content.topic,
      change_summary: `Published by ${authorName}`,
      snapshot_data: { published_at: new Date().toISOString(), status: "published" },
      created_by_user_id: req.user.id,
      is_current: true,
    });

    // Clean up temporary execution checkpoints
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
        await GenerationJob.destroy({ where: { id: jobIds } });
      }
      logger.info(`[WIZARD] Cleaned up generation checkpoints and jobs for published content_id=${content.id}`);
    } catch (cleanupErr) {
      logger.warn(`[WIZARD] Non-critical checkpoint cleanup warning: ${cleanupErr.message}`);
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
    const { title, summary, overview, estimated_time, learning_objectives, sections, exercises } = req.body;

    // Verify ownership
    const content = await WizardContent.findOne({
      where: { id: content_id, user_id: req.user.id },
      transaction: t,
    });
    if (!content) {
      await t.rollback();
      return res.status(404).json({ detail: "Content not found or unauthorized" });
    }

    const lesson = await Lesson.findByPk(lesson_id, { transaction: t });
    if (!lesson) {
      await t.rollback();
      return res.status(404).json({ detail: "Lesson not found" });
    }

    // Update lesson core attributes
    const updateFields = { status: "reviewed" };
    if (title !== undefined) updateFields.title = title;
    if (overview !== undefined || summary !== undefined) updateFields.overview = overview || summary;
    if (estimated_time !== undefined) updateFields.estimated_time = estimated_time;
    if (learning_objectives !== undefined) updateFields.learning_objectives = learning_objectives;

    await lesson.update(updateFields, { transaction: t });

    // Update or insert sections
    if (Array.isArray(sections)) {
      for (const sec of sections) {
        if (sec.id) {
          await LessonSection.update(
            {
              title: sec.title,
              body: sec.content_markdown || sec.body,
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
              body: sec.content_markdown || sec.body,
              section_type: sec.section_type || "explanation",
              language: sec.language || null,
              sequence: sec.sequence || 1,
            },
            { transaction: t }
          );
        }
      }
    }

    // Update or insert exercises
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

    // Return updated lesson
    const updated = await Lesson.findOne({
      where: { id: lesson_id },
      include: [
        { model: LessonSection, as: "sections", order: [["sequence", "ASC"]] },
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
 * Retrieve published content for the marketplace with cursor pagination.
 */
async function getPublishedCourses(req, res, next) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
    const contentType = req.query.contentType || req.query.content_type || "";
    const search = req.query.search || "";
    const cursor = req.query.cursor || "";

    const where = { status: "published" };

    if (contentType && contentType !== "all") {
      where.content_type = contentType;
    }

    if (search && search.trim()) {
      where.topic = { [Op.like]: `%${search.trim()}%` };
    }

    if (cursor) {
      const cursorData = decodeCursor(cursor);
      const cursorWhere = buildCursorWhere(cursorData, "created_at", "DESC");
      if (cursorWhere) {
        where[Op.and] = where[Op.and] ? [...where[Op.and], cursorWhere] : [cursorWhere];
      }
    }

    const rows = await WizardContent.findAll({
      where,
      attributes: ["id", "user_id", "topic", "title", "description", "content_type", "status", "created_at", "updated_at"],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email", "role"],
        },
      ],
      order: [
        ["created_at", "DESC"],
        ["id", "DESC"],
      ],
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    if (hasMore) {
      rows.pop();
    }

    const nextCursor = hasMore && rows.length > 0 ? encodeCursor(rows[rows.length - 1], "created_at") : null;

    res.json({
      data: rows,
      pagination: {
        next_cursor: nextCursor,
        has_more: hasMore,
        limit,
      },
    });
  } catch (err) {
    logger.error(`[WIZARD] Error fetching published courses: ${err.message}`);
    next(err);
  }
}

/**
 * GET /wizard/published/:id
 * Retrieve a single published course detail by ID.
 */
async function getPublishedCourseById(req, res, next) {
  try {
    const { id } = req.params;
    const content = await WizardContent.findOne({
      where: { id, status: "published" },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email", "role"],
        },
        {
          model: Course,
          as: "course",
          include: [
            {
              model: CourseSection,
              as: "sections",
              include: [
                {
                  model: Lesson,
                  as: "lessons",
                  attributes: ["id", "title", "sequence", "estimated_time"],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!content) {
      return res.status(404).json({ error: "Published course not found" });
    }

    const json = content.toJSON();
    if (json.course && Array.isArray(json.course.sections)) {
      json.chapters = json.course.sections.map((sec) => ({
        id: sec.id,
        title: sec.title,
        description: sec.description,
        sequence: sec.sequence,
        estimated_duration: sec.estimated_duration,
        modules: [
          {
            id: sec.id,
            title: sec.title,
            description: sec.description,
            sequence: 1,
            lessons: sec.lessons || [],
          },
        ],
      }));
    }

    res.json(json);
  } catch (err) {
    logger.error(`[WIZARD] Error fetching published course ${req.params.id}: ${err.message}`);
    next(err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal Webhooks (py_server → js_server)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /internal/wizard-webhook/status
 * Granular status update during generation.
 */
async function webhookAgenticStatus(req, res, next) {
  try {
    const { content_id, status, label, job_id, state_cache } = req.body;
    const content = await WizardContent.findByPk(content_id);
    if (content) {
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
      // Map stage progress percentages
      const STAGE_PROGRESS = {
        queued: 5,
        generating_blueprint: 15,
        blueprint_ready: 25,
        generating_evidence: 40,
        generating_lessons: 65,
        reviewing_content: 85,
        quality_check: 95,
        completed: 100,
      };

      const progress = STAGE_PROGRESS[status] || 50;
      await GenerationJob.update(
        {
          current_stage: status,
          status: "running",
          stage_progress_percent: progress,
          user_message: label || null,
        },
        { where: { thread_id: job_id } }
      );
    }
    res.status(200).json({ success: true });
  } catch (err) {
    logger.error(`[WIZARD WEBHOOK] Status update error: ${err.message}`);
    res.status(500).json({ error: "Failed to update status" });
  }
}

/**
 * GET /internal/wizard-webhook/incomplete
 * Retrieves jobs that were abandoned mid-generation.
 */
async function getIncompleteGenerations(req, res, next) {
  try {
    const jobs = await GenerationJob.findAll({
      where: { status: { [Op.in]: ["queued", "running"] } },
      include: [{ model: WizardContent, as: "wizard_content" }],
    });

    const result = jobs.map((j) => {
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
        state_cache: wc.content?.langgraph_state || null,
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
 * Final payload from py_server after the multi-agent pipeline completes.
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

    if (error || reqStatus === "failed" || reqStatus === "degraded") {
      const contentStatus = reqStatus === "degraded" ? "generating" : "error";
      await content.update({ status: contentStatus, content: { error } }, { transaction: t });

      if (job_id) {
        const updatePayload = {
          status: reqStatus || "failed",
          error_details: error || null,
          user_message: userMessage || "Something unexpected happened. Our system will try again automatically.",
        };
        if (retryInfo && retryInfo.retry_count !== undefined) {
          updatePayload.retry_count = retryInfo.retry_count;
        }
        await GenerationJob.update(updatePayload, { where: { thread_id: job_id }, transaction: t });
      }
      await t.commit();
      return res.status(200).json({ success: true });
    }

    // ── Course Format Handling ───────────────────────────────────────────────
    const isCourse = isCourseType(content.content_type) || data?.content_type === "course";
    if (isCourse) {
      if (!data || data.error || !Array.isArray(data.chapters) || data.chapters.length === 0) {
        const errorMsg = data?.error || "Course package is incomplete or missing chapters";
        await content.update({ status: "error", content: { error: errorMsg } }, { transaction: t });
        if (job_id) {
          await GenerationJob.update(
            { status: "failed", error_details: errorMsg, user_message: "Course generation could not be completed." },
            { where: { thread_id: job_id }, transaction: t }
          );
        }
        await t.commit();
        logger.error(`[WEBHOOK] Course id=${content_id} failed validation: ${errorMsg}`);
        return res.status(400).json({ error: errorMsg });
      }

      await _persistCourseData(content, data, t);

      await content.update(
        {
          status: "pending_approval",
          title: data.title || content.topic,
          description: data.description || "",
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

      // Save complete snapshot in ContentVersion
      await ContentVersion.create(
        {
          wizard_content_id: content.id,
          version_number: 1,
          title: data.title || content.topic,
          change_summary: "AI Course Generation completed",
          snapshot_data: data,
          is_current: true,
        },
        { transaction: t }
      );

      if (job_id) {
        await GenerationJob.update(
          {
            status: "completed",
            stage_progress_percent: 100,
            completed_at: new Date(),
          },
          { where: { thread_id: job_id }, transaction: t }
        );
      }
      await t.commit();
      logger.info(`[WEBHOOK] Course id=${content_id} persisted successfully in normalized tables`);
      return res.status(200).json({ success: true });
    }

    // ── Non-Course Format Handling (Roadmap / Guide) ───────────────────────────
    if ((content.content_type || "").toLowerCase() === "roadmap") {
      const rawModules = data.phasewise_modules || data.modules || [];
      const [dbRoadmap] = await Roadmap.findOrCreate({
        where: { content_id: content.id },
        defaults: {
          title: data.title || content.topic,
          description: data.description || "",
          total_modules: rawModules.length,
          modules_data: rawModules,
          prerequisites: data.prerequisites || [],
          outcomes: data.outcomes || [],
        },
        transaction: t,
      });

      await dbRoadmap.update(
        {
          title: data.title || content.topic,
          description: data.description || "",
          total_modules: rawModules.length,
          modules_data: rawModules,
          prerequisites: data.prerequisites || [],
          outcomes: data.outcomes || [],
        },
        { transaction: t }
      );
    } else {
      // Guide
      const [dbGuide] = await Guide.findOrCreate({
        where: { content_id: content.id },
        defaults: {
          title: data.title || content.topic,
          description: data.description || "",
          summary: data.summary || "",
          modules_data: data.modules || [],
        },
        transaction: t,
      });

      await dbGuide.update(
        {
          title: data.title || content.topic,
          description: data.description || "",
          summary: data.summary || "",
          modules_data: data.modules || [],
        },
        { transaction: t }
      );
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
 * Writes the CoursePackageSchema into the normalized tables:
 * Course → CourseSection → Lesson → LessonSection / LessonExercise / Resource
 */
async function _persistCourseData(content, data, t) {
  // 1. Find or create Course record
  let course = await Course.findOne({ where: { content_id: content.id }, transaction: t });
  if (!course) {
    course = await Course.create(
      {
        content_id: content.id,
        title: data.title || content.topic,
        description: data.description || "",
        domain: data.domain || "general",
        domain_label: data.domain_label || "General",
        exercise_paradigm: data.exercise_paradigm || "mixed",
        target_audience: data.target_audience || "General Learners",
        course_outcomes: data.course_outcomes || [],
        prerequisites: data.prerequisites || [],
      },
      { transaction: t }
    );
  } else {
    await course.update(
      {
        title: data.title || content.topic,
        description: data.description || "",
        domain: data.domain || "general",
        domain_label: data.domain_label || "General",
        exercise_paradigm: data.exercise_paradigm || "mixed",
        target_audience: data.target_audience || "General Learners",
        course_outcomes: data.course_outcomes || [],
        prerequisites: data.prerequisites || [],
      },
      { transaction: t }
    );
  }

  // Clear previously generated course sections (cascades to lessons, sections, exercises)
  await CourseSection.destroy({ where: { course_id: course.id }, transaction: t });

  const sectionsToCreate = [];
  const exercisesToCreate = [];
  const resourcesToCreate = [];
  const resourceLinksToCreate = [];

  let totalSections = 0;
  let totalLessons = 0;
  let totalExercises = 0;

  let secSeq = 1;
  for (const chapter of data.chapters || []) {
    const modules = chapter.modules || [];

    // If chapter has multiple modules, create a section per module; otherwise per chapter
    for (const module of modules) {
      totalSections++;
      const sectionTitle = modules.length > 1
        ? `${chapter.title}: ${module.title}`
        : (module.title || chapter.title);

      const dbSection = await CourseSection.create(
        {
          course_id: course.id,
          title: sectionTitle,
          description: module.description || chapter.description || "",
          learning_objectives: module.learning_objectives || [],
          key_takeaways: module.key_takeaways || [],
          difficulty: module.difficulty || "beginner",
          estimated_duration: module.estimated_time || chapter.estimated_duration || "",
          sequence: secSeq++,
        },
        { transaction: t }
      );

      let lessonSeq = 1;
      for (const lesson of module.lessons || []) {
        totalLessons++;
        const dbLesson = await Lesson.create(
          {
            section_id: dbSection.id,
            title: lesson.title || "Lesson",
            overview: lesson.overview || "",
            estimated_time: lesson.estimated_time || "",
            sequence: lessonSeq++,
            status: "reviewed",
          },
          { transaction: t }
        );

        // Collect lesson content sections
        let blockSeq = 1;
        for (const section of lesson.sections || []) {
          sectionsToCreate.push({
            lesson_id: dbLesson.id,
            section_type: section.section_type || "explanation",
            title: section.title || null,
            body: section.body || "",
            language: section.language || null,
            sequence: section.sequence || blockSeq++,
          });
        }

        // Collect exercises
        let exSeq = 1;
        for (const exercise of lesson.exercises || []) {
          totalExercises++;
          exercisesToCreate.push({
            lesson_id: dbLesson.id,
            title: exercise.title || "Exercise",
            description: exercise.description || "",
            exercise_type: exercise.exercise_type || "reflection",
            difficulty: exercise.difficulty || "medium",
            starter_code: exercise.starter_code || null,
            language: exercise.language || "python",
            solution_hint: exercise.solution_hint || null,
            expected_output: exercise.expected_output || null,
            sequence: exercise.sequence || exSeq++,
          });
        }

        // Collect resources
        for (const resource of lesson.resources || []) {
          if (!resource.url) continue;
          const dbResource = await Resource.create(
            {
              entity_type: "lesson",
              entity_id: dbLesson.id,
              title: resource.title || "Resource",
              description: resource.description || null,
              resource_type: resource.resource_type || "other",
              provider: resource.source || "",
              relevance_score: resource.relevance_score || 0.0,
              tags: resource.supports || [],
            },
            { transaction: t }
          );

          resourceLinksToCreate.push({
            resource_id: dbResource.id,
            url: resource.url,
            link_type: "primary",
            domain: resource.source || null,
          });
        }
      }
    }
  }

  // Batch insert sections, exercises, and resource links for high performance
  if (sectionsToCreate.length > 0) {
    await LessonSection.bulkCreate(sectionsToCreate, { transaction: t });
  }
  if (exercisesToCreate.length > 0) {
    await LessonExercise.bulkCreate(exercisesToCreate, { transaction: t });
  }
  if (resourceLinksToCreate.length > 0) {
    await ResourceLink.bulkCreate(resourceLinksToCreate, { transaction: t });
  }

  // Update course counters
  await course.update(
    {
      total_sections: totalSections,
      total_lessons: totalLessons,
      total_exercises: totalExercises,
    },
    { transaction: t }
  );

  logger.info(
    `[WEBHOOK] Course persisted: content_id=${content.id}, sections=${totalSections}, lessons=${totalLessons}, exercises=${totalExercises}`
  );
}

/**
 * POST /internal/wizard-webhook/lesson-incremental
 * Incremental lesson save from py_server.
 */
async function webhookAgenticLessonIncremental(req, res, next) {
  const { content_id, job_id, lesson_data, chapter_title, module_title, sequence_info, state_cache } = req.body;
  const targetSectionTitle = module_title
    ? `${chapter_title || "Chapter 1"}: ${module_title}`
    : (chapter_title || "Chapter 1");

  if (!content_id || !lesson_data || !lesson_data.title) {
    return res.status(400).json({ error: "Missing required incremental payload" });
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

      // 1. Ensure Course exists
      const [course] = await Course.findOrCreate({
        where: { content_id },
        defaults: { title: content.topic },
        transaction: t,
      });

      // 2. Ensure CourseSection exists
      const [dbSection] = await CourseSection.findOrCreate({
        where: { course_id: course.id, title: targetSectionTitle },
        defaults: {
          course_id: course.id,
          title: targetSectionTitle,
          description: "",
          sequence: sequence_info?.chapter_seq || 1,
        },
        transaction: t,
      });

      // 3. Ensure Lesson exists
      const [dbLesson] = await Lesson.findOrCreate({
        where: { section_id: dbSection.id, title: lesson_data.title },
        defaults: {
          section_id: dbSection.id,
          title: lesson_data.title,
          overview: lesson_data.overview || "",
          estimated_time: lesson_data.estimated_time || "",
          sequence: sequence_info?.lesson_seq || 1,
          status: "draft",
        },
        transaction: t,
      });

      await dbLesson.update({
        overview: lesson_data.overview || "",
        estimated_time: lesson_data.estimated_time || "",
        status: "draft",
      }, { transaction: t });

      // Clear old content blocks & exercises on regeneration
      await LessonSection.destroy({ where: { lesson_id: dbLesson.id }, transaction: t });
      await LessonExercise.destroy({ where: { lesson_id: dbLesson.id }, transaction: t });
      await Resource.destroy({ where: { entity_type: "lesson", entity_id: dbLesson.id }, transaction: t });

      // Write lesson sections
      let blockSeq = 1;
      const sectionsToCreate = (lesson_data.sections || []).map((s) => ({
        lesson_id: dbLesson.id,
        section_type: s.section_type || "explanation",
        title: s.title || null,
        body: s.body || "",
        language: s.language || null,
        sequence: s.sequence || blockSeq++,
      }));
      if (sectionsToCreate.length > 0) {
        await LessonSection.bulkCreate(sectionsToCreate, { transaction: t });
      }

      // Write lesson exercises
      let exSeq = 1;
      const exercisesToCreate = (lesson_data.exercises || []).map((e) => ({
        lesson_id: dbLesson.id,
        title: e.title || "Exercise",
        description: e.description || "",
        exercise_type: e.exercise_type || "reflection",
        difficulty: e.difficulty || "medium",
        starter_code: e.starter_code || null,
        language: e.language || "python",
        solution_hint: e.solution_hint || null,
        expected_output: e.expected_output || null,
        sequence: e.sequence || exSeq++,
      }));
      if (exercisesToCreate.length > 0) {
        await LessonExercise.bulkCreate(exercisesToCreate, { transaction: t });
      }

      // Write lesson resources
      for (const resItem of lesson_data.resources || []) {
        if (!resItem.url) continue;
        const dbRes = await Resource.create(
          {
            entity_type: "lesson",
            entity_id: dbLesson.id,
            title: resItem.title || "Resource",
            description: resItem.description || null,
            resource_type: resItem.resource_type || "other",
            provider: resItem.source || "",
            relevance_score: resItem.relevance_score || 0.0,
            tags: resItem.supports || [],
          },
          { transaction: t }
        );

        await ResourceLink.create(
          {
            resource_id: dbRes.id,
            url: resItem.url,
            link_type: "primary",
            domain: resItem.source || null,
          },
          { transaction: t }
        );
      }

      await t.commit();
      logger.info(`[WEBHOOK] Incremental lesson saved: ${lesson_data.title}`);
      return res.status(200).json({ success: true });

    } catch (err) {
      await t.rollback();
      const isDeadlock = err.original?.errno === 1213 || (err.message && err.message.includes("Deadlock"));
      if (isDeadlock && attempt < MAX_RETRIES) {
        logger.warn(`[WIZARD WEBHOOK] Deadlock detected during incremental save (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${attempt * 100}ms...`);
        await new Promise((r) => setTimeout(r, attempt * 100));
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
      where: { id: content_id, user_id: req.user.id },
    });
    if (!content) return res.status(404).json({ error: "Content not found" });

    const job = await GenerationJob.findOne({
      where: { wizard_content_id: content_id },
      order: [["created_at", "DESC"]],
    });

    if (!job) return res.status(404).json({ error: "Job not found" });

    res.json({
      job_id: job.thread_id,
      status: job.status,
      content_type: content.content_type,
      current_stage: job.current_stage,
      progress: job.stage_progress_percent,
      retry_count: job.retry_count,
      error: job.error_details,
      user_message: job.user_message,
      label: content.content?._status_label || job.user_message,
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

    await job.update({ status: "pending", retry_count: job.retry_count + 1 });
    pyAxios.post(`/wizard/generation/${job.thread_id}/retry`).catch((e) => logger.error(`Retry ping failed: ${e.message}`));

    res.json({ success: true, status: "pending" });
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

    await job.update({ status: "cancelled" });
    pyAxios.post(`/wizard/generation/${job.thread_id}/cancel`).catch((e) => logger.error(`Cancel ping failed: ${e.message}`));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
}

/**
 * POST /internal/wizard-webhook/checkpoint
 * Updates checkpoint state in GenerationJob
 */
async function webhookAgenticCheckpoint(req, res, next) {
  try {
    const { job_id, stage, node, status } = req.body;
    const job = await GenerationJob.findOne({ where: { thread_id: job_id } });
    if (!job) return res.status(404).json({ error: "Job not found" });

    const currentCheckpoints = job.checkpoint_data || {};
    currentCheckpoints[stage] = { node, status, updated_at: new Date().toISOString() };

    await job.update({ checkpoint_data: currentCheckpoints, current_stage: stage });
    res.json({ success: true });
  } catch (err) {
    logger.error(`[WIZARD WEBHOOK] Checkpoint error: ${err.message}`);
    res.status(500).json({ error: "Internal error" });
  }
}

/**
 * Get count of resumable failed/pending generation tasks for a user.
 */
async function getFailedGenerationsCount(userId) {
  try {
    const contents = await WizardContent.findAll({
      where: { user_id: userId },
      attributes: ["id"],
    });
    const contentIds = contents.map((c) => c.id);
    if (contentIds.length === 0) return 0;

    const limitDate = new Date();
    limitDate.setHours(limitDate.getHours() - 48);

    const count = await GenerationJob.count({
      where: {
        wizard_content_id: { [Op.in]: contentIds },
        status: { [Op.in]: ["queued", "failed", "degraded", "pending", "resuming"] },
        retry_count: { [Op.lt]: 3 },
        created_at: { [Op.gte]: limitDate },
      },
    });
    return count;
  } catch (err) {
    logger.error(`[RESUME] Error getting failed generation count: ${err.message}`);
    return 0;
  }
}

/**
 * Resume waiting, queued, or failed generation tasks.
 */
async function resumePendingGenerations(userId = null) {
  const result = { resumed: 0, skipped: 0, reasons: [] };
  try {
    const whereClause = {
      status: {
        [Op.in]: ["queued", "failed", "degraded", "pending", "resuming"],
      },
    };

    if (userId) {
      const contents = await WizardContent.findAll({
        where: { user_id: userId },
        attributes: ["id"],
      });
      const contentIds = contents.map((c) => c.id);
      if (contentIds.length === 0) return result;
      whereClause.wizard_content_id = { [Op.in]: contentIds };
    }

    const jobs = await GenerationJob.findAll({ where: whereClause });
    const limitDate = new Date();
    limitDate.setHours(limitDate.getHours() - 48);

    for (const job of jobs) {
      if (new Date(job.created_at) < limitDate) {
        logger.info(`[RESUME] Skipping and cleaning stale job ${job.thread_id}`);
        job.status = "cancelled";
        job.user_message = "Generation expired and was cancelled automatically.";
        await job.save();

        await WizardContent.update(
          { status: "error" },
          { where: { id: job.wizard_content_id } }
        );

        await LanggraphCheckpoint.destroy({ where: { thread_id: job.thread_id } });
        await LanggraphWrite.destroy({ where: { thread_id: job.thread_id } });

        result.skipped++;
        result.reasons.push(`Job ${job.thread_id} too old (>48h)`);
        continue;
      }

      if (job.retry_count >= 3) {
        logger.info(`[RESUME] Skipping job ${job.thread_id} - max retries reached`);
        result.skipped++;
        result.reasons.push(`Job ${job.thread_id} max retries (3) reached`);
        continue;
      }

      logger.info(`[RESUME] Triggering retry for GenerationJob ${job.thread_id}`);
      job.status = "resuming";
      await job.save();

      await WizardContent.update(
        { status: "generating" },
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
  getPublishedCourseById,
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
