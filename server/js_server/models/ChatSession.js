const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ChatSession = sequelize.define('ChatSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  session_id: {
    type: DataTypes.STRING(64),
    unique: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  message_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  chat_metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  last_message_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'chat_sessions',
  timestamps: false
});

module.exports = ChatSession;
