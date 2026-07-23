/**
 * routes/user/wizardRoutes.js
 * ============================
 * Express router for all /wizard/* endpoints.
 *
 * ALL routes require authentication (JWT Bearer token).
 *
 * Route delegation:
 *  ┌──────────────────────────────┬────────────────────────────────────────────┐
 *  │ Express Route                │ Delegated to (py_server FastAPI)           │
 *  ├──────────────────────────────┼────────────────────────────────────────────┤
 *  │ POST   /wizard/generate      │ POST   /wizard/generate  (LLM generation)  │
 *  │ GET    /wizard/history       │ GET    /wizard/history                     │
 *  │ GET    /wizard/:content_id   │ GET    /wizard/:content_id                 │
 *  │ DELETE /wizard/:content_id   │ DELETE /wizard/:content_id                 │
 *  └──────────────────────────────┴────────────────────────────────────────────┘
 *
 * Middlewares:
 *  - authenticate — JWT verification on all routes
 *  - aiLimiter    — rate-limit for LLM-powered generate endpoint
 */

const { Router } = require("express");
const { authenticate } = require("../../middlewares/authMiddleware");
const { aiLimiter } = require("../../middlewares/rateLimiter");
const {
  generateContent,
  getHistory,
  getContent,
  deleteContent,
  exportPdf,
} = require("../../controllers/wizardController");

const { getActiveQuestionSets } = require("../../controllers/wizardQuestionSetController");

const router = Router();

// All wizard routes require authentication
router.use(authenticate);

/** Generate AI-powered learning content (course/roadmap/schedule). AI rate-limited. */
router.post("/generate", aiLimiter, generateContent);

/** Export roadmap content as PDF */
router.post("/export-pdf", exportPdf);

/** Get current user's wizard content history */
router.get("/history", getHistory);

/** Get active wizard question sets (dynamic, admin-managed) */
router.get("/question-sets", getActiveQuestionSets);

/** Retrieve a specific content item by ID */
router.get("/:content_id", getContent);

/** Delete a specific content item by ID */
router.delete("/:content_id", deleteContent);

module.exports = router;
