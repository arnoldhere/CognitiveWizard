/**
 * LanggraphWrite Model
 *
 * Managed by Sequelize for table creation and schema synchronization,
 * but read/written by Python's MySQLSaver for LangGraph pending intermediate writes.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LanggraphWrite = sequelize.define('LanggraphWrite', {
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
  task_id: {
    type: DataTypes.STRING(128),
    allowNull: false,
    primaryKey: true,
  },
  idx: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  channel: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  value: {
    type: DataTypes.BLOB('long'),
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'langgraph_writes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = LanggraphWrite;
