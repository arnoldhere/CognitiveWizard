/**
 * LessonSection.js
 * ================
 * A typed content block within a lesson. Each lesson has multiple sections
 * of different types, sequenced to create a pedagogically structured reading.
 *
 * section_type values:
 *  - explanation        → Core concept explanation (prose)
 *  - example            → Worked example with context
 *  - analogy            → Real-world analogy to aid understanding
 *  - code               → Code snippet (language field set)
 *  - practice           → Guided practice prompt / mini-exercise
 *  - visual_description → Description of a diagram/chart (for future image gen)
 *  - common_mistakes    → Pitfalls and how to avoid them
 *  - summary            → End-of-lesson recap
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const CourseLesson = require('./CourseLesson');

const LessonSection = sequelize.define('LessonSection', {
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

  /**
   * Content type of this section block.
   * Drives how the frontend renders it (prose vs code block vs analogy card, etc.)
   */
  section_type: {
    type: DataTypes.ENUM(
      'explanation',
      'example',
      'analogy',
      'code',
      'practice',
      'visual_description',
      'common_mistakes',
      'summary'
    ),
    allowNull: false,
  },

  /** Optional section heading, e.g. "Real-world Analogy: Filing Cabinet" */
  title: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },

  /**
   * Main content body. Uses LONGTEXT to safely store:
   *  - Multi-paragraph prose
   *  - Code with indentation
   *  - Markdown-formatted lists
   */
  body: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },

  /**
   * Programming language for code sections.
   * Examples: "python", "javascript", "sql", "bash"
   * NULL for non-code sections.
   */
  language: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },

  /** Display order within the lesson */
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'lesson_sections',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Associations
CourseLesson.hasMany(LessonSection, { foreignKey: 'lesson_id', as: 'sections' });
LessonSection.belongsTo(CourseLesson, { foreignKey: 'lesson_id', as: 'lesson' });

module.exports = LessonSection;
