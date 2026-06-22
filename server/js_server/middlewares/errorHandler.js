/**
 * middlewares/errorHandler.js
 * ===========================
 * Global error-handling middleware for the Express gateway (js_server).
 *
 * Must be registered LAST in the middleware chain (after all routes).
 *
 * Provides:
 *  - Consistent JSON error response shape: { error, message, detail?, stack? }
 *  - Differentiated logging (error vs warn) by severity
 *  - Stack traces only in development mode
 *  - 404 handler for unmatched routes
 */

const logger = require("../utils/logger");

// ─── Known error-type mapping ─────────────────────────────────────────────
const STATUS_MAP = {
  ValidationError: 400,
  SyntaxError: 400,
  UnauthorizedError: 401,
  ForbiddenError: 403,
  NotFoundError: 404,
};

/**
 * 404 handler — catches any request that fell through all route handlers.
 * Register this BEFORE the global errorHandler.
 *
 * @type {import('express').RequestHandler}
 */
function notFoundHandler(req, res, _next) {
  logger.warn(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Global error handler — catches errors thrown by route handlers or passed
 * through next(err).
 *
 * @type {import('express').ErrorRequestHandler}
 */
function globalErrorHandler(err, req, res, _next) {
  // Determine HTTP status
  const status =
    err.status ||
    err.statusCode ||
    STATUS_MAP[err.constructor?.name] ||
    500;

  // Determine message to surface to client
  const clientMessage =
    err.expose === false
      ? "An internal server error occurred. Please try again later."
      : err.message || "Unexpected error";

  // Log with appropriate level
  if (status >= 500) {
    logger.error(`[ERROR] ${req.method} ${req.originalUrl} → ${status}`, {
      message: err.message,
      stack: err.stack,
    });
  } else {
    logger.warn(`[WARN] ${req.method} ${req.originalUrl} → ${status}`, {
      message: err.message,
    });
  }

  // Build response payload
  const payload = {
    error: err.name || "Error",
    message: clientMessage,
  };

  // Expose stack trace in development only
  if (process.env.NODE_ENV !== "production" && err.stack) {
    payload.stack = err.stack;
  }

  // Include extra detail if the error carries it (e.g. validation details)
  if (err.detail) {
    payload.detail = err.detail;
  }

  res.status(status).json(payload);
}

module.exports = { notFoundHandler, globalErrorHandler };
