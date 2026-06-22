/**
 * controllers/ragController.js
 * ============================
 * Controller functions for RAG (Retrieval-Augmented Generation) routes.
 *
 * Handles:
 *  - Document upload (PDF/DOCX) — requires multipart/form-data via multer
 *  - RAG chat (plain JSON body)
 *  - Chat session CRUD (create / list / get / rename / delete)
 *  - RAG status queries
 *  - Uploaded document management (list / delete)
 *  - Source file fetch (binary stream)
 *
 * All operations are proxied to py_server which owns the RAG vector DB,
 * LangChain integration, and MongoDB chat history.
 */

const multer = require("multer");
const FormData = require("form-data");
const { proxyToPyServer } = require("../utils/apiProxy");
const logger = require("../utils/logger");

// ─── Multer config: memory storage for document uploads ───────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max document size
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

// ─── Document endpoints ───────────────────────────────────────────────────

/**
 * POST /rag/upload
 * Upload a PDF/DOCX document and ingest it into the user's RAG knowledge base.
 * Requires: authenticated user, multipart/form-data with field { file }
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "BadRequest",
        message: "A PDF or DOCX document file is required.",
      });
    }

    logger.info(
      `[RAG] Document upload: ${req.file.originalname} (${req.file.size} bytes) by ${req.user?.email}`
    );

    // Rebuild FormData to forward to py_server
    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    await proxyToPyServer({
      method: "POST",
      path: "/rag/upload",
      req,
      res,
      formData,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /rag/ingest
 * JSON-body document ingestion (legacy v0 compatibility).
 */
async function ingestDocuments(req, res, next) {
  try {
    await proxyToPyServer({ method: "POST", path: "/rag/ingest", req, res });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /rag/source/:filename
 * Fetch a previously uploaded source document for inline viewing (binary stream).
 */
async function getSource(req, res, next) {
  try {
    await proxyToPyServer({
      method: "GET",
      path: `/rag/source/${req.params.filename}`,
      req,
      res,
      stream: true,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /rag/documents/:document_name
 * Remove a specific uploaded document from the user's knowledge base.
 */
async function deleteDocument(req, res, next) {
  try {
    logger.info(
      `[RAG] Delete document: ${req.params.document_name} by ${req.user?.email}`
    );
    await proxyToPyServer({
      method: "DELETE",
      path: `/rag/documents/${req.params.document_name}`,
      req,
      res,
    });
  } catch (err) {
    next(err);
  }
}

// ─── RAG Status endpoints ─────────────────────────────────────────────────

/** GET /rag/status — get user's RAG knowledge base status */
async function getRagStatus(req, res, next) {
  try {
    await proxyToPyServer({ method: "GET", path: "/rag/status", req, res });
  } catch (err) {
    next(err);
  }
}

/** GET /rag/status-langchain — get LangChain RAG status */
async function getRagStatusLangchain(req, res, next) {
  try {
    await proxyToPyServer({ method: "GET", path: "/rag/status-langchain", req, res });
  } catch (err) {
    next(err);
  }
}

// ─── Chat endpoints ───────────────────────────────────────────────────────

/**
 * POST /rag/chat
 * General RAG chat: supports v0 (default) and v1 (LangChain) via use_langchain flag.
 */
async function chat(req, res, next) {
  try {
    const { query, session_id } = req.body || {};
    logger.info(
      `[RAG/CHAT] Query from ${req.user?.email}: "${String(query || "").substring(0, 60)}..."`,
      { session_id }
    );
    await proxyToPyServer({ method: "POST", path: "/rag/chat", req, res });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /rag/chat-langchain
 * Dedicated LangChain RAG chat endpoint.
 */
async function chatLangchain(req, res, next) {
  try {
    const { query, session_id } = req.body || {};
    logger.info(
      `[RAG/LANGCHAIN] Query from ${req.user?.email}: "${String(query || "").substring(0, 60)}..."`,
      { session_id }
    );
    await proxyToPyServer({ method: "POST", path: "/rag/chat-langchain", req, res });
  } catch (err) {
    next(err);
  }
}

// ─── Chat Session endpoints ───────────────────────────────────────────────

/** POST /rag/sessions — create a new chat session */
async function createSession(req, res, next) {
  try {
    await proxyToPyServer({ method: "POST", path: "/rag/sessions", req, res });
  } catch (err) {
    next(err);
  }
}

/** GET /rag/sessions — list all chat sessions for current user */
async function listSessions(req, res, next) {
  try {
    await proxyToPyServer({ method: "GET", path: "/rag/sessions", req, res });
  } catch (err) {
    next(err);
  }
}

/** GET /rag/sessions/:session_id — get a specific chat session */
async function getSession(req, res, next) {
  try {
    await proxyToPyServer({
      method: "GET",
      path: `/rag/sessions/${req.params.session_id}`,
      req,
      res,
    });
  } catch (err) {
    next(err);
  }
}

/** GET /rag/sessions/:session_id/history — get message history for a session */
async function getSessionHistory(req, res, next) {
  try {
    await proxyToPyServer({
      method: "GET",
      path: `/rag/sessions/${req.params.session_id}/history`,
      req,
      res,
    });
  } catch (err) {
    next(err);
  }
}

/** PUT /rag/sessions/:session_id — rename a chat session */
async function renameSession(req, res, next) {
  try {
    await proxyToPyServer({
      method: "PUT",
      path: `/rag/sessions/${req.params.session_id}`,
      req,
      res,
    });
  } catch (err) {
    next(err);
  }
}

/** DELETE /rag/sessions/:session_id — delete a chat session and all its messages */
async function deleteSession(req, res, next) {
  try {
    logger.info(
      `[RAG/SESSION] Delete session: ${req.params.session_id} by ${req.user?.email}`
    );
    await proxyToPyServer({
      method: "DELETE",
      path: `/rag/sessions/${req.params.session_id}`,
      req,
      res,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  upload,
  uploadDocument,
  ingestDocuments,
  getSource,
  deleteDocument,
  getRagStatus,
  getRagStatusLangchain,
  chat,
  chatLangchain,
  createSession,
  listSessions,
  getSession,
  getSessionHistory,
  renameSession,
  deleteSession,
};
