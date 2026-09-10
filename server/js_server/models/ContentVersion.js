/**
 * ContentVersion.js
 * =================
 * Versioning snapshots and audit log for WizardContent.
 * Records revisions on generation, user modifications, and publishing.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ContentVersion = sequelize.define('ContentVersion', {
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
  version_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  change_summary: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'e.g. "Initial AI generation", "Tutor feedback revision", "Published"',
  },
  snapshot_data: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Full serialized content tree snapshot at this revision',
  },
  created_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'SET NULL',
  },
  is_current: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'wizard_content_versions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_cv_content_version',
      unique: true,
      fields: ['wizard_content_id', 'version_number'],
    },
    {
      name: 'idx_cv_is_current',
      fields: ['wizard_content_id', 'is_current'],
    },
  ],
});

module.exports = ContentVersion;
