const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Grade = sequelize.define('Grade', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  quiz_topic: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  difficulty: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  total_questions: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  correct_answers: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  score_percentage: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  result: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
  },
  pass_threshold: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 60.0,
  },
  time_limit_seconds: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 480,
  },
  time_taken: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  question_set: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  answer_key: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  user_answers: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  feedback: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  tableName: 'grades',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Grade;
