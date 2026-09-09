/**
 * LanggraphCheckpoint Model
 *
 * Managed by Sequelize for table creation and schema synchronization,
 * but read/written by Python's MySQLSaver for LangGraph workflow state snapshots.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LanggraphCheckpoint = sequelize.define('LanggraphCheckpoint', {
  thread_id: {
    type: DataTypes.STRING(128),
    allowNull: false,
    primaryKey: true,
  },
  checkpoint_ns: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    primaryKey: true,
  },
  checkpoint_id: {
    type: DataTypes.STRING(128),
    allowNull: false,
    primaryKey: true,
  },
  parent_checkpoint_id: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  checkpoint: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'langgraph_checkpoints',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = LanggraphCheckpoint;
