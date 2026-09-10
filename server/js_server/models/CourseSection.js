/**
 * CourseSection.js
 * ================
 * High-level section / module within a Course.
 * Replaces the old two-layer (chapters + modules) hierarchy with a clean,
 * high-performance normalized section structure.
 *
 * Hierarchy:
 *   Course (1:N) → CourseSection (1:N) → Lesson
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CourseSection = sequelize.define('CourseSection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'wizard_courses',
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
  learning_objectives: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  key_takeaways: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    allowNull: false,
    defaultValue: 'beginner',
  },
  estimated_duration: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'e.g., "2 weeks", "4 hours"',
  },
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'wizard_course_sections',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_cs_course_sequence',
      fields: ['course_id', 'sequence'],
    },
  ],
});

module.exports = CourseSection;
