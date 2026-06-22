/**
 * controllers/subscriptionController.js
 * =======================================
 * Controller functions for subscription/payment routes.
 *
 * Handles:
 *  - Listing subscription plans (public)
 *  - Creating a Razorpay payment order (authenticated)
 *  - Confirming payment and activating subscription (authenticated)
 *
 * All operations are proxied to py_server which handles:
 *  - Razorpay API integration
 *  - Payment signature verification
 *  - Subscription record persistence (MySQL)
 *  - Daily chat limit updates
 */

const { proxyToPyServer } = require("../utils/apiProxy");
const logger = require("../utils/logger");

/**
 * GET /subscriptions/plans
 * List all available subscription plans (public — no auth required).
 */
async function listPlans(req, res, next) {
  try {
    await proxyToPyServer({ method: "GET", path: "/subscriptions/plans", req, res });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /subscriptions/order
 * Create a Razorpay payment order for the selected plan.
 * Body: { plan }
 */
async function createOrder(req, res, next) {
  try {
    const { plan } = req.body || {};
    logger.info(`[SUBSCRIPTION] Order created: plan="${plan}" by ${req.user?.email}`);
    await proxyToPyServer({ method: "POST", path: "/subscriptions/order", req, res });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /subscriptions/confirm
 * Confirm Razorpay payment and activate subscription.
 * Body: { plan, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
async function confirmPayment(req, res, next) {
  try {
    const { plan, razorpay_order_id } = req.body || {};
    logger.info(
      `[SUBSCRIPTION] Payment confirm: plan="${plan}", by ${req.user?.email}`
    );
    await proxyToPyServer({ method: "POST", path: "/subscriptions/confirm", req, res });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPlans,
  createOrder,
  confirmPayment,
};
