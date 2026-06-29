const { pyAxios } = require("../utils/apiProxy");
const logger = require("../utils/logger");
const { PaymentTransaction, User } = require("../models");

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
 * POST /subscriptions/order
 * Create a Razorpay payment order for the selected plan.
 */
async function createOrder(req, res, next) {
  try {
    const { plan } = req.body || {};
    logger.info(`[SUBSCRIPTION] Order created: plan="${plan}" by ${req.user?.email}`);
    
    const aiResponse = await pyAxios.post("/subscriptions/order-raw", { plan });
    const orderData = aiResponse.data;

    // Save transaction to local MySQL
    await PaymentTransaction.create({
      user_id: req.user.id,
      plan: plan,
      amount: orderData.amount,
      amount_inr: orderData.amount / 100, // Razorpay amount is in paise
      currency: orderData.currency,
      razorpay_order_id: orderData.order_id,
      status: "created"
    });

    res.json({
      status: "success",
      data: orderData
    });
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    next(err);
  }
}

/**
 * POST /subscriptions/confirm
 * Confirm Razorpay payment and activate subscription.
 */
async function confirmPayment(req, res, next) {
  try {
    const { plan, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    logger.info(`[SUBSCRIPTION] Payment confirm: plan="${plan}", by ${req.user?.email}`);

    // Verify signature with py_server
    const aiResponse = await pyAxios.post("/subscriptions/verify-signature", {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!aiResponse.data.valid) {
      return res.status(400).json({ detail: "Invalid payment signature" });
    }

    // Update Transaction
    const transaction = await PaymentTransaction.findOne({
      where: { razorpay_order_id, user_id: req.user.id }
    });

    if (!transaction) {
      return res.status(404).json({ detail: "Transaction not found" });
    }

    if (transaction.status === "paid") {
      return res.status(400).json({ detail: "Transaction already processed" });
    }

    transaction.razorpay_payment_id = razorpay_payment_id;
    transaction.razorpay_signature = razorpay_signature;
    transaction.status = "paid";
    transaction.paid_at = new Date();
    await transaction.save();

    // Fetch plan details
    const plansResponse = await pyAxios.get("/subscriptions/plans");
    const planData = plansResponse.data.find(p => p.id === plan);

    // Update User
    const user = await User.findByPk(req.user.id);
    user.subscribed = true;
    user.subscription_plan = plan;
    user.daily_chat_limit = planData.daily_chat_limit;
    
    // Reset limit window
    user.chat_limit = 0;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    user.chat_limit_reset_at = tomorrow;
    await user.save();

    res.json({
      status: "success",
      message: `Subscription activated: ${planData.name}.`,
      plan: planData,
      daily_chat_limit: planData.daily_chat_limit,
      transaction_id: transaction.id,
      paid_at: transaction.paid_at
    });
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    next(err);
  }
}

module.exports = {
  listPlans,
  createOrder,
  confirmPayment,
};
