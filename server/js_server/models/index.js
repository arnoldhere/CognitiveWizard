const { sequelize } = require('../config/db');

const User = require('./User');
const ChatSession = require('./ChatSession');
const WizardContent = require('./WizardContent');
const Grade = require('./Grade');
const PaymentTransaction = require('./PaymentTransaction');
const RAGDocument = require('./RAGDocument');
const RAGQueryLog = require('./RAGLog');

// Define relationships
User.hasMany(Grade, { foreignKey: 'user_id', as: 'grades' });
Grade.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(PaymentTransaction, { foreignKey: 'user_id', as: 'payment_transactions' });
PaymentTransaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Sync all models (Optional, but good for local dev)
sequelize.sync({ alter: true }).catch(console.error);

module.exports = {
  sequelize,
  User,
  ChatSession,
  WizardContent,
  Grade,
  PaymentTransaction,
  RAGDocument,
  RAGQueryLog,
};
