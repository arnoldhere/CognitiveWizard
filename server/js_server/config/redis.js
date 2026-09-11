const path = require('path');
if (!process.env.REDIS_URL) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}
const { createClient } = require('redis');
const logger = require('../utils/logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
  url: redisUrl
});

redisClient.on('error', (err) => logger.error('[Redis] Client Error:', err));
redisClient.on('connect', () => logger.info('[Redis] Successfully connected'));

async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('[Redis] Connection failed:', error);
  }
}

module.exports = {
  redisClient,
  connectRedis
};
