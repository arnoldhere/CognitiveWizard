/**
 * ContentMetadata.js
 * ===================
 * Extensible, normalized key-value metadata store per WizardContent.
 * Stores tags, SEO metadata, generation statistics, LLM token metrics, etc.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ContentMetadata = sequelize.define('ContentMetadata', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  wizard_content_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'wizard_contents',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  meta_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'e.g. "tags", "target_audience", "prompt_tokens", "completion_tokens", "generation_model"',
  },
  meta_value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  meta_type: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'array'),
    allowNull: false,
    defaultValue: 'string',
  },
}, {
  tableName: 'wizard_content_metadata',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_cm_content_key',
      unique: true,
      fields: ['wizard_content_id', 'meta_key'],
    },
    {
      name: 'idx_cm_meta_key',
      fields: ['meta_key'],
    },
  ],
});

module.exports = ContentMetadata;
