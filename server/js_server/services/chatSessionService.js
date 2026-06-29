const { ChatSession } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function createChatSession(userId, title) {
  const session = await ChatSession.create({
    session_id: uuidv4(),
    user_id: userId,
    title: title || 'New Chat',
    active: true,
    message_count: 0,
    chat_metadata: {},
    created_at: new Date()
  });
  return session;
}

async function listChatSessions(userId, activeOnly = true) {
  const where = { user_id: userId };
  if (activeOnly) {
    where.active = true;
  }
  const sessions = await ChatSession.findAll({
    where,
    order: [['last_message_at', 'DESC'], ['created_at', 'DESC']]
  });
  return sessions;
}

async function getChatSession(sessionId, userId) {
  return await ChatSession.findOne({
    where: { session_id: sessionId, user_id: userId }
  });
}

async function renameChatSession(sessionId, userId, newTitle) {
  const session = await getChatSession(sessionId, userId);
  if (!session) return null;
  session.title = newTitle;
  await session.save();
  return session;
}

async function softDeleteChatSession(sessionId, userId) {
  const session = await getChatSession(sessionId, userId);
  if (!session) return false;
  session.active = false;
  await session.save();
  return true;
}

async function incrementSessionMessageCount(sessionId, userId) {
  const session = await getChatSession(sessionId, userId);
  if (session) {
    session.message_count += 1;
    session.last_message_at = new Date();
    await session.save();
  }
}

module.exports = {
  createChatSession,
  listChatSessions,
  getChatSession,
  renameChatSession,
  softDeleteChatSession,
  incrementSessionMessageCount
};
