/**
 * controllers/authController.js
 * ==============================
 * Controller functions for authentication-related routes.
 *
 * Responsibility:
 *  - Handle multipart form-data for face endpoints (requires multer)
 *  - Forward all auth operations to py_server via the proxyToPyServer utility
 *  - Log significant auth events for audit trails
 *
 * Route delegation:
 *  All /auth/* paths are proxied directly to FastAPI py_server which owns
 *  the user DB, hashing, JWT issuance, OTP/Redis, and facial recognition.
 */

const multer = require("multer");
const FormData = require("form-data");
const { proxyToPyServer } = require("../utils/apiProxy");
const logger = require("../utils/logger");

// ─── Multer config: memory storage for face image uploads ─────────────────
// We forward the raw buffer bytes to py_server as multipart/form-data.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.FACE_LOGIN_MAX_BYTES || "5242880", 10), // 5 MB default
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error("Only JPEG and PNG images are supported for face endpoints."),
        false
      );
    }
    cb(null, true);
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Build a FormData object from a multer file buffer and optional extra fields.
 *
 * @param {Express.Multer.File} file  - Multer file object (buffer in memory)
 * @param {Record<string, string>} fields
 * @returns {FormData}
 */
function buildFormData(file, fields = {}) {
  const form = new FormData();

  // Append extra text fields first (e.g. userid)
  Object.entries(fields).forEach(([key, val]) => form.append(key, val));

  // Append the image buffer with the original filename and mime type
  form.append("image", file.buffer, {
    filename: file.originalname || "face.jpg",
    contentType: file.mimetype,
  });

  return form;
}

// ─── Controller handlers ───────────────────────────────────────────────────

/** POST /auth/signup — register a new user */
async function signup(req, res, next) {
  try {
    logger.info(`[AUTH] Signup attempt: ${req.body?.email}`);
    await proxyToPyServer({ method: "POST", path: "/auth/signup", req, res });
  } catch (err) {
    next(err);
  }
}

/** POST /auth/login — credential login, returns JWT */
async function login(req, res, next) {
  try {
    logger.info(`[AUTH] Login attempt: ${req.body?.email}`);
    await proxyToPyServer({ method: "POST", path: "/auth/login", req, res });
  } catch (err) {
    next(err);
  }
}

/** GET /auth/me — return currently authenticated user profile */
async function getMe(req, res, next) {
  try {
    await proxyToPyServer({ method: "GET", path: "/auth/me", req, res });
  } catch (err) {
    next(err);
  }
}

/** PATCH /auth/profile — update user profile fields */
async function updateProfile(req, res, next) {
  try {
    logger.info(`[AUTH] Profile update: ${req.user?.email}`);
    await proxyToPyServer({ method: "PATCH", path: "/auth/profile", req, res });
  } catch (err) {
    next(err);
  }
}

/** DELETE /auth/profile — permanently delete user account */
async function deleteProfile(req, res, next) {
  try {
    logger.warn(`[AUTH] Account deletion requested: ${req.user?.email}`);
    await proxyToPyServer({ method: "DELETE", path: "/auth/profile", req, res });
  } catch (err) {
    next(err);
  }
}

/** POST /auth/forgot-password — send OTP to email for password reset */
async function forgotPassword(req, res, next) {
  try {
    logger.info(`[AUTH] Forgot password: ${req.body?.email}`);
    await proxyToPyServer({ method: "POST", path: "/auth/forgot-password", req, res });
  } catch (err) {
    next(err);
  }
}

/** POST /auth/reset-password — verify OTP and set new password */
async function resetPassword(req, res, next) {
  try {
    logger.info(`[AUTH] Password reset attempt: ${req.body?.email}`);
    await proxyToPyServer({ method: "POST", path: "/auth/reset-password", req, res });
  } catch (err) {
    next(err);
  }
}

// ─── Face Auth Controllers ─────────────────────────────────────────────────

/**
 * POST /auth/face/register
 * Accepts: multipart/form-data with fields { userid, image }
 * Requires: authenticated user (JWT must be valid)
 */
async function faceRegister(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Face image file is required.",
      });
    }

    const userId = req.body?.userid;
    if (!userId) {
      return res.status(400).json({
        error: "BadRequest",
        message: "userid field is required for face registration.",
      });
    }

    logger.info(`[AUTH/FACE] Register face for user: ${userId}`);

    // Build a fresh FormData to forward to py_server
    const formData = buildFormData(req.file, { userid: userId });

    await proxyToPyServer({
      method: "POST",
      path: "/auth/face/register",
      req,
      res,
      formData,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/face/login
 * Accepts: multipart/form-data with field { image }
 * Public endpoint — no JWT required before this call
 */
async function faceLogin(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Face image file is required for facial login.",
      });
    }

    logger.info(`[AUTH/FACE] Face login attempt from ${req.ip}`);

    const formData = buildFormData(req.file);

    await proxyToPyServer({
      method: "POST",
      path: "/auth/face/login",
      req,
      res,
      formData,
    });
  } catch (err) {
    next(err);
  }
}

/** GET /auth/face/status — check if current user has facial login enabled */
async function faceStatus(req, res, next) {
  try {
    await proxyToPyServer({ method: "GET", path: "/auth/face/status", req, res });
  } catch (err) {
    next(err);
  }
}

/** DELETE /auth/face — remove current user's facial login data */
async function deleteFace(req, res, next) {
  try {
    logger.info(`[AUTH/FACE] Remove face login: ${req.user?.email}`);
    await proxyToPyServer({ method: "DELETE", path: "/auth/face", req, res });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  getMe,
  updateProfile,
  deleteProfile,
  forgotPassword,
  resetPassword,
  faceRegister,
  faceLogin,
  faceStatus,
  deleteFace,
  // Export multer instance so routes can use it as middleware
  upload,
};
