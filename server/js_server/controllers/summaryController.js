/**
 * controllers/summaryController.js
 * =================================
 * Controller functions for content summarization routes.
 *
 * Handles:
 *  - URL summarization (web pages)
 *  - YouTube video summarization
 *  - PDF/DOCX document summarization (file upload via multer)
 *
 * All operations are proxied to py_server which handles:
 *  - Text extraction from various input types
 *  - Hierarchical LLM-based summarization
 */

const multer = require("multer");
const FormData = require("form-data");
const { proxyToPyServer } = require("../utils/apiProxy");
const logger = require("../utils/logger");

// ─── Multer: memory storage for summarization file uploads ────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || "").split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(ext)) {
      return cb(
        new Error("Unsupported file type. Please upload a PDF or DOCX file."),
        false
      );
    }
    cb(null, true);
  },
});

/**
 * POST /summarize/content
 * Summarize content from a URL, YouTube video, or PDF path.
 * Body: { input_type, source, mode, model_mode }
 */
async function summarizeContent(req, res, next) {
  try {
    const { input_type, mode } = req.body || {};
    logger.info(`[SUMMARY] Type="${input_type}", mode="${mode}"`);
    await proxyToPyServer({ method: "POST", path: "/summarize/content", req, res });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /summarize/upload
 * Upload a PDF/DOCX file for summarization.
 * Accepts: multipart/form-data with fields { file, mode, model_mode }
 */
async function summarizeUpload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "BadRequest",
        message: "A PDF or DOCX document file is required.",
      });
    }

    const mode = req.body?.mode || "brief";
    const model_mode = req.body?.model_mode || "api";

    logger.info(
      `[SUMMARY] File upload: ${req.file.originalname} (${req.file.size} bytes), mode=${mode}`
    );

    // Rebuild FormData for py_server
    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    formData.append("mode", mode);
    formData.append("model_mode", model_mode);

    await proxyToPyServer({
      method: "POST",
      path: "/summarize/upload",
      req,
      res,
      formData,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  upload,
  summarizeContent,
  summarizeUpload,
};
