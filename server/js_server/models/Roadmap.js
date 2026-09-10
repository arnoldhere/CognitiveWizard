/**
 * Roadmap.js
 * ==========
 * Represents a Roadmap specialization 1:1 linked with WizardContent.
 *
 * Structural outline:
 *  - Roadmap title & description
 *  - Modules with sections inside each module
 *  - Outcomes & prerequisites
 *  - Visual graph data for diagram rendering
 *  - Associated common references via Resource & ResourceLink
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Roadmap = sequelize.define('Roadmap', {
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
  learning_style: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  total_modules: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  total_duration: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  modules_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Structured modules containing nested sections, tasks, and durations',
  },
  prerequisites: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  outcomes: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  graph_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Nodes, edges, and positions for visual roadmap rendering',
  },
}, {
  tableName: 'wizard_roadmaps',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_roadmaps_content_id',
      unique: true,
      fields: ['content_id'],
    },
  ],
});

module.exports = Roadmap;
