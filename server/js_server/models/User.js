const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  hashed_password: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  auth_provider: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'local',
  },
  oauth_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  avatar_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'user',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  chat_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  subscribed: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  subscription_plan: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  daily_chat_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  chat_limit_reset_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  /** Date when the subscription was activated */
  subscription_started_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  /** Date when the subscription expires (30 days after start) */
  subscription_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  otp: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  otp_expires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true, // Will add createdAt and updatedAt
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['email'],
      name: 'email',
    },
    {
      name: 'idx_users_role',
      fields: ['role'],
    },
    {
      name: 'idx_users_auth_provider',
      fields: ['auth_provider', 'oauth_id'],
    },
  ],
});

module.exports = User;
