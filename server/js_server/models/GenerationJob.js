/**
 * GenerationJob.js
 * =================
 * Tracks background AI generation jobs, execution lifecycle,
 * stage progression, retry counts, and resumable state checkpoints.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const GenerationJob = sequelize.define('GenerationJob', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  wizard_content_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'wizard_contents',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  thread_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'queued',
      'running',
      'resuming',
      'completed',
      'failed',
      'cancelled',
      'degraded'
    ),
    allowNull: false,
    defaultValue: 'queued',
  },
  current_stage: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  stage_progress_percent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Progress percentage (0-100)',
  },
  total_steps: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  completed_steps: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  input_payload: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  checkpoint_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Serialized node checkpoint state for resilient resumption',
  },
  error_details: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  user_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User-friendly error/status message for frontend display',
  },
  retry_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  max_retries: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'wizard_generation_jobs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_gj_thread_id',
      unique: true,
      fields: ['thread_id'],
    },
    {
      name: 'idx_gj_content_id',
      fields: ['wizard_content_id'],
    },
    {
      name: 'idx_gj_status',
      fields: ['status'],
    },
  ],
});

module.exports = GenerationJob;
