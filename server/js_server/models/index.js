const { sequelize } = require('../config/db');

// Import models
const User = require('./User');
const ChatSession = require('./ChatSession');
const FaceEmbedding = require('./FaceEmbedding');
const Grade = require('./Grade');
const PaymentTransaction = require('./PaymentTransaction');
const RAGDocument = require('./RAGDocument');
const RAGQueryLog = require('./RAGQueryLog');
const WizardContent = require('./WizardContent');

// Define Relationships
// User <-> FaceEmbedding (One-to-Many or One-to-One depending on logic, let's say One-to-Many)
User.hasMany(FaceEmbedding, { foreignKey: 'user_id' });
FaceEmbedding.belongsTo(User, { foreignKey: 'user_id' });

// User <-> ChatSession
User.hasMany(ChatSession, { foreignKey: 'user_id' });
ChatSession.belongsTo(User, { foreignKey: 'user_id' });

// User <-> Grade
User.hasMany(Grade, { foreignKey: 'user_id', as: 'grades' });
Grade.belongsTo(User, { foreignKey: 'user_id' });

// User <-> PaymentTransaction
User.hasMany(PaymentTransaction, { foreignKey: 'user_id', as: 'payment_transactions' });
PaymentTransaction.belongsTo(User, { foreignKey: 'user_id' });

// User <-> WizardContent
User.hasMany(WizardContent, { foreignKey: 'user_id', as: 'wizard_contents' });
WizardContent.belongsTo(User, { foreignKey: 'user_id' });

// RAG related
User.hasMany(RAGDocument, { foreignKey: 'user_id' });
RAGDocument.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(RAGQueryLog, { foreignKey: 'user_id' });
RAGQueryLog.belongsTo(User, { foreignKey: 'user_id' });


module.exports = {
  sequelize,
  User,
  ChatSession,
  FaceEmbedding,
  Grade,
  PaymentTransaction,
  RAGDocument,
  RAGQueryLog,
  WizardContent
};
