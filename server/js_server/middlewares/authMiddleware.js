/**
 * middlewares/authMiddleware.js
 * ==============================
 * JWT verification middleware for the Express gateway (js_server).
 *
 * This middleware:
 *  1. Extracts the Bearer token from the Authorization header.
 *  2. Verifies the token against the same JWT_SECRET_KEY used by py_server.
 *  3. Attaches the decoded payload (sub=email, role) to req.user.
 *  4. Passes errors to the global error handler via next(err).
 *
 * Usage:
 *   router.get('/protected', authenticate, (req, res) => { ... })
 *   router.get('/admin', authenticate, requireRole('admin'), ...)
 *
 * Note: We intentionally replicate the JWT check here so the gateway can
 * reject unauthenticated requests early, before proxying to py_server.
 * py_server will do its own verification as a second layer of security.
 */

const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

// ─── JWT configuration (must match py_server settings) ────────────────────
const JWT_SECRET = process.env.JWT_SECRET_KEY || "cogwiz";
const JWT_ALGORITHM = process.env.JWT_ALGORITHM || "HS256";

/**
 * authenticate — verifies the JWT and attaches decoded user to req.user.
 *
 * @type {import('express').RequestHandler}
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"] || "";

  if (!authHeader.startsWith("Bearer ")) {
    logger.warn(`[AUTH] Missing or malformed Authorization header: ${req.originalUrl}`);
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required. Please provide a valid Bearer token.",
    });
  }

  const token = authHeader.slice(7); // Strip "Bearer " prefix

  try {
    const unverifiedDecoded = jwt.decode(token);
    const secret = unverifiedDecoded?.role === 'admin' 
        ? (process.env.ADMIN_JWT_SECRET_KEY || JWT_SECRET + "_admin") 
        : JWT_SECRET;

    const decoded = jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    });

    let userId = decoded.id;
    if (!userId) {
       const { User } = require("../models");
       const user = await User.findOne({ where: { email: decoded.sub } });
       if (user) userId = user.id;
    }

    // Attach decoded payload to request for downstream middleware/routes
    req.user = {
      id: userId,
      email: decoded.sub,
      role: decoded.role || "user",
      raw: decoded,
    };

    logger.debug(`[AUTH] Verified user: ${req.user.email} (${req.user.role})`);
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      logger.warn(`[AUTH] Expired token for ${req.originalUrl}`);
      return res.status(401).json({
        error: "TokenExpired",
        message: "Your session has expired. Please log in again.",
      });
    }

    if (err.name === "JsonWebTokenError") {
      logger.warn(`[AUTH] Invalid token for ${req.originalUrl}: ${err.message}`);
      return res.status(401).json({
        error: "InvalidToken",
        message: "Invalid authentication token. Please log in again.",
      });
    }

    // Unknown JWT error — pass to global error handler
    logger.error(`[AUTH] Unexpected JWT error: ${err.message}`);
    next(err);
  }
}

/**
 * requireRole — factory that returns a middleware enforcing a specific role.
 *
 * Must be used AFTER authenticate (relies on req.user).
 *
 * @param {...string} roles  - Allowed roles (e.g. 'admin', 'user')
 * @returns {import('express').RequestHandler}
 */
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      // Defensive: should not happen if authenticate ran first
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication is required.",
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        `[AUTH] Role denied: user ${req.user.email} (${req.user.role}) tried ${req.originalUrl} — requires ${roles.join(", ")}`
      );
      return res.status(403).json({
        error: "Forbidden",
        message: `Access denied. Required role: ${roles.join(" or ")}.`,
      });
    }

    next();
  };
}

module.exports = { authenticate, requireRole };
