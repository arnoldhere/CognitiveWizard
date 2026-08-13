/**
 * CoursePhase.js
 * ==============
 * Represents a high-level learning phase within a generated Course/Syllabus.
 * Example: "Phase 1: Foundations", "Phase 2: Intermediate Concepts".
 *
 * Hierarchy: WizardContent → CoursePhase → CourseModule → CourseLesson
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const WizardContent = require('./WizardContent');

const CoursePhase = sequelize.define('CoursePhase', {
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

  /** Phase title, e.g. "Phase 1: Foundations" */
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },

  /** Brief description of what this phase covers */
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
  tableName: 'course_phases',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Associations
WizardContent.hasMany(CoursePhase, { foreignKey: 'content_id', as: 'phases' });
CoursePhase.belongsTo(WizardContent, { foreignKey: 'content_id', as: 'course' });

module.exports = CoursePhase;
