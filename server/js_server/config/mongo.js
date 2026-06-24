const mongoose = require('mongoose');
const logger = require('../utils/logger');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB_NAME || 'cognitive_wizard_db';

async function connectMongo() {
  try {
    // connect to the specific dbName by appending it to the uri if needed
    const connectionUri = mongoUri.endsWith('/') ? `${mongoUri}${dbName}` : `${mongoUri}/${dbName}`;
    await mongoose.connect(connectionUri);
    logger.info('[DB] Successfully connected to MongoDB via Mongoose');
  } catch (error) {
    logger.error('[DB] Unable to connect to MongoDB:', error);
  }
}

module.exports = {
  connectMongo,
  mongoose
};
