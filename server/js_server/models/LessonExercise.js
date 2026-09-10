/**
 * LessonExercise.js
 * =================
 * Practice tasks attached to a lesson. Supports multiple exercise types:
 * coding, calculation, case_study, analysis, reflection, quiz_seed.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LessonExercise = sequelize.define('LessonExercise', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  lesson_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'wizard_lessons',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
  exercise_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'reflection',
    comment: 'coding, calculation, case_study, analysis, reflection, quiz_seed',
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    allowNull: false,
    defaultValue: 'medium',
  },
  starter_code: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Boilerplate starter code for coding exercises',
  },
  language: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'python',
  },
  solution_hint: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  expected_output: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  rubric_or_criteria: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Grading rubric or evaluation criteria',
  },
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'wizard_lesson_exercises',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_le_lesson_sequence',
      fields: ['lesson_id', 'sequence'],
    },
    {
      name: 'idx_le_type',
      fields: ['exercise_type'],
    },
  ],
});

module.exports = LessonExercise;
