const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LLMConfig = sequelize.define('LLMConfig', {
  task_name: {
    type: DataTypes.STRING(50),
    primaryKey: true,
  },
  temperature: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.5,
  },
  max_new_tokens: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 512,
  },
  top_p: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  top_k: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  model_override: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  use_chat: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'llm_configs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = LLMConfig;
