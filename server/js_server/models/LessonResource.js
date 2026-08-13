/**
 * LessonResource.js
 * =================
 * Curated learning references attached to a SPECIFIC LESSON (not course-level).
 * Moving references to lesson-level makes them contextually relevant and
 * far more useful than a generic course-level dump.
 *
 * resource_type values:
 *  - official_docs  → Language/framework documentation
 *  - youtube        → Video tutorial
 *  - article        → Blog post, Medium article, etc.
 *  - research_paper → arXiv, IEEE, etc.
 *  - course         → Coursera, Udemy, edX, etc.
 *  - practice       → LeetCode, HackerRank, etc.
 *  - tool           → Interactive tool / playground
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const CourseLesson = require('./CourseLesson');
const WizardContent = require('./WizardContent');

const LessonResource = sequelize.define('LessonResource', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  /** FK to parent lesson */
  lesson_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: CourseLesson, key: 'id' },
    onDelete: 'CASCADE',
  },

  /** FK to root course for cross-course queries */
  content_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: WizardContent, key: 'id' },
    onDelete: 'CASCADE',
  },

  /** Resource title */
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },

  /** Full URL of the resource */
  url: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  /** Resource category */
  resource_type: {
    type: DataTypes.ENUM(
      'official_docs',
      'youtube',
      'article',
      'research_paper',
      'course',
      'practice',
      'tool',
      'other'
    ),
    allowNull: false,
    defaultValue: 'other',
  },

  /** Platform/provider, e.g. "YouTube", "MDN", "arXiv" */
  source: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  /** Short description or snippet of the resource content */
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  /**
   * Semantic relevance score (0.0 – 1.0).
   * Computed by compute_resource_score() in the research agent.
   */
  relevance_score: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0.0,
  },

  /**
   * JSON array of specific concepts within the lesson this resource supports.
   * Example: ["variable assignment", "object references"]
   * Allows granular citation mapping for pedagogical review.
   */
  supports: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
}, {
  tableName: 'lesson_resources',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Associations
CourseLesson.hasMany(LessonResource, { foreignKey: 'lesson_id', as: 'resources' });
LessonResource.belongsTo(CourseLesson, { foreignKey: 'lesson_id', as: 'lesson' });

WizardContent.hasMany(LessonResource, { foreignKey: 'content_id', as: 'lesson_resources' });
LessonResource.belongsTo(WizardContent, { foreignKey: 'content_id', as: 'course' });

module.exports = LessonResource;
