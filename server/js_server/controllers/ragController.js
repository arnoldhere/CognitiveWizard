const multer = require("multer");
const FormData = require("form-data");
const { proxyToPyServer, pyAxios } = require("../utils/apiProxy");
const logger = require("../utils/logger");
const chatSessionService = require("../services/chatSessionService");
const chatLimitService = require("../services/chatLimitService");
const { RAGDocument, RAGQueryLog } = require("../models");

// Multer config: memory storage for document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || "").split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(ext)) {
      return cb(new Error("Unsupported file type. Please upload a PDF or DOCX file."), false);
    }
    cb(null, true);
  },
});

/** POST /rag/upload */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "BadRequest", message: "A PDF or DOCX document file is required." });
    }

    logger.info(`[RAG] Document upload: ${req.file.originalname} by ${req.user?.email}`);

    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // Call py_server to process upload (chunking + chromadb)
    const aiResponse = await pyAxios.post("/rag/upload-raw", formData, {
      headers: { ...formData.getHeaders(), "x-user-id": req.user.id },
    });

    const result = aiResponse.data;

    // Save to local RAGDocument model
    if (result.chunks && result.chunks > 0) {
      await RAGDocument.create({
        user_id: req.user.id,
        document_name: req.file.originalname || "uploaded-file",
      });
    }

    res.json(result);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    next(err);
  }
}

/** POST /rag/ingest */
async function ingestDocuments(req, res, next) {
  try {
    await proxyToPyServer({ method: "POST", path: "/rag/ingest", req, res });
  } catch (err) {
    next(err);
  }
}

/** GET /rag/source/:filename */
async function getSource(req, res, next) {
  try {
    await proxyToPyServer({
      method: "GET",
      path: `/rag/source/${req.params.filename}`,
      req, res, stream: true,
    });
  } catch (err) {
    next(err);
  }
}

/** DELETE /rag/documents/:document_name */
async function deleteDocument(req, res, next) {
  try {
    await proxyToPyServer({ method: "DELETE", path: `/rag/documents/${req.params.document_name}`, req, res });
    await RAGDocument.destroy({ where: { user_id: req.user.id, document_name: req.params.document_name } });
  } catch (err) {
    next(err);
  }
}

/** GET /rag/status */
async function getRagStatus(req, res, next) {
  try {
    const aiResponse = await pyAxios.get("/rag/status-raw", { headers: { "x-user-id": req.user.id } });
    const payload = aiResponse.data;
    payload.chat_limit_info = await chatLimitService.getUserStatus(req.user);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

/** GET /rag/status-langchain */
async function getRagStatusLangchain(req, res, next) {
  try {
    const aiResponse = await pyAxios.get("/rag/status-langchain-raw", { headers: { "x-user-id": req.user.id } });
    const payload = aiResponse.data;
    payload.chat_limit_info = await chatLimitService.getUserStatus(req.user);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

async function handleChat(req, res, next, endpoint) {
  try {
    const { query, session_id } = req.body || {};

    // 1. Check Limits in Express
    const limitCheck = await chatLimitService.checkLimit(req.user);
    if (!limitCheck.canSend) {
      const userStatus = await chatLimitService.getUserStatus(req.user);
      return res.status(403).json({
        detail: "Chat limit reached.",
        user_status: userStatus
      });
    }

    // 2. Call py_server
    const aiResponse = await pyAxios.post(endpoint, req.body, { headers: { "x-user-id": req.user.id } });
    const result = aiResponse.data;

    // 3. Increment usage & session count
    await chatLimitService.incrementMessageCount(req.user);
    if (session_id) {
      await chatSessionService.incrementSessionMessageCount(session_id, req.user.id);
    }

    result.user_status = await chatLimitService.getUserStatus(req.user);

    // Save Log
    if (result.log_metadata) {
      await RAGQueryLog.create({
        user_id: req.user.id,
        session_id: session_id || null,
        question: query,
        answer: result.answer,
        contexts: result.contexts || [],
        context_count: result.context_count || 0,
        latency_retrieval_ms: result.log_metadata.latency_retrieval_ms,
        latency_generation_ms: result.log_metadata.latency_generation_ms,
        latency_total_ms: result.log_metadata.latency_total_ms,
        sources: result.sources || []
      });
    }

    res.json(result);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    next(err);
  }
}

async function chat(req, res, next) {
  await handleChat(req, res, next, "/rag/chat-raw");
}

async function chatLangchain(req, res, next) {
  await handleChat(req, res, next, "/rag/chat-langchain-raw");
}

/** POST /rag/sessions */
async function createSession(req, res, next) {
  try {
    const session = await chatSessionService.createChatSession(req.user.id, req.body.title);
    res.json({ status: "success", data: session });
  } catch (err) { next(err); }
}

/** GET /rag/sessions */
async function listSessions(req, res, next) {
  try {
    const sessions = await chatSessionService.listChatSessions(req.user.id);
    res.json({ status: "success", data: sessions });
  } catch (err) { next(err); }
}

/** GET /rag/sessions/:session_id */
async function getSession(req, res, next) {
  try {
    const session = await chatSessionService.getChatSession(req.params.session_id, req.user.id);
    if (!session || !session.active) return res.status(404).json({ detail: "Session not found" });
    res.json({ status: "success", data: session });
  } catch (err) { next(err); }
}

/** GET /rag/sessions/:session_id/history */
async function getSessionHistory(req, res, next) {
  try {
    const { session_id } = req.params;

    // Guard against undefined session_id reaching py_server
    if (!session_id || session_id === "undefined") {
      return res.status(400).json({ detail: "Invalid session ID" });
    }

    // proxyToPyServer does NOT inject x-user-id (only Authorization is forwarded).
    // Use pyAxios directly so the FastAPI backend can authorise the request.
    const aiResponse = await pyAxios.get(
      `/rag/sessions-raw/${session_id}/history`,
      { headers: { "x-user-id": req.user.id } }
    );

    res.json(aiResponse.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    next(err);
  }
}

/** PUT /rag/sessions/:session_id */
async function renameSession(req, res, next) {
  try {
    const session = await chatSessionService.renameChatSession(req.params.session_id, req.user.id, req.body.title);
    if (!session) return res.status(404).json({ detail: "Session not found" });
    res.json({ status: "success", data: session });
  } catch (err) { next(err); }
}

/** DELETE /rag/sessions/:session_id */
async function deleteSession(req, res, next) {
  try {
    const deleted = await chatSessionService.softDeleteChatSession(req.params.session_id, req.user.id);
    if (!deleted) return res.status(404).json({ detail: "Session not found" });

    // Also delete mongo history via python
    await pyAxios.delete(`/rag/sessions-raw/${req.params.session_id}/history`, { headers: { "x-user-id": req.user.id } });

    res.json({ status: "success", detail: "Session and history deleted" });
  } catch (err) { next(err); }
}

module.exports = {
  upload, uploadDocument, ingestDocuments, getSource, deleteDocument,
  getRagStatus, getRagStatusLangchain, chat, chatLangchain,
  createSession, listSessions, getSession, getSessionHistory, renameSession, deleteSession,
};
