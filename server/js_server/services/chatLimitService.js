const { User } = require('../models');

const MAX_MESSAGES_PER_DAY = 5;

function getEffectiveLimit(user) {
  if (user.daily_chat_limit && user.daily_chat_limit > 0) {
    return user.daily_chat_limit;
  }
  return MAX_MESSAGES_PER_DAY;
}

async function ensureTrackingWindow(user) {
  const now = new Date();
  
  // Reload from DB to ensure fresh data
  const dbUser = await User.findByPk(user.id);
  if (!dbUser) return user; // Fallback

  const shouldInitialize = dbUser.chat_limit === null || dbUser.chat_limit_reset_at === null;
  const shouldReset = dbUser.chat_limit_reset_at && now >= dbUser.chat_limit_reset_at;

  if (shouldInitialize || shouldReset) {
    dbUser.chat_limit = 0;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dbUser.chat_limit_reset_at = tomorrow;
    await dbUser.save();
  }
  
  return dbUser;
}

async function checkLimit(user) {
  const trackedUser = await ensureTrackingWindow(user);
  const messagesUsed = trackedUser.chat_limit || 0;
  const maxMessages = getEffectiveLimit(trackedUser);
  const messagesRemaining = Math.max(0, maxMessages - messagesUsed);
  const canSend = messagesUsed < maxMessages;
  
  return { canSend, messagesUsed, messagesRemaining, trackedUser };
}

async function incrementMessageCount(user) {
  const trackedUser = await ensureTrackingWindow(user);
  trackedUser.chat_limit = (trackedUser.chat_limit || 0) + 1;
  await trackedUser.save();
  return trackedUser;
}

async function getUserStatus(user) {
  const trackedUser = await ensureTrackingWindow(user);
  const { canSend, messagesUsed, messagesRemaining } = await checkLimit(trackedUser);
  const maxMessages = getEffectiveLimit(trackedUser);

  return {
    can_send: canSend,
    messages_used: messagesUsed,
    messages_remaining: messagesRemaining,
    max_per_day: maxMessages,
    reset_time: trackedUser.chat_limit_reset_at ? trackedUser.chat_limit_reset_at.toISOString() : null,
    limit_reached: !canSend,
    subscribed: !!trackedUser.subscribed,
    subscription_plan: trackedUser.subscription_plan,
    subscription_name: trackedUser.subscription_plan 
      ? trackedUser.subscription_plan.charAt(0).toUpperCase() + trackedUser.subscription_plan.slice(1) 
      : "Free",
    subscription_daily_limit: trackedUser.daily_chat_limit || maxMessages
  };
}

module.exports = {
  checkLimit,
  incrementMessageCount,
  getUserStatus,
  ensureTrackingWindow
};
