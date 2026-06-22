/**
 * controllers/quizController.js
 * ==============================
 * Controller functions for Quiz routes.
 *
 * All quiz operations are delegated to py_server (FastAPI) which handles:
 *  - LLM-based quiz generation
 *  - Quiz session creation & persistence (MySQL)
 *  - Answer evaluation and grading
 *  - Paginated result history
 */

const { proxyToPyServer } = require("../utils/apiProxy");
const logger = require("../utils/logger");

/**
 * POST /quiz/generate
 * Generate a new quiz using the AI quiz generator.
 * Body: { topic, difficulty, num_questions, mode }
 */
async function generateQuiz(req, res, next) {
  try {
    const { topic, difficulty, num_questions } = req.body || {};
    logger.info(
      `[QUIZ] Generate: topic="${topic}", difficulty="${difficulty}", count=${num_questions} by ${req.user?.email}`
    );
    await proxyToPyServer({ method: "POST", path: "/quiz/generate", req, res });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /quiz/submit
 * Submit answers for a quiz session and receive evaluated results.
 * Body: { quiz_id, answers: [{question_id, selected_option}], is_auto_submitted }
 */
async function submitQuiz(req, res, next) {
  try {
    const { quiz_id, is_auto_submitted } = req.body || {};
    logger.info(
      `[QUIZ] Submit: quiz_id=${quiz_id}, auto=${is_auto_submitted} by ${req.user?.email}`
    );
    await proxyToPyServer({ method: "POST", path: "/quiz/submit", req, res });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /quiz/results
 * Get paginated quiz result history with optional filtering and sorting.
 * Query params: skip, limit, sort_by, sort_order, status_filter, topic_search
 */
async function getResults(req, res, next) {
  try {
    await proxyToPyServer({ method: "GET", path: "/quiz/results", req, res });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /quiz/results/:quiz_id
 * Get detailed result for a specific quiz session.
 */
async function getResultDetail(req, res, next) {
  try {
    await proxyToPyServer({
      method: "GET",
      path: `/quiz/results/${req.params.quiz_id}`,
      req,
      res,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateQuiz,
  submitQuiz,
  getResults,
  getResultDetail,
};
