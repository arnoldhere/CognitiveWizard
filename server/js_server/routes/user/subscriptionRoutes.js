/**
 * routes/user/subscriptionRoutes.js
 * ===================================
 * Express router for all /subscriptions/* endpoints.
 *
 * Route delegation:
 *  ┌─────────────────────────────┬──────────────────────────────────────────────┐
 *  │ Express Route               │ Delegated to (py_server FastAPI)             │
 *  ├─────────────────────────────┼──────────────────────────────────────────────┤
 *  │ GET  /subscriptions/plans   │ GET  /subscriptions/plans  (public)          │
 *  │ POST /subscriptions/order   │ POST /subscriptions/order  (auth required)   │
 *  │ POST /subscriptions/confirm │ POST /subscriptions/confirm (auth required)  │
 *  └─────────────────────────────┴──────────────────────────────────────────────┘
 *
 * Note: /plans is public (no auth needed to browse plans);
 *       /order and /confirm require a valid JWT.
 */

const { Router } = require("express");
const { authenticate } = require("../../middlewares/authMiddleware");
const {
  listPlans,
  createOrder,
  confirmPayment,
} = require("../../controllers/subscriptionController");

const router = Router();

/** List available subscription plans (public) */
router.get("/plans", listPlans);

/** Create a Razorpay payment order (authenticated) */
router.post("/order", authenticate, createOrder);

/** Confirm payment and activate subscription (authenticated) */
router.post("/confirm", authenticate, confirmPayment);

module.exports = router;
