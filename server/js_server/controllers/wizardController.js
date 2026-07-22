const { pyAxios } = require("../utils/apiProxy");
const logger = require("../utils/logger");
const { WizardContent } = require("../models");

/**
 * POST /wizard/generate
 * Generate new AI-powered learning content.
 * Body: { topic, content_type, details }
 */
async function generateContent(req, res, next) {
  try {
    const { topic, content_type, details } = req.body || {};
    logger.info(`[WIZARD] Generate: topic="${topic}", type="${content_type}" by ${req.user?.email}`);

    // Call py_server to generate the content (stateless)
    const aiResponse = await pyAxios.post("/wizard/generate-raw", {
      topic,
      content_type,
      details
    });

    if (!aiResponse.data || !aiResponse.data.content) {
      return res.status(500).json({ detail: "Failed to generate structured wizard content" });
    }

    // Save to local MySQL
    const wizardContent = await WizardContent.create({
      user_id: req.user.id,
      topic,
      content_type,
      status: "generated",
      content: aiResponse.data.content,
    });

    res.json(wizardContent);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
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
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 20;

    const records = await WizardContent.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      offset: skip,
      limit: limit,
    });

    res.json(records);
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
    const content = await WizardContent.findOne({
      where: {
        id: req.params.content_id,
        user_id: req.user.id,
      }
    });

    if (!content) {
      return res.status(404).json({ detail: "Content not found" });
    }
    res.json(content);
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
    logger.info(`[WIZARD] Delete content_id=${req.params.content_id} by ${req.user?.email}`);
    const content = await WizardContent.findOne({
      where: {
        id: req.params.content_id,
        user_id: req.user.id,
      }
    });

    if (!content) {
      return res.status(404).json({ detail: "Content not found" });
    }

    await content.destroy();
    res.json({ detail: "Content deleted successfully" });
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
