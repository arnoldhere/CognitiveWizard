/**
 * controllers/subscriptionController.js
 * ========================================
 * Handles all subscription lifecycle operations:
 *  - listing plans
 *  - creating Razorpay payment orders
 *  - confirming payment & activating subscription (with 30-day expiry)
 *  - cancelling an active subscription
 *  - fetching the current subscription status for a user
 *
 * Email notifications (expiry reminders) are triggered via the py_server
 * which has the SMTP settings configured.
 */

const { pyAxios } = require("../utils/apiProxy");
const logger = require("../utils/logger");
const { PaymentTransaction, User } = require("../models");

/** Standard subscription duration — 30 days */
const SUBSCRIPTION_DURATION_DAYS = 30;

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Calculate how many days remain until the subscription expires.
 * Returns null if no expiry date is set.
 * @param {Date|null} expiresAt
 * @returns {number|null}
 */
function getDaysLeft(expiresAt) {
  if (!expiresAt) return null;
  const now = new Date();
  const diff = new Date(expiresAt) - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /subscriptions/plans
 * List all available subscription plans (public — no auth required).
 */
async function listPlans(req, res, next) {
  try {
    const aiResponse = await pyAxios.get("/subscriptions/plans");
    res.json(aiResponse.data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /subscriptions/status
 * Return the authenticated user's current subscription status,
 * including days remaining and purchase date.
 */
async function getSubscriptionStatus(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const daysLeft = getDaysLeft(user.subscription_expires_at);

    res.json({
      subscribed: !!user.subscribed,
      subscription_plan: user.subscription_plan || null,
      subscription_started_at: user.subscription_started_at || null,
      subscription_expires_at: user.subscription_expires_at || null,
      days_left: daysLeft,
      daily_chat_limit: user.daily_chat_limit || null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /subscriptions/order
 * Create a Razorpay payment order for the selected plan.
 * Requires authentication.
 */
async function createOrder(req, res, next) {
  try {
    const { plan } = req.body || {};
    logger.info(`[SUBSCRIPTION] Order created: plan="${plan}" by ${req.user?.email}`);

    // Prevent ordering if the user already has an active subscription
    const user = await User.findByPk(req.user.id);
    if (user.subscribed && user.subscription_expires_at && new Date(user.subscription_expires_at) > new Date()) {
      return res.status(400).json({
        error: "You already have an active subscription. Please cancel it before subscribing to a new plan.",
      });
    }

    const aiResponse = await pyAxios.post("/subscriptions/order-raw", { plan });
    const orderData = aiResponse.data;

    // Persist pending transaction in MySQL
    await PaymentTransaction.create({
      user_id: req.user.id,
      plan,
      amount: orderData.amount,
      amount_inr: orderData.amount / 100, // Razorpay sends paise
      currency: orderData.currency,
      razorpay_order_id: orderData.order_id,
      status: "created",
    });

    res.json({ status: "success", data: orderData });
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    next(err);
  }
}

/**
 * POST /subscriptions/confirm
 * Verify Razorpay signature, mark transaction paid, and activate
 * the subscription for SUBSCRIPTION_DURATION_DAYS days.
 * Requires authentication.
 */
async function confirmPayment(req, res, next) {
  try {
    const { plan, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    logger.info(`[SUBSCRIPTION] Payment confirm: plan="${plan}", by ${req.user?.email}`);

    // Verify HMAC signature with py_server (keeps Razorpay secret in Python env only)
    const aiResponse = await pyAxios.post("/subscriptions/verify-signature", {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!aiResponse.data.valid) {
      return res.status(400).json({ detail: "Invalid payment signature" });
    }

    // Look up and validate the pending transaction
    const transaction = await PaymentTransaction.findOne({
      where: { razorpay_order_id, user_id: req.user.id },
    });

    if (!transaction) {
      return res.status(404).json({ detail: "Transaction not found" });
    }
    if (transaction.status === "paid") {
      return res.status(400).json({ detail: "Transaction already processed" });
    }

    // Mark transaction as paid
    transaction.razorpay_payment_id = razorpay_payment_id;
    transaction.razorpay_signature = razorpay_signature;
    transaction.status = "paid";
    transaction.paid_at = new Date();
    await transaction.save();

    // Fetch plan details from py_server
    const plansResponse = await pyAxios.get("/subscriptions/plans");
    const planData = plansResponse.data.find((p) => p.id === plan);

    if (!planData) {
      return res.status(400).json({ detail: `Unknown plan: ${plan}` });
    }

    // Compute subscription window
    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS);

    // Activate subscription on the User record
    const user = await User.findByPk(req.user.id);
    user.subscribed = true;
    user.subscription_plan = plan;
    user.daily_chat_limit = planData.daily_chat_limit;
    user.subscription_started_at = startedAt;
    user.subscription_expires_at = expiresAt;

    // Reset daily chat counter
    user.chat_limit = 0;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    user.chat_limit_reset_at = tomorrow;

    await user.save();
    logger.info(`[SUBSCRIPTION] Activated plan="${plan}" for ${req.user.email}, expires ${expiresAt.toISOString()}`);

    res.json({
      status: "success",
      message: `Subscription activated: ${planData.name}.`,
      plan: planData,
      daily_chat_limit: planData.daily_chat_limit,
      transaction_id: transaction.id,
      paid_at: transaction.paid_at,
      subscription_started_at: startedAt,
      subscription_expires_at: expiresAt,
      days_left: SUBSCRIPTION_DURATION_DAYS,
    });
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    next(err);
  }
}

/**
 * DELETE /subscriptions/cancel
 * Cancel the authenticated user's active subscription immediately.
 * Resets the user back to the free tier.
 * Requires authentication.
 */
async function cancelSubscription(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.subscribed) {
      return res.status(400).json({ error: "You do not have an active subscription to cancel." });
    }

    const cancelledPlan = user.subscription_plan;
    logger.info(`[SUBSCRIPTION] Cancel plan="${cancelledPlan}" for ${req.user.email}`);

    // Reset user to free tier
    user.subscribed = false;
    user.subscription_plan = null;
    user.daily_chat_limit = null;
    user.subscription_started_at = null;
    user.subscription_expires_at = null;

    // Reset chat counter to free tier defaults
    user.chat_limit = 0;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    user.chat_limit_reset_at = tomorrow;

    await user.save();

    res.json({
      status: "success",
      message: `Subscription (${cancelledPlan}) has been cancelled successfully. You are now on the free tier.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /subscriptions/check-expiry
 * Internal/cron-style endpoint: checks all subscriptions expiring
 * within the next 5 days and fires reminder emails via py_server.
 * Can also be triggered by admin or a scheduled task.
 */
async function checkAndNotifyExpiry(req, res, next) {
  try {
    const now = new Date();
    const fiveDaysFromNow = new Date(now);
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

    // Find users whose subscriptions expire within 5 days and are still active
    const { Op } = require("sequelize");
    const usersExpiringSoon = await User.findAll({
      where: {
        subscribed: true,
        subscription_expires_at: {
          [Op.between]: [now, fiveDaysFromNow],
        },
      },
    });

    if (usersExpiringSoon.length === 0) {
      return res.json({ status: "success", notified: 0, message: "No subscriptions expiring soon." });
    }

    let notified = 0;

    for (const user of usersExpiringSoon) {
      const daysLeft = getDaysLeft(user.subscription_expires_at);
      try {
        // Delegate email sending to py_server (which has SMTP configured)
        await pyAxios.post("/subscriptions/notify-expiry", {
          email: user.email,
          full_name: user.full_name || user.email,
          plan: user.subscription_plan,
          days_left: daysLeft,
          expires_at: user.subscription_expires_at,
        });
        notified++;
        logger.info(`[SUBSCRIPTION] Expiry reminder sent to ${user.email}, ${daysLeft} days left`);
      } catch (emailErr) {
        logger.warn(`[SUBSCRIPTION] Failed to send expiry reminder to ${user.email}: ${emailErr.message}`);
      }
    }

    res.json({ status: "success", notified, total_checked: usersExpiringSoon.length });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPlans,
  getSubscriptionStatus,
  createOrder,
  confirmPayment,
  cancelSubscription,
  checkAndNotifyExpiry,
};
