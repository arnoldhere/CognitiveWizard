const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RAGDocument = sequelize.define('RAGDocument', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  document_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  snippet: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata_json: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'rag_documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = RAGDocument;
