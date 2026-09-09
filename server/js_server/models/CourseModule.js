/**
 * CourseModule.js
 * ===============
 * A module within a course chapter. Represents a coherent topic area
 * (e.g. "What is AI and ML?", "Linear Algebra Essentials").
 *
 * Hierarchy: CourseChapter → CourseModule → CourseLesson
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const WizardContent = require('./WizardContent');
const CourseChapter = require('./CourseChapter');

const CourseModule = sequelize.define('CourseModule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  /** FK to parent chapter */
  chapter_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: CourseChapter, key: 'id' },
    onDelete: 'CASCADE',
  },

  /** FK to root WizardContent for direct cross-course queries */
  content_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: WizardContent, key: 'id' },
    onDelete: 'CASCADE',
  },

  /** Module title, e.g. "What is AI and ML?" */
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },

  /** Short overview of the module */
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  /** JSON array of learning objectives, e.g. ["Understand supervised learning", "..."] */
  learning_objectives: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },

  /** JSON array of key takeaways learner gains from this module */
  key_takeaways: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },

  /** Difficulty level: beginner / intermediate / advanced */
  difficulty: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },

  /** Estimated time to complete, e.g. "2 hours" */
  estimated_time: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  /** Order within the chapter */
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'course_modules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Associations
CourseChapter.hasMany(CourseModule, { foreignKey: 'chapter_id', as: 'modules' });
CourseModule.belongsTo(CourseChapter, { foreignKey: 'chapter_id', as: 'chapter' });

WizardContent.hasMany(CourseModule, { foreignKey: 'content_id', as: 'course_modules' });
CourseModule.belongsTo(WizardContent, { foreignKey: 'content_id', as: 'course' });

module.exports = CourseModule;
