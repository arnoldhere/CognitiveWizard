/**
 * routes/auth/authRoutes.js
 * ==========================
 * Express router for all /auth/* endpoints.
 *
 * Route delegation:
 *  ┌─────────────────────────────┬───────────────────────────────────────────┐
 *  │ Express Route               │ Delegated to (py_server FastAPI)          │
 *  ├─────────────────────────────┼───────────────────────────────────────────┤
 *  │ POST  /auth/signup          │ POST  /auth/signup                        │
 *  │ POST  /auth/login           │ POST  /auth/login                         │
 *  │ GET   /auth/me              │ GET   /auth/me              (auth req.)   │
 *  │ PATCH /auth/profile         │ PATCH /auth/profile         (auth req.)   │
 *  │ DELETE/auth/profile         │ DELETE/auth/profile         (auth req.)   │
 *  │ POST  /auth/forgot-password │ POST  /auth/forgot-password               │
 *  │ POST  /auth/reset-password  │ POST  /auth/reset-password                │
 *  │ POST  /auth/face/register   │ POST  /auth/face/register   (auth req.)   │
 *  │ POST  /auth/face/login      │ POST  /auth/face/login                    │
 *  │ GET   /auth/face/status     │ GET   /auth/face/status     (auth req.)   │
 *  │ DELETE/auth/face            │ DELETE/auth/face            (auth req.)   │
 *  └─────────────────────────────┴───────────────────────────────────────────┘
 *
 * Middlewares applied:
 *  - authLimiter  — stricter rate-limit on login/signup/forgot-password
 *  - authenticate — JWT verification (protected routes only)
 */

const { Router } = require("express");
const { authLimiter } = require("../../middlewares/rateLimiter");
const { authenticate } = require("../../middlewares/authMiddleware");
const {
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
  upload,
} = require("../../controllers/authController");

const router = Router();

// ─── Public Auth Routes ────────────────────────────────────────────────────
// Apply authLimiter to protect against brute-force/spam

/** Register a new user account */
router.post("/signup", authLimiter, signup);

/** Standard email + password login */
router.post("/login", authLimiter, login);

/** Initiate password-reset OTP flow */
router.post("/forgot-password", authLimiter, forgotPassword);

/** Verify OTP and set new password */
router.post("/reset-password", authLimiter, resetPassword);

// ─── Face Login (Public — no existing token needed) ───────────────────────
/** Authenticate using facial recognition */
router.post(
  "/face/login",
  authLimiter,
  upload.single("image"),  // Parse face image
  faceLogin
);

// ─── Protected Auth Routes ────────────────────────────────────────────────
/** Get currently authenticated user's profile */
router.get("/me", authenticate, getMe);

/** Update profile fields (full_name, phone, dob) */
router.patch("/profile", authenticate, updateProfile);

/** Permanently delete account and all associated data */
router.delete("/profile", authenticate, deleteProfile);

// ─── Face Auth (Protected) ────────────────────────────────────────────────
/** Register a face image for facial login */
router.post(
  "/face/register",
  authenticate,
  upload.single("image"),  // Parse face image
  faceRegister
);

/** Check if current user has facial login configured */
router.get("/face/status", authenticate, faceStatus);

/** Remove current user's facial login data */
router.delete("/face", authenticate, deleteFace);

module.exports = router;
