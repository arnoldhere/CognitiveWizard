const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  hashed_password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'user'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  chat_limit: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  subscribed: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  subscription_plan: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  daily_chat_limit: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  chat_limit_reset_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  otp: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  otp_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: false // We use `created_at` instead of createdAt/updatedAt
});

module.exports = User;
