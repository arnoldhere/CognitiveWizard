/**
 * Course.js
 * =========
 * Represents a Course / Syllabus specialization 1:1 linked with WizardContent.
 *
 * Hierarchy:
 *   WizardContent (1:1) → Course (1:N) → CourseSection (1:N) → Lesson (1:N) → LessonSection / LessonExercise
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Course = sequelize.define('Course', {
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
  domain: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'general',
    comment: 'computer_science, natural_sciences, engineering, business_finance, humanities, medicine, general',
  },
  domain_label: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'General',
  },
  exercise_paradigm: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'mixed',
    comment: 'coding, calculation, case_study, analysis, reflection, mixed',
  },
  target_audience: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: 'General Learners',
  },
  course_outcomes: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  prerequisites: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  total_sections: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  total_lessons: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  total_exercises: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'wizard_courses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_courses_content_id',
      unique: true,
      fields: ['content_id'],
    },
    {
      name: 'idx_courses_domain',
      fields: ['domain'],
    },
  ],
});

module.exports = Course;
