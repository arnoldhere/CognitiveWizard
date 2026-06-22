/**
 * routes/user/ragRoutes.js
 * =========================
 * Express router for all /rag/* endpoints.
 *
 * ALL routes require authentication (JWT Bearer token).
 *
 * Route delegation:
 *  ┌────────────────────────────────────────┬──────────────────────────────────┐
 *  │ Express Route                          │ Delegated to (py_server)         │
 *  ├────────────────────────────────────────┼──────────────────────────────────┤
 *  │ POST   /rag/upload                     │ POST   /rag/upload               │
 *  │ POST   /rag/ingest                     │ POST   /rag/ingest               │
 *  │ GET    /rag/source/:filename           │ GET    /rag/source/:filename     │
 *  │ DELETE /rag/documents/:document_name   │ DELETE /rag/documents/:doc_name  │
 *  │ GET    /rag/status                     │ GET    /rag/status               │
 *  │ GET    /rag/status-langchain           │ GET    /rag/status-langchain     │
 *  │ POST   /rag/chat                       │ POST   /rag/chat                 │
 *  │ POST   /rag/chat-langchain             │ POST   /rag/chat-langchain       │
 *  │ POST   /rag/sessions                   │ POST   /rag/sessions             │
 *  │ GET    /rag/sessions                   │ GET    /rag/sessions             │
 *  │ GET    /rag/sessions/:id               │ GET    /rag/sessions/:id         │
 *  │ GET    /rag/sessions/:id/history       │ GET    /rag/sessions/:id/history │
 *  │ PUT    /rag/sessions/:id               │ PUT    /rag/sessions/:id         │
 *  │ DELETE /rag/sessions/:id               │ DELETE /rag/sessions/:id         │
 *  └────────────────────────────────────────┴──────────────────────────────────┘
 *
 * Middlewares:
 *  - authenticate — JWT verification on all routes
 *  - aiLimiter    — per-IP rate limit for AI-heavy operations
 */

const { Router } = require("express");
const { authenticate } = require("../../middlewares/authMiddleware");
const { aiLimiter } = require("../../middlewares/rateLimiter");
const {
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
} = require("../../controllers/ragController");

const router = Router();

// All RAG routes require authentication
router.use(authenticate);

// ─── Document Management ──────────────────────────────────────────────────

/** Upload a PDF/DOCX document and ingest into RAG knowledge base */
router.post("/upload", upload.single("file"), uploadDocument);

/** JSON-body ingestion (legacy v0 compatibility) */
router.post("/ingest", ingestDocuments);

/** Retrieve a source document file (binary stream) */
router.get("/source/:filename", getSource);

/** Delete a specific document from the knowledge base */
router.delete("/documents/:document_name", deleteDocument);

// ─── Status Endpoints ─────────────────────────────────────────────────────

/** Get current user's RAG knowledge base status */
router.get("/status", getRagStatus);

/** Get LangChain RAG status */
router.get("/status-langchain", getRagStatusLangchain);

// ─── Chat Endpoints ───────────────────────────────────────────────────────

/**
 * General RAG chat (supports v0 + v1 via use_langchain flag).
 * Rate-limited — AI inference is compute-heavy.
 */
router.post("/chat", aiLimiter, chat);

/**
 * Dedicated LangChain RAG chat endpoint.
 * Rate-limited — AI inference is compute-heavy.
 */
router.post("/chat-langchain", aiLimiter, chatLangchain);

// ─── Chat Session Management ──────────────────────────────────────────────

/** Create a new chat session */
router.post("/sessions", createSession);

/** List all chat sessions for current user */
router.get("/sessions", listSessions);

/** Get a specific chat session by ID */
router.get("/sessions/:session_id", getSession);

/** Get message history for a session */
router.get("/sessions/:session_id/history", getSessionHistory);

/** Rename a chat session */
router.put("/sessions/:session_id", renameSession);

/** Delete a chat session and all its messages */
router.delete("/sessions/:session_id", deleteSession);

module.exports = router;
