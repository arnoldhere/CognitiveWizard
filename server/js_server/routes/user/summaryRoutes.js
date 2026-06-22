/**
 * routes/user/summaryRoutes.js
 * =============================
 * Express router for all /summarize/* endpoints.
 *
 * Routes:
 *  - POST /summarize/content — JSON body (URL / YouTube) — no auth required
 *  - POST /summarize/upload  — multipart PDF/DOCX — no auth required
 *    (matches py_server: summarization_api has no auth dependency)
 *
 * Route delegation:
 *  ┌───────────────────────────┬────────────────────────────────────────────┐
 *  │ Express Route             │ Delegated to (py_server FastAPI)           │
 *  ├───────────────────────────┼────────────────────────────────────────────┤
 *  │ POST /summarize/content   │ POST /summarize/content                    │
 *  │ POST /summarize/upload    │ POST /summarize/upload  (multipart)        │
 *  └───────────────────────────┴────────────────────────────────────────────┘
 *
 * Middlewares:
 *  - aiLimiter — rate-limit (LLM-heavy endpoints, no auth needed for public use)
 */

const { Router } = require("express");
const { aiLimiter } = require("../../middlewares/rateLimiter");
const {
  upload,
  summarizeContent,
  summarizeUpload,
} = require("../../controllers/summaryController");

const router = Router();

/** Summarize content from URL / YouTube / PDF path (JSON body) */
router.post("/content", aiLimiter, summarizeContent);

/** Upload a PDF/DOCX file and summarize its contents */
router.post("/upload", aiLimiter, upload.single("file"), summarizeUpload);

module.exports = router;
