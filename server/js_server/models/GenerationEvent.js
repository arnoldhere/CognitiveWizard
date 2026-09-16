/**
 * GenerationEvent.js
 * ==================
 * Records granular real-time progress events for a generation job.
 * Used for live WebSocket / polling progress displays in the frontend UI.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const GenerationEvent = sequelize.define('GenerationEvent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  generation_job_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'wizard_generation_jobs',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  event_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'queued, started, planning, researching, generating, reviewing, validating, saving, completed, retrying, degraded, failed',
  },
  stage: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Current pipeline stage identifier',
  },
  progress: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Progress percentage (0-100)',
  },
  user_message: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Human-readable, encouraging status message for the learner/tutor',
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Optional event metadata or partial artifact summary',
  },
}, {
  tableName: 'wizard_generation_events',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      name: 'idx_ge_job_id',
      fields: ['generation_job_id'],
    },
    {
      name: 'idx_ge_event_type',
      fields: ['event_type'],
    },
    {
      name: 'idx_ge_created_at',
      fields: ['created_at'],
    },
  ],
});

module.exports = GenerationEvent;
