/**
 * Lesson.js
 * =========
 * The atomic content unit inside a CourseSection.
 * Each lesson represents a cohesive learning unit with content blocks (LessonSection)
 * and practice exercises (LessonExercise).
 *
 * Hierarchy:
 *   CourseSection (1:N) → Lesson (1:N) → LessonSection / LessonExercise
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Lesson = sequelize.define('Lesson', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  section_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'wizard_course_sections',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  overview: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Short 2-4 sentence overview shown before the full content sections',
  },
  learning_objectives: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  estimated_time: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'e.g., "20 minutes"',
  },
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  status: {
    type: DataTypes.ENUM('draft', 'reviewed', 'published'),
    allowNull: false,
    defaultValue: 'draft',
  },
}, {
  tableName: 'wizard_lessons',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_lessons_section_sequence',
      fields: ['section_id', 'sequence'],
    },
    {
      name: 'idx_lessons_status',
      fields: ['status'],
    },
  ],
});

module.exports = Lesson;
