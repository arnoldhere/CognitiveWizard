const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const dbUri = process.env.DATABASE_URL;
const connectionString = dbUri.replace('mysql+pymysql://', 'mysql://');
// const connectionString = 'mysql://root:root@localhost:3306/cognitive_wizard';
const sequelize = new Sequelize(connectionString, {
  dialect: 'mysql',
  logging: msg => logger.debug(`[Sequelize] ${msg}`),
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

async function connectMySQL() {
  try {
    await sequelize.authenticate();
    logger.info('[DB] Successfully connected to MySQL via Sequelize');
  } catch (error) {
    console.log(connectionString);
    logger.error('[DB] Unable to connect to MySQL:', error);
  }
}

module.exports = {
  sequelize,
  connectMySQL
};