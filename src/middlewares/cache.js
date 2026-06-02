'use strict';

const redis = require('../config/redis');
const logger = require('../config/logger');

/**
 * Redis cache middleware
 * Usage: router.get('/jobs', cache(300), controller.getJobs)
 * @param {number} ttl - Time to live in seconds
 */
const cache = (ttl = 60) => async (req, res, next) => {
  // Skip cache if Redis is not configured
  if (!redis) return next();

  const key = `cache:${req.originalUrl}`;

  try {
    const cached = await redis.get(key);
    if (cached) {
      logger.info(`[Cache] HIT — ${req.originalUrl}`);
      return res.json(JSON.parse(cached));
    }

    // Intercept res.json to save the response to Redis
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      if (res.statusCode === 200) {
        await redis.setex(key, ttl, JSON.stringify(data));
        logger.info(`[Cache] SET — ${req.originalUrl} (TTL: ${ttl}s)`);
      }
      return originalJson(data);
    };

    next();
  } catch (err) {
    logger.warn(`[Cache] Error — falling through to DB: ${err.message}`);
    next();
  }
};

/**
 * Invalidate a cache key or pattern
 * Usage: invalidateCache('/api/jobs*')
 */
const invalidateCache = async (pattern) => {
  if (!redis) return;
  try {
    const keys = await redis.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`[Cache] Invalidated ${keys.length} key(s) matching: ${pattern}`);
    }
  } catch (err) {
    logger.warn(`[Cache] Invalidation error: ${err.message}`);
  }
};

module.exports = { cache, invalidateCache };
