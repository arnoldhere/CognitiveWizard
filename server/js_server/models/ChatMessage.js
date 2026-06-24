const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  session_id: { type: String, required: true, index: true },
  user_id: { type: Number, required: true },
  role: { type: String, required: true },
  content: { type: String, required: true },
  metadata: { type: Object, default: {} },
  created_at: { type: Date, default: Date.now }
});

// Compound index for ordered retrieval
ChatMessageSchema.index({ session_id: 1, created_at: 1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema, 'chat_messages');
