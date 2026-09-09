/**
 * CourseChapter.js
 * ================
 * Represents a high-level learning chapter within a generated Course/Syllabus.
 * Example: "Chapter 1: Foundations", "Chapter 2: Intermediate Concepts".
 *
 * Hierarchy: WizardContent → CourseChapter → CourseModule → CourseLesson
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const WizardContent = require('./WizardContent');

const CourseChapter = sequelize.define('CourseChapter', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  /** FK to the parent WizardContent (course) */
  content_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: WizardContent, key: 'id' },
    onDelete: 'CASCADE',
  },

  /** Chapter title, e.g. "Chapter 1: Foundations" */
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },

  /** Brief description of what this chapter covers */
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  /** Display order within the course (1-indexed) */
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },

  /** e.g. "3 weeks", "8 hours" */
  estimated_duration: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName: 'course_chapters',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Associations
WizardContent.hasMany(CourseChapter, { foreignKey: 'content_id', as: 'chapters' });
CourseChapter.belongsTo(WizardContent, { foreignKey: 'content_id', as: 'course' });

module.exports = CourseChapter;
