const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const WizardContent = sequelize.define('WizardContent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  topic: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  content_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'generating', // generating, pending_approval, published, generated (legacy)
  },
  content: {
    type: DataTypes.JSON,
    allowNull: false,
  }
}, {
  tableName: 'wizard_contents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_wc_status_created_at_id',
      fields: ['status', 'created_at', 'id'],
    },
    {
      name: 'idx_wc_status_type_created',
      fields: ['status', 'content_type', 'created_at', 'id'],
    },
    {
      name: 'idx_wc_user_created_at',
      fields: ['user_id', 'created_at', 'id'],
    },
    {
      name: 'idx_wc_created_at_id',
      fields: ['created_at', 'id'],
    },
    {
      name: 'idx_wc_topic',
      fields: ['topic'],
    },
  ],
});

User.hasMany(WizardContent, { foreignKey: 'user_id', as: 'wizard_contents' });
WizardContent.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = WizardContent;
