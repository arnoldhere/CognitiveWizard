/**
 * routes/user/quizRoutes.js
 * ==========================
 * Express router for all /quiz/* endpoints.
 *
 * ALL routes require authentication (JWT Bearer token).
 *
 * Route delegation:
 *  ┌──────────────────────────┬────────────────────────────────────────────┐
 *  │ Express Route            │ Delegated to (py_server FastAPI)           │
 *  ├──────────────────────────┼────────────────────────────────────────────┤
 *  │ POST  /quiz/generate     │ POST  /quiz/generate  (AI quiz generator)  │
 *  │ POST  /quiz/submit       │ POST  /quiz/submit    (grading engine)     │
 *  │ GET   /quiz/results      │ GET   /quiz/results   (paginated history)  │
 *  │ GET   /quiz/results/:id  │ GET   /quiz/results/:id (detail view)      │
 *  └──────────────────────────┴────────────────────────────────────────────┘
 *
 * Middlewares:
 *  - authenticate — JWT verification on all routes
 *  - aiLimiter    — rate-limit for AI-heavy generate endpoint
 */

const { Router } = require("express");
const { authenticate } = require("../../middlewares/authMiddleware");
const { aiLimiter } = require("../../middlewares/rateLimiter");
const {
  generateQuiz,
  submitQuiz,
  getResults,
  getResultDetail,
} = require("../../controllers/quizController");

const router = Router();

// All quiz routes require authentication
router.use(authenticate);

/** Generate a new AI-powered quiz. Rate-limited — uses LLM inference. */
router.post("/generate", aiLimiter, generateQuiz);

/** Submit answers for evaluation and scoring */
router.post("/submit", submitQuiz);

/** Get paginated quiz result history */
router.get("/results", getResults);

/** Get detailed result for a specific quiz */
router.get("/results/:quiz_id", getResultDetail);

module.exports = router;
