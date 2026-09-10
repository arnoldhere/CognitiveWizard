/**
 * Resource.js
 * ===========
 * Normalized educational resource catalog.
 * Polymorphically attachable to roadmap, guide, course, or lesson.
 *
 * Each Resource record holds descriptive/pedagogical metadata,
 * while one or more links/URLs are stored in ResourceLink.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Resource = sequelize.define('Resource', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  entity_type: {
    type: DataTypes.ENUM('roadmap', 'guide', 'course', 'lesson'),
    allowNull: false,
    comment: 'The entity type this resource belongs to',
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'The ID of the parent roadmap, guide, course, or lesson',
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  resource_type: {
    type: DataTypes.ENUM(
      'official_docs',
      'youtube',
      'article',
      'research_paper',
      'course',
      'practice',
      'tool',
      'book',
      'other'
    ),
    allowNull: false,
    defaultValue: 'other',
  },
  provider: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'e.g. YouTube, MDN, arXiv, GitHub, Coursera',
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  thumbnail_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  author: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  language: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: 'en',
  },
  relevance_score: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0.0,
  },
  authority_score: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0.0,
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'wizard_resources',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_res_entity',
      fields: ['entity_type', 'entity_id'],
    },
    {
      name: 'idx_res_type',
      fields: ['resource_type'],
    },
  ],
});

module.exports = Resource;
