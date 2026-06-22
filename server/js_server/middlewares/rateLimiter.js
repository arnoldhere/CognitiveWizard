/**
 * middlewares/rateLimiter.js
 * ==========================
 * Rate-limiting middleware for the Express gateway (js_server).
 *
 * Provides two exported limiters:
 *  - `globalLimiter`   — applied to all API routes (configurable via .env)
 *  - `authLimiter`     — stricter limit for auth endpoints (login / signup)
 *    to mitigate brute-force attacks
 *
 * Uses express-rate-limit which stores state in memory by default.
 * For multi-instance deployments, swap the store for a Redis-backed one.
 */

const rateLimit = require("express-rate-limit");
const logger = require("../utils/logger");

// ─── Configuration from environment ───────────────────────────────────────
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10); // 1 min
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10);

/**
 * Shared handler called when a client exceeds the limit.
 * Logs the violation and returns a 429 response.
 */
function rateLimitExceededHandler(req, res, _next, options) {
  logger.warn(
    `[RATE_LIMIT] Limit exceeded: ${req.ip} → ${req.method} ${req.originalUrl}`,
    { limit: options.max, windowMs: options.windowMs }
  );
  res.status(429).json({
    error: "TooManyRequests",
    message: options.message || "Too many requests. Please slow down and try again.",
    retryAfter: Math.ceil(WINDOW_MS / 1000), // seconds
  });
}

/**
 * globalLimiter — general rate limit applied to all API routes.
 * Default: 100 requests per 60 seconds per IP.
 */
const globalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  message: `Too many requests. You are allowed ${MAX_REQUESTS} requests per minute.`,
  handler: rateLimitExceededHandler,
});

/**
 * authLimiter — strict limit for authentication endpoints.
 * Default: 10 requests per 15 minutes per IP.
 * Helps defend against brute-force login/signup attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many authentication attempts. Please wait 15 minutes before trying again.",
  handler: rateLimitExceededHandler,
});

/**
 * aiLimiter — slightly relaxed limit for AI-ML endpoints (quiz, RAG, wizard).
 * AI calls are heavier; 30 per minute is intentionally generous.
 */
const aiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many AI service requests. Please wait a moment before trying again.",
  handler: rateLimitExceededHandler,
});

module.exports = { globalLimiter, authLimiter, aiLimiter };
