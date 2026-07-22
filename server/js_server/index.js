/**
 * index.js — Express Gateway Server (js_server)
 * ================================================
 * Entry point for the Cognitive Wizard distributed backend gateway.
 */


// ─── Load environment variables first ─────────────────────────────────────
require("dotenv").config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require("bcrypt");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
// ─── Internal utilities & middleware ──────────────────────────────────────
const logger = require("./utils/logger");
const morganMiddleware = require("./middlewares/requestLogger");
const { globalLimiter } = require("./middlewares/rateLimiter");
const { notFoundHandler, globalErrorHandler } = require("./middlewares/errorHandler");
// ─── Database & Cache Services ──────────────────────────────────────────────
const { connectMySQL } = require("./config/db");
const { connectMongo } = require("./config/mongo");
const { connectRedis } = require("./config/redis");

async function initializeServices() {
  try {
    await Promise.all([connectMySQL(), connectMongo(), connectRedis()]);
    logger.info("[INIT] All gateway services started successfully.");
  } catch (error) {
    logger.error("[INIT] Failed to start required services.", { error: error.message });
    process.exit(1);
  }
}

initializeServices();

// ─── Route modules ────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth/authRoutes");
const ragRoutes = require("./routes/user/ragRoutes");
const quizRoutes = require("./routes/user/quizRoutes");
const wizardRoutes = require("./routes/user/wizardRoutes");
const summaryRoutes = require("./routes/user/summaryRoutes");
const subscriptionRoutes = require("./routes/user/subscriptionRoutes");
const adminRoutes = require("./routes/admin/adminRoutes");

// ─── Constants ────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.JS_SERVER_PORT || "3000", 10);
const PY_SERVER_URL = process.env.PY_SERVER_URL || "http://localhost:8000";
const NODE_ENV = process.env.NODE_ENV || "development";

// ─── Parse allowed CORS origins from environment ──────────────────────────
const CORS_ORIGINS = (
  process.env.CORS_ALLOW_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// ─── Express app setup ────────────────────────────────────────────────────
const app = express();

// Security headers (helmet with relaxed CSP for API gateway)
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled — frontend handles its own CSP
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration — allow configured origins with credentials
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, mobile apps, Postman)
      if (!origin) return callback(null, true);
      if (CORS_ORIGINS.includes(origin)) return callback(null, true);
      logger.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error(`CORS: Origin ${origin} is not allowed.`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Handle preflight OPTIONS requests
app.options("*", cors());

// HTTP request logging (Morgan → Winston)
app.use(morganMiddleware);

// Body parsers — JSON and URL-encoded (for non-multipart forms)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Must be configured before rate limiters/routes.
// Render forwards client IP through proxy headers.
app.set("trust proxy", 1);
// Global rate limiter — applied to all routes
app.use(globalLimiter);

// ─── Health & Info Endpoints ──────────────────────────────────────────────

/**
 * GET /health
 * Gateway health check. Also pings py_server to report its status.
 */
app.get("/health", async (req, res) => {
  const { pyAxios } = require("./utils/apiProxy");
  let pyServerStatus = "unreachable";
  let pyServerMessage = null;

  try {
    const pyRes = await pyAxios.get("/health", { timeout: 5000 });
    pyServerStatus = "healthy";
    pyServerMessage = pyRes.data?.message || "OK";
  } catch (err) {
    logger.warn(`[HEALTH] py_server unreachable: ${err.message}`);
    pyServerStatus = "unreachable";
    pyServerMessage = err.message;
  }

  res.json({
    status: "healthy",
    service: "cogwiz-js-server (Express Gateway)",
    version: "1.0.0",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    py_server: {
      url: PY_SERVER_URL,
      status: pyServerStatus,
      message: pyServerMessage,
    },
  });
});

/**
 * GET /
 * Root endpoint — brief gateway info.
 */
app.get("/", (req, res) => {
  res.json({
    message: "🧙 Cognitive Wizard — Express Gateway Server",
    version: "1.0.0",
    docs: "See /health for system status.",
    // routes: [
    //   "/auth/*",
    //   "/rag/*",
    //   "/quiz/*",
    //   "/wizard/*",
    //   "/summarize/*",
    //   "/subscriptions/*",
    // ],
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────
// Mount each domain's router under its respective prefix.
// The prefix here MUST match the path expected by the React frontend (api.js).

app.use("/auth", authRoutes);
app.use("/rag", ragRoutes);
app.use("/quiz", quizRoutes);
app.use("/wizard", wizardRoutes);
app.use("/summarize", summaryRoutes);
app.use("/subscriptions", subscriptionRoutes);

// Internal routes (e.g. for py_server)
app.get("/internal/llm-configs/:task_name", async (req, res) => {
  try {
    const { LLMConfig } = require('./models');
    const config = await LLMConfig.findByPk(req.params.task_name);
    if (!config) return res.status(404).json({ error: "Config not found" });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

app.post("/internal/ensure-admin", async (req, res) => {
  try {
    logger.info("checking Admin user...")
    const initializeAdmin = require("./utils/checkAdmin")
    await initializeAdmin()
    return res.status(200).json({ message: "Admin user verified" });
  }
  catch (e) {
    console.error(e);
  }
})

app.use("/admin", adminRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────
// 404 — must come after all routes
app.use(notFoundHandler);
// Global error handler — must be last and has 4 parameters (err, req, res, next)
app.use(globalErrorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info("╔══════════════════════════════════════════════════════════╗");
  logger.info("║       Cognitive Wizard — Express Gateway Server          ║");
  logger.info("╚══════════════════════════════════════════════════════════╝");
  logger.info(`  Environment : ${NODE_ENV}`);
  logger.info(`  py_server   : ${PY_SERVER_URL}`);
  logger.info(`  CORS Origins: ${CORS_ORIGINS.join(", ")}`);
  logger.info("──────────────────────────────────────────────────────────");
});

// ─── Graceful shutdown ────────────────────────────────────────────────────
// Ensure in-flight requests finish before the process exits.

function gracefulShutdown(signal) {
  logger.warn(`[SHUTDOWN] Received ${signal}. Closing HTTP server gracefully...`);
  server.close(() => {
    logger.info("[SHUTDOWN] HTTP server closed. Exiting process.");
    process.exit(0);
  });

  // Force-kill if server doesn't close within 10 seconds
  setTimeout(() => {
    logger.error("[SHUTDOWN] Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Catch unhandled promise rejections to avoid silent failures
process.on("unhandledRejection", (reason, promise) => {
  logger.error("[UNHANDLED REJECTION]", { reason, promise });
});

// Catch uncaught synchronous exceptions
process.on("uncaughtException", (err) => {
  logger.error("[UNCAUGHT EXCEPTION]", { message: err.message, stack: err.stack });
  process.exit(1);
});

module.exports = app; // Exported for testing purposes
