/**
 * controllers/wizardController.js
 * ================================
 * Controller functions for the Wizard (AI content generation) routes.
 *
 * The Wizard module generates personalized learning content using LLMs:
 *  - Courses / Syllabi
 *  - Roadmaps
 *  - Schedules
 *
 * All operations are proxied to py_server which handles:
 *  - LLM prompt construction (via prompt_builder utility)
 *  - Content persistence (MySQL — WizardContent model)
 *  - User content history management
 */

const { proxyToPyServer } = require("../utils/apiProxy");
const logger = require("../utils/logger");

/**
 * POST /wizard/generate
 * Generate new AI-powered learning content.
 * Body: { topic, content_type, details }
 */
async function generateContent(req, res, next) {
  try {
    const { topic, content_type } = req.body || {};
    logger.info(
      `[WIZARD] Generate: topic="${topic}", type="${content_type}" by ${req.user?.email}`
    );
    await proxyToPyServer({ method: "POST", path: "/wizard/generate", req, res });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /wizard/history
 * Fetch paginated wizard content history for the current user.
 * Query params: skip, limit
 */
async function getHistory(req, res, next) {
  try {
    await proxyToPyServer({ method: "GET", path: "/wizard/history", req, res });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /wizard/:content_id
 * Retrieve a specific wizard content item by ID.
 */
async function getContent(req, res, next) {
  try {
    await proxyToPyServer({
      method: "GET",
      path: `/wizard/${req.params.content_id}`,
      req,
      res,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /wizard/:content_id
 * Delete a wizard content item owned by the current user.
 */
async function deleteContent(req, res, next) {
  try {
    logger.info(
      `[WIZARD] Delete content_id=${req.params.content_id} by ${req.user?.email}`
    );
    await proxyToPyServer({
      method: "DELETE",
      path: `/wizard/${req.params.content_id}`,
      req,
      res,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateContent,
  getHistory,
  getContent,
  deleteContent,
};
