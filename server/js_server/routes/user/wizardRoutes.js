/**
 * routes/user/wizardRoutes.js
 * ============================
 * Express router for all /wizard/* endpoints.
 *
 * ALL routes require JWT authentication.
 *
 * Content type routing:
 *  - POST /generate         → Roadmap/Guide/Schedule (single LLM call)
 *  - POST /generate-agentic → Course/Syllabus (multi-agent background pipeline)
 *
 * Course lesson access:
 *  - GET /:content_id/lesson/:lesson_id → Full lesson with sections/resources/exercises
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ Route                              │ Handler                                 │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ POST /generate                     │ generateContent (non-course)            │
 * │ POST /generate-agentic             │ generateAgentic (course/syllabus)       │
 * │ POST /export-pdf                   │ exportPdf                               │
 * │ GET  /history                      │ getHistory                              │
 * │ GET  /question-sets                │ getActiveQuestionSets                   │
 * │ GET  /published                    │ getPublishedCourses                     │
 * │ GET  /:content_id                  │ getContent                              │
 * │ GET  /:content_id/lesson/:lid      │ getCourseLesson                         │
 * │ DELETE /:content_id                │ deleteContent                           │
 * │ POST /:content_id/feedback         │ provideFeedback                         │
 * │ POST /:content_id/publish          │ publishContent                          │
 * └──────────────────────────────────────────────────────────────────────────────┘
 */

const { Router } = require("express");
const { authenticate } = require("../../middlewares/authMiddleware");
const { aiLimiter } = require("../../middlewares/rateLimiter");
const {
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
} = require("../../controllers/wizardController");

const { getActiveQuestionSets } = require("../../controllers/wizardQuestionSetController");

const router = Router();

// All wizard routes require authentication
router.use(authenticate);

// ── Generation ────────────────────────────────────────────────────────────────

/** Generate Roadmap/Guide/Schedule via single LLM call. AI rate-limited. */
router.post("/generate", aiLimiter, generateContent);

/** Generate Course/Syllabus via multi-agent background pipeline. AI rate-limited. */
router.post("/generate-agentic", aiLimiter, generateAgentic);

// ── Utility ───────────────────────────────────────────────────────────────────

/** Export roadmap content as PDF */
router.post("/export-pdf", exportPdf);

// ── Read ──────────────────────────────────────────────────────────────────────

/** Current user's content history (lightweight list) */
router.get("/history", getHistory);

/** Dynamic wizard question sets (admin-managed) */
router.get("/question-sets", getActiveQuestionSets);

/** Marketplace: all published content */
router.get("/published", getPublishedCourses);

/** Full content (course hierarchy or legacy modules) */
router.get("/:content_id", getContent);

/**
 * Full lesson detail — all sections, resources, exercises.
 * Used by the LessonReader when a learner opens a lesson.
 */
router.get("/:content_id/lesson/:lesson_id", getCourseLesson);

// ── Modify ────────────────────────────────────────────────────────────────────

/** Delete content and all cascaded children */
router.delete("/:content_id", deleteContent);

/** Submit feedback to trigger course regeneration */
router.post("/:content_id/feedback", provideFeedback);

/** Approve and publish draft */
router.post("/:content_id/publish", publishContent);

module.exports = router;
