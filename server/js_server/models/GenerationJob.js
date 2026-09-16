/**
 * GenerationJob.js
 * =================
 * Tracks background AI generation jobs, execution lifecycle,
 * stage progression, retry counts, and resumable state checkpoints
 * across all content types (Course, Roadmap, Guide).
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
  content_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'course',
    comment: 'course, roadmap, or guide',
  },
  generation_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Increments on breaking graph version upgrades to isolate old checkpoints',
  },
  graph_version: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: '1.0',
    comment: 'Semantic version of the underlying LangGraph pipeline',
  },
  checkpoint_thread_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Stable checkpointer thread ID in MySQLSaver / LanggraphCheckpoints',
  },
  provider: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Primary LLM provider used (e.g. groq, huggingface, openai)',
  },
  model: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Primary model name used for generation',
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
  last_error: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Technical message of most recent non-fatal or fatal error',
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
    {
      name: 'idx_gj_content_type',
      fields: ['content_type'],
    },
  ],
});

module.exports = GenerationJob;
