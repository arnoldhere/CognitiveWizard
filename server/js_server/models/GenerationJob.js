const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const WizardContent = require('./WizardContent');

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
      model: WizardContent,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  status: {
    type: DataTypes.ENUM('queued', 'running', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'queued',
  },
  current_stage: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  error_details: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  thread_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  }
}, {
  tableName: 'generation_jobs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Associations
WizardContent.hasOne(GenerationJob, { foreignKey: 'wizard_content_id', as: 'generation_job' });
GenerationJob.belongsTo(WizardContent, { foreignKey: 'wizard_content_id', as: 'wizard_content' });

module.exports = GenerationJob;
