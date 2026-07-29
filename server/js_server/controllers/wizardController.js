const { pyAxios } = require("../utils/apiProxy");
const logger = require("../utils/logger");
const { WizardContent, WizardModule, WizardResource, User } = require("../models");

/**
 * POST /wizard/generate
 * Generate new AI-powered learning content.
 * Body: { topic, content_type, details }
 */
async function generateContent(req, res, next) {
  try {
    const { topic, content_type, details, skill_level, goal, learning_style } = req.body || {};
    logger.info(`[WIZARD] Generate: topic="${topic}", type="${content_type}" by ${req.user?.email}`);

    // Call py_server to generate the content (stateless)
    const user_role = req.user?.role || "user";
    const aiResponse = await pyAxios.post("/wizard/generate-raw", {
      topic,
      content_type,
      details,
      skill_level,
      goal,
      learning_style,
      user_role
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
 * POST /wizard/generate-agentic
 * Start background generation of course/syllabus.
 * Body: { topic, content_type, details, skill_level, goal, learning_style }
 */
async function generateAgentic(req, res, next) {
  try {
    const { topic, content_type, details, skill_level, goal, learning_style } = req.body || {};
    logger.info(`[WIZARD] Generate Agentic: topic="${topic}", type="${content_type}" by ${req.user?.email}`);

    // Create record first in local DB
    const wizardContent = await WizardContent.create({
      user_id: req.user.id,
      topic,
      content_type,
      status: "generating",
      content: {}, // empty initially
    });

    // Call py_server
    const user_role = req.user?.role || "user";
    try {
      await pyAxios.post("/wizard/generate-agentic", {
        content_id: wizardContent.id,
        topic,
        content_type,
        details,
        skill_level,
        goal,
        learning_style,
        user_role
      });
    } catch (err) {
      logger.error(`[WIZARD] py_server generate-agentic failed to start: ${err.message}`);
      await wizardContent.update({ status: 'error' });
    }

    res.json(wizardContent);
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
      },
      include: [
        {
          model: WizardModule,
          as: 'modules',
          include: [
            {
              model: WizardResource,
              as: 'resources'
            }
          ]
        }
      ],
      order: [
        [{ model: WizardModule, as: 'modules' }, 'sequence', 'ASC']
      ]
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

/**
 * POST /wizard/export-pdf
 * Proxy PDF export request to py_server and stream binary PDF file back.
 */
async function exportPdf(req, res, next) {
  try {
    const { topic, content_type, details, content, skill_level, goal, learning_style } = req.body || {};
    logger.info(`[WIZARD] Export PDF: topic="${topic}" by ${req.user?.email}`);

    const pdfResponse = await pyAxios.post(
      "/wizard/export-pdf",
      {
        topic,
        content_type,
        details,
        content,
        skill_level,
        goal,
        learning_style,
      },
      { responseType: "arraybuffer" }
    );

    const filename = `${(topic || "roadmap").replace(/\s+/g, "_")}_roadmap.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfResponse.data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    next(err);
  }
}

/**
 * POST /wizard/:content_id/feedback
 * Submit feedback for the draft to trigger regeneration.
 */
async function provideFeedback(req, res, next) {
  try {
    const { feedback } = req.body;
    const content = await WizardContent.findOne({ where: { id: req.params.content_id, user_id: req.user.id } });
    if (!content) return res.status(404).json({ detail: "Content not found" });

    await content.update({ status: 'generating' });

    try {
      await pyAxios.post("/wizard/regenerate-agentic", {
        content_id: content.id,
        topic: content.topic,
        content: content.content,
        feedback
      });
    } catch (err) {
      logger.error(`[WIZARD] py_server regenerate-agentic failed to start: ${err.message}`);
      await content.update({ status: 'error' });
    }

    res.json(content);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /wizard/:content_id/publish
 * Approve and publish the draft.
 */
async function publishContent(req, res, next) {
  try {
    const content = await WizardContent.findOne({ where: { id: req.params.content_id, user_id: req.user.id } });
    if (!content) return res.status(404).json({ detail: "Content not found" });
    
    if (req.body.modules) {
      for (const modData of req.body.modules) {
        if (modData.id) {
          await WizardModule.update(
            { description: modData.description, title: modData.title },
            { where: { id: modData.id, content_id: content.id } }
          );
        }
      }
    }

    await content.update({ status: 'published' });
    res.json(content);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /internal/wizard-webhook/status
 * Internal webhook for py_server to update granular status.
 */
async function webhookAgenticStatus(req, res, next) {
  try {
    const { content_id, status } = req.body;
    const content = await WizardContent.findByPk(content_id);
    if (content) {
      await content.update({ status });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    logger.error(`[WIZARD WEBHOOK] Error updating status: ${err.message}`);
    res.status(500).json({ error: "Failed to update status" });
  }
}

/**
 * POST /internal/wizard-webhook/complete
 * Internal webhook for py_server to provide final generated data.
 */
async function webhookAgenticComplete(req, res, next) {
  try {
    const { content_id, data, error } = req.body;
    const content = await WizardContent.findByPk(content_id);
    if (!content) return res.status(404).json({ error: "Content not found" });

    if (error) {
       await content.update({ status: 'error' });
       return res.status(200).json({ success: true });
    }

    // Clear old modules and resources (cascade)
    await WizardModule.destroy({ where: { content_id: content.id } });
    
    let seq = 1;
    for (const mod of data.modules || []) {
       const dbMod = await WizardModule.create({
         content_id: content.id,
         title: mod.title || 'Untitled Module',
         description: mod.description || '',
         duration: mod.duration || '',
         sequence: seq++,
         details_json: mod.topics || []
       });
       
       if (mod.references && Array.isArray(mod.references)) {
           for (const ref of mod.references) {
              await WizardResource.create({
                  content_id: content.id,
                  module_id: dbMod.id,
                  title: ref.title || 'Reference',
                  url: ref.url || '',
                  description: ref.description || '',
                  source: ref.source || 'web',
              });
           }
       }
    }

    await content.update({ status: 'pending_approval', content: data });
    res.status(200).json({ success: true });
  } catch (err) {
    logger.error(`[WIZARD WEBHOOK] Error completing generation: ${err.message}`);
    res.status(500).json({ error: "Failed to complete generation" });
  }
}

/**
 * GET /wizard/published
 * Retrieve all published wizard content (Courses, Roadmaps, etc.) for the marketplace
 */
async function getPublishedCourses(req, res, next) {
  try {
    const publishedContent = await WizardContent.findAll({
      where: {
        status: "published",
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email", "role"],
        },
        {
          model: WizardModule,
          as: "modules", // Wait, I need to check the alias for WizardModule
        }
      ],
      order: [["created_at", "DESC"]],
    });
    // Wait, let's just not include modules eagerly if the association is not defined or use proper alias.
    // Actually, we probably don't need modules immediately for the list, we can just return the content field which has everything if it's stored in JSON, but WizardModule is a separate table now.
    res.json(publishedContent);
  } catch (err) {
    logger.error(`[WIZARD] Error fetching published courses: ${err.message}`);
    next(err);
  }
}

module.exports = {
  generateContent,
  getHistory,
  getContent,
  deleteContent,
  exportPdf,
  generateAgentic,
  provideFeedback,
  publishContent,
  getPublishedCourses,
  webhookAgenticStatus,
  webhookAgenticComplete,
};
