'use strict';

const logger = require('../config/logger');

/**
 * Request logger middleware
 * Logs method, URL, status code, and response time for every HTTP request
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error'
      : res.statusCode >= 400 ? 'warn'
      : 'http';

    logger.log(level, `${req.method} ${req.originalUrl} → ${res.statusCode} | ${duration}ms`);
  });

  next();
};

module.exports = requestLogger;
