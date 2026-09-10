/**
 * ResourceLink.js
 * ===============
 * Normalized URL and endpoint storage for educational resources.
 * Allows a Resource to have primary URLs, mirrors, code repos, papers, etc.
 * Includes automated link verification and status tracking fields.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ResourceLink = sequelize.define('ResourceLink', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  resource_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'wizard_resources',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  link_type: {
    type: DataTypes.ENUM('primary', 'mirror', 'github', 'docs', 'video', 'pdf', 'demo', 'other'),
    allowNull: false,
    defaultValue: 'primary',
  },
  label: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Display text for the link e.g. "View Source on GitHub"',
  },
  domain: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Normalized domain for grouping/metrics e.g. "github.com"',
  },
  is_broken: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  last_checked_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'wizard_resource_links',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_rl_resource_id',
      fields: ['resource_id'],
    },
    {
      name: 'idx_rl_domain',
      fields: ['domain'],
    },
  ],
});

module.exports = ResourceLink;
