const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const GenerationJob = require('./GenerationJob');

const GenerationCheckpoint = sequelize.define('GenerationCheckpoint', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  job_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: GenerationJob,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  stage: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  node: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('completed', 'failed', 'skipped'),
    allowNull: false,
  }
}, {
  tableName: 'generation_checkpoints',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['job_id', 'stage']
    }
  ]
});

// Associations
GenerationJob.hasMany(GenerationCheckpoint, { foreignKey: 'job_id', as: 'checkpoints' });
GenerationCheckpoint.belongsTo(GenerationJob, { foreignKey: 'job_id', as: 'job' });

module.exports = GenerationCheckpoint;
