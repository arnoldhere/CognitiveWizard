const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RAGQueryLog = sequelize.define('RAGQueryLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  session_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  contexts: {
    type: DataTypes.JSON,
    allowNull: true
  },
  context_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  latency_retrieval_ms: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  latency_generation_ms: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  latency_total_ms: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  sources: {
    type: DataTypes.JSON,
    allowNull: true
  },
  metrics: {
    type: DataTypes.JSON,
    allowNull: true
  },
  log_metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'rag_query_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = RAGQueryLog;
