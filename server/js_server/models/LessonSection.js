/**
 * LessonSection.js
 * ================
 * A typed content block within a lesson.
 * Sequenced to create a pedagogically structured reading.
 *
 * section_type values:
 *  - explanation        → Core concept explanation (prose)
 *  - example            → Worked example with context
 *  - analogy            → Real-world analogy to aid understanding
 *  - code               → Code snippet (language field set)
 *  - practice           → Guided practice prompt / mini-exercise
 *  - visual_description → Description of a diagram/chart
 *  - common_mistakes    → Pitfalls and how to avoid them
 *  - summary            → End-of-lesson recap
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LessonSection = sequelize.define('LessonSection', {
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
    defaultValue: 'explanation',
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  body: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
  language: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Programming language for code blocks (e.g., python, javascript, sql)',
  },
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'wizard_lesson_sections',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_ls_lesson_sequence',
      fields: ['lesson_id', 'sequence'],
    },
    {
      name: 'idx_ls_type',
      fields: ['section_type'],
    },
  ],
});

module.exports = LessonSection;
