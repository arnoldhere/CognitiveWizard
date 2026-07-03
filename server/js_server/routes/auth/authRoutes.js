/**
 * routes/auth/authRoutes.js
 * ==========================
 * Express router for all /auth/* endpoints.
 *
 * Facial authentication routes have been deprecated and removed.
 *
 * Route delegation:
 *  ┌─────────────────────────────┬───────────────────────────────────────────┐
 *  │ Express Route               │ Handled by                                │
 *  ├─────────────────────────────┼───────────────────────────────────────────┤
 *  │ POST  /auth/signup          │ authController.signup  (native)           │
 *  │ POST  /auth/login           │ authController.login   (native)           │
 *  │ GET   /auth/me              │ authController.getMe   (auth req.)        │
 *  │ PATCH /auth/profile         │ authController.updateProfile (auth req.)  │
 *  │ DELETE/auth/profile         │ authController.deleteProfile (auth req.)  │
 *  │ POST  /auth/forgot-password │ authController.forgotPassword             │
 *  │ POST  /auth/reset-password  │ authController.resetPassword              │
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

// ─── Protected Auth Routes ────────────────────────────────────────────────
/** Get currently authenticated user's profile */
router.get("/me", authenticate, getMe);

/** Update profile fields (full_name, phone, dob) */
router.patch("/profile", authenticate, updateProfile);

/** Permanently delete account and all associated data */
router.delete("/profile", authenticate, deleteProfile);

module.exports = router;
