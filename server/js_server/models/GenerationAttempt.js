/**
 * GenerationAttempt.js
 * ====================
 * Records each discrete stage/node execution attempt for a generation job.
 * Enables granular attempt diagnostics, latency measurement, and retry auditing.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const GenerationAttempt = sequelize.define('GenerationAttempt', {
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
  stage: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'e.g. planner, research, writer, reviewer, quality_gate',
  },
  attempt_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  status: {
    type: DataTypes.ENUM('started', 'succeeded', 'failed', 'retrying'),
    allowNull: false,
    defaultValue: 'started',
  },
  provider: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  model: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  error_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Normalized error name: RateLimitError, TransientProviderError, etc.',
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  duration_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Execution latency in milliseconds',
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'wizard_generation_attempts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_ga_job_id',
      fields: ['generation_job_id'],
    },
    {
      name: 'idx_ga_stage',
      fields: ['stage'],
    },
    {
      name: 'idx_ga_status',
      fields: ['status'],
    },
  ],
});

module.exports = GenerationAttempt;
