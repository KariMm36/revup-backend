'use strict';

require('dotenv').config();

const app = require('./src/app');
const sequelize = require('./src/config/db');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info('[DB] Connected to database');

    const {
      User, RefreshToken, Experience, Education, Certification,
      Interview, InterviewSchedule,
    } = require('./src/models');

    // ── Sync strategy ────────────────────────────────────────────────────────
    // User: skip alter — table is stable and already has ~64 indexes in MySQL.
    //   Calling alter:true repeatedly causes "Too many keys" errors.
    // InterviewSchedule: use force:false (create-if-not-exists only) — avoids
    //   FK constraint errors when the table or its referenced tables already exist.
    // All others: alter:true for safe column additions on restart.

    // Models that should only be created if they don't already exist
    const createOnlyModels = { InterviewSchedule };
    for (const [name, model] of Object.entries(createOnlyModels)) {
      try {
        await model.sync({ force: false });
      } catch (syncErr) {
        logger.warn(`[DB] Could not sync ${name}: ${syncErr.message}`);
      }
    }

    // Models that get alter:true (but NOT User — too many indexes)
    const alterModels = { RefreshToken, Experience, Education, Certification, Interview };
    for (const [name, model] of Object.entries(alterModels)) {
      try {
        await model.sync({ alter: true });
      } catch (syncErr) {
        logger.warn(`[DB] Could not sync ${name}: ${syncErr.message}`);
      }
    }

    app.listen(PORT, () => {
      logger.info(`\n    RevUp API is live`);
      logger.info(`    http://localhost:${PORT}`);
      logger.info(`    http://localhost:${PORT}/api-docs\n`);
    });
  } catch (err) {
    logger.error('Failed to start server: ' + (err.stack || err.message || String(err)));
    process.exit(1);
  }
};

start();
