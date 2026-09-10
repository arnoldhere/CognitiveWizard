/**
 * WizardContent.js
 * ================
 * Common root and metadata entity for all AI Wizard content:
 * Courses, Roadmaps, and Guides.
 *
 * 1:1 specialization relationships:
 *   WizardContent ↔ Roadmap
 *   WizardContent ↔ Guide
 *   WizardContent ↔ Course
 *
 * Direct children:
 *   WizardContent → GenerationJob
 *   WizardContent → ContentVersion
 *   WizardContent → ContentMetadata
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

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
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  content_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Course/Syllabus, Roadmap, Guide',
  },
  topic: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  slug: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM(
      'draft',
      'queued',
      'generating',
      'pending_approval',
      'reviewed',
      'published',
      'archived',
      'error'
    ),
    allowNull: false,
    defaultValue: 'generating',
  },
  visibility: {
    type: DataTypes.ENUM('private', 'public', 'unlisted'),
    allowNull: false,
    defaultValue: 'private',
  },
  skill_level: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'all_levels'),
    allowNull: false,
    defaultValue: 'beginner',
  },
  estimated_duration: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  thumbnail_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  author_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  author_role: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  content: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Optional transient cache or legacy summary payload',
  },
}, {
  tableName: 'wizard_contents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_wc_status_created_id',
      fields: ['status', 'created_at', 'id'],
    },
    {
      name: 'idx_wc_status_type_created',
      fields: ['status', 'content_type', 'created_at', 'id'],
    },
    {
      name: 'idx_wc_user_created_id',
      fields: ['user_id', 'created_at', 'id'],
    },
    {
      name: 'idx_wc_slug',
      fields: ['slug'],
    },
    {
      name: 'idx_wc_topic',
      fields: ['topic'],
    },
  ],
});

module.exports = WizardContent;
