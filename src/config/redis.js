'use strict';

const Redis = require('ioredis');
const logger = require('./logger');

let redis = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  redis.on('connect', () => logger.info('[Redis] Connected successfully'));
  redis.on('error', (err) => logger.error(`[Redis] Connection error: ${err.message}`));
} else {
  logger.warn('[Redis] REDIS_URL not set — caching and real-time features are disabled');
}

module.exports = redis;
