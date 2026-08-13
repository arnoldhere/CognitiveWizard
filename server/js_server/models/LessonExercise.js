/**
 * LessonExercise.js
 * =================
 * Practice tasks attached to a lesson. Supports multiple exercise types
 * to give learners hands-on experience beyond passive reading.
 *
 * exercise_type values:
 *  - coding      → Write/complete code (rendered in CodeSandbox)
 *  - reflection  → Written reflection / short-answer question
 *  - quiz_seed   → Input for future quiz engine integration
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const CourseLesson = require('./CourseLesson');

const LessonExercise = sequelize.define('LessonExercise', {
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

  /** Exercise title, e.g. "Write a function to reverse a list" */
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },

  /**
   * Full exercise description / problem statement.
   * For coding: includes the task description and any starter code instructions.
   * For reflection: the question to answer.
   */
  description: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },

  /** Type of exercise — drives which UI component renders it */
  exercise_type: {
    type: DataTypes.ENUM('coding', 'reflection', 'quiz_seed'),
    allowNull: false,
    defaultValue: 'coding',
  },

  /** Difficulty relative to the lesson: easy / medium / hard */
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    allowNull: true,
    defaultValue: 'medium',
  },

  /**
   * Starter boilerplate code for coding exercises.
   * Rendered in the CodeSandbox as the initial editor content.
   * NULL for non-coding exercises.
   */
  starter_code: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },

  /**
   * Programming language for the code sandbox.
   * Examples: "python", "javascript", "sql"
   */
  language: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'python',
  },

  /**
   * Optional hint to unblock learners without giving away the answer.
   * Shown on demand ("Show hint" button).
   */
  solution_hint: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  /**
   * Optional model answer / expected output.
   * Shown only after learner submits or requests it.
   */
  expected_output: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  /** Display order within the lesson's exercises */
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'lesson_exercises',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Associations
CourseLesson.hasMany(LessonExercise, { foreignKey: 'lesson_id', as: 'exercises' });
LessonExercise.belongsTo(CourseLesson, { foreignKey: 'lesson_id', as: 'lesson' });

module.exports = LessonExercise;
