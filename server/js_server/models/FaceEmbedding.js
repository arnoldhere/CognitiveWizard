const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FaceEmbedding = sequelize.define('FaceEmbedding', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    index: true
  },
  vector_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    index: true
  }
}, {
  tableName: 'face_embeddings',
  timestamps: false,
});

module.exports = FaceEmbedding;
