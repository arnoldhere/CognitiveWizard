const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const WizardContent = require('./WizardContent');

const WizardModule = sequelize.define('WizardModule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  content_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: WizardContent,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  duration: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  details_json: {
    type: DataTypes.JSON,
    allowNull: true,
  }
}, {
  tableName: 'wizard_modules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

WizardContent.hasMany(WizardModule, { foreignKey: 'content_id', as: 'modules' });
WizardModule.belongsTo(WizardContent, { foreignKey: 'content_id', as: 'content' });

module.exports = WizardModule;
