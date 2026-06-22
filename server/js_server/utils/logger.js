/**
 * utils/logger.js
 * ================
 * Centralized logger for the Express gateway server (js_server).
 *
 * Uses Winston for structured, levelled logging with:
 *  - Console transport (colorized in development)
 *  - Daily-rotate-capable file transport using timestamps
 *
 * Log levels: error > warn > info > http > debug
 * Set LOG_LEVEL in .env to control verbosity.
 */

const { createLogger, format, transports } = require("winston");
const path = require("path");
const fs = require("fs");

// ─── Ensure logs directory exists ──────────────────────────────────────────
const LOG_DIR = path.join(__dirname, "../logs");
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ─── Log level from environment (default: info) ────────────────────────────
const LOG_LEVEL = (process.env.LOG_LEVEL || "info").toLowerCase();

// ─── Custom formats ────────────────────────────────────────────────────────
const timestampFormat = format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" });

// Console format: colorized + readable
const consoleFormat = format.combine(
  format.colorize({ all: true }),
  timestampFormat,
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level}]: ${message}${metaStr}`;
  })
);

// File format: JSON for structured log parsing
const fileFormat = format.combine(
  timestampFormat,
  format.errors({ stack: true }),
  format.json()
);

// ─── Logger instance ───────────────────────────────────────────────────────
const logger = createLogger({
  level: LOG_LEVEL,
  silent: false,
  transports: [
    // Console output (dev-friendly)
    new transports.Console({
      format: consoleFormat,
    }),
    // Persistent file: all logs
    new transports.File({
      filename: path.join(LOG_DIR, "combined.log"),
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5 MB per file
      maxFiles: 5,
    }),
    // Persistent file: error-level logs only
    new transports.File({
      level: "error",
      filename: path.join(LOG_DIR, "error.log"),
      format: fileFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
  ],
});

// ─── Morgan-compatible HTTP stream ────────────────────────────────────────
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
