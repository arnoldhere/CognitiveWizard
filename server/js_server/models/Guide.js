/**
 * Guide.js
 * ========
 * Represents a Guide specialization 1:1 linked with WizardContent.
 *
 * Structural outline:
 *  - Guide title, summary & description
 *  - Modules & sections inside each module (focused on mastery of topics)
 *  - Tools required, tips, reading time
 *  - Full compiled markdown body
 *  - Associated common references via Resource & ResourceLink
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Guide = sequelize.define('Guide', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  content_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'wizard_contents',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  guide_style: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Step-by-step tutorial, Conceptual overview, Quick reference, etc.',
  },
  reading_time_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  total_modules: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  tools_required: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  modules_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Structured modules and sections guiding learner to master topics',
  },
  body_markdown: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
}, {
  tableName: 'wizard_guides',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_guides_content_id',
      unique: true,
      fields: ['content_id'],
    },
  ],
});

module.exports = Guide;
