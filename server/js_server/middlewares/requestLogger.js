/**
 * middlewares/requestLogger.js
 * ============================
 * HTTP request logging middleware for the Express gateway (js_server).
 *
 * Uses Morgan with a custom token set that writes through Winston so all logs
 * share the same format and transport configuration.
 *
 * Logged fields per request:
 *  method, url, status, response-time, content-length, remote-ip, user-agent
 *
 * The logger outputs at the `http` level, which is below `info` — set
 * LOG_LEVEL=http or LOG_LEVEL=debug in .env to see individual request logs.
 */

const morgan = require("morgan");
const logger = require("../utils/logger");

// ─── Custom Morgan format ─────────────────────────────────────────────────
// Includes IP and user-agent for debugging without being too verbose.
const HTTP_FORMAT =
  ":remote-addr :method :url :status :res[content-length] - :response-time ms | :user-agent";

/**
 * morganMiddleware — Morgan instance wired to Winston's HTTP stream.
 *
 * In production, only log errors (4xx+5xx); in development, log everything.
 */
const morganMiddleware = morgan(HTTP_FORMAT, {
  stream: logger.stream,
  // Skip successful requests in production to reduce noise
  skip: (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.statusCode < 400; // Only log 4xx and 5xx
    }
    return false; // Log everything in development
  },
});

module.exports = morganMiddleware;
