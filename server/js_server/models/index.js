const { sequelize } = require('../config/db');

const User = require('./User');
const ChatSession = require('./ChatSession');
const WizardContent = require('./WizardContent');
const Grade = require('./Grade');
const PaymentTransaction = require('./PaymentTransaction');
const RAGDocument = require('./RAGDocument');
const RAGQueryLog = require('./RAGLog');
const LLMConfig = require('./LLMConfig');

// Define relationships
User.hasMany(Grade, { foreignKey: 'user_id', as: 'grades' });
Grade.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(PaymentTransaction, { foreignKey: 'user_id', as: 'payment_transactions' });
PaymentTransaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Sync all models (Optional, but good for local dev)
sequelize.sync().then(async () => {
  const count = await LLMConfig.count();
  if (count === 0) {
    const defaultConfigs = [
      { task_name: 'chat', temperature: 0.5, max_new_tokens: 512, use_chat: true },
      { task_name: 'summarize', temperature: 0.3, max_new_tokens: 1024, use_chat: true },
      { task_name: 'quiz', temperature: 0.8, max_new_tokens: 2500, top_p: 0.9, top_k: 50, use_chat: true },
      { task_name: 'rag', temperature: 0.3, max_new_tokens: 768, use_chat: true },
      { task_name: 'wizard', temperature: 0.6, max_new_tokens: 3000, top_p: 0.9, top_k: 50, use_chat: true },
    ];
    await LLMConfig.bulkCreate(defaultConfigs);
    console.log('Seeded default LLM configs');
  }
}).catch(console.error);

module.exports = {
  sequelize,
  User,
  ChatSession,
  WizardContent,
  Grade,
  PaymentTransaction,
  RAGDocument,
  RAGQueryLog,
  LLMConfig,
};
