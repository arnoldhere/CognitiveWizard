const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const WizardContent = sequelize.define('WizardContent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  topic: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  content_type: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'generated'
  },
  content: {
    type: DataTypes.JSON,
    allowNull: false
  }
}, {
  tableName: 'wizard_contents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = WizardContent;
