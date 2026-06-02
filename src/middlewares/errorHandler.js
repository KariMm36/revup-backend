'use strict';

const logger = require('../config/logger');

/*
  Global Express error handler
  Handles Sequelize, JWT, Multer, and general errors with clean JSON responses
*/
const errorHandler = (err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}`, { stack: err.stack });

  // ─── Sequelize Unique Constraint ─────────────────────────────────────────
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'field';
    return res.status(409).json({
      success: false,
      message: `${field} already exists.`,
    });
  }

  // ─── Sequelize Validation Error ───────────────────────────────────────────
  if (err.name === 'SequelizeValidationError') {
    return res.status(422).json({
      success: false,
      message: 'Database validation failed.',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // ─── Sequelize Foreign Key Constraint ────────────────────────────────────
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference: related record does not exist.',
    });
  }

  // ─── JWT Errors ──────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired.' });
  }

  // ─── Multer Errors ───────────────────────────────────────────────────────
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
  }

  // ─── Custom App Errors ───────────────────────────────────────────────────
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // ─── Fallback 500 ────────────────────────────────────────────────────────
  return res.status(500).json({
    success: false,
    message: 'Internal server error. Please try again later.',
  });
};

module.exports = errorHandler;
