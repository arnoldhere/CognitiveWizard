/**
 * routes/user/subscriptionRoutes.js
 * ====================================
 * Express router for all /subscriptions/* endpoints.
 *
 * Route delegation:
 *  ┌──────────────────────────────────┬────────────────────────────────────────────────────┐
 *  │ Express Route                    │ Handled by                                         │
 *  ├──────────────────────────────────┼────────────────────────────────────────────────────┤
 *  │ GET  /subscriptions/plans        │ listPlans         (public)                         │
 *  │ GET  /subscriptions/status       │ getSubscriptionStatus (auth required)              │
 *  │ POST /subscriptions/order        │ createOrder       (auth required)                  │
 *  │ POST /subscriptions/confirm      │ confirmPayment    (auth required)                  │
 *  │ DELETE /subscriptions/cancel     │ cancelSubscription (auth required)                 │
 *  │ POST /subscriptions/check-expiry │ checkAndNotifyExpiry (auth required — admin/cron)  │
 *  └──────────────────────────────────┴────────────────────────────────────────────────────┘
 *
 * Note: /plans is public; all others require a valid JWT.
 */

const { Router } = require("express");
const { authenticate } = require("../../middlewares/authMiddleware");
const {
  listPlans,
  getSubscriptionStatus,
  createOrder,
  confirmPayment,
  cancelSubscription,
  checkAndNotifyExpiry,
} = require("../../controllers/subscriptionController");

const router = Router();

/** List available subscription plans (public — no login needed) */
router.get("/plans", listPlans);

/** Get current user's subscription status including expiry and days left */
router.get("/status", authenticate, getSubscriptionStatus);

/** Create a Razorpay payment order for a selected plan */
router.post("/order", authenticate, createOrder);

/** Confirm payment after Razorpay checkout and activate subscription */
router.post("/confirm", authenticate, confirmPayment);

/** Cancel the authenticated user's active subscription */
router.delete("/cancel", authenticate, cancelSubscription);

/** Check all subscriptions expiring within 5 days and send reminder emails */
router.post("/check-expiry", authenticate, checkAndNotifyExpiry);

module.exports = router;
