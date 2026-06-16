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
      Interview, InterviewSchedule, Application, Job,
    } = require('./src/models');

    // Manually add OTP columns to 'users' table to bypass Sequelize 'alter:true' index issues
    try {
      await sequelize.query('ALTER TABLE users ADD COLUMN otp_code VARCHAR(255) DEFAULT NULL, ADD COLUMN otp_expiry DATETIME DEFAULT NULL;');
      logger.info('[DB] Added OTP columns to users table successfully.');
    } catch (err) {
      // It will throw an error if the columns already exist, which is perfectly fine.
      logger.info('[DB] OTP columns already exist or manual alter failed safely.');
    }

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
    const alterModels = { RefreshToken, Experience, Education, Certification, Interview, Application, Job };
    
    // Clean up orphaned interviews before syncing to prevent foreign key constraint errors
    try {
      await sequelize.query('DELETE FROM interviews WHERE job_id NOT IN (SELECT id FROM jobs)');
      logger.info('[DB] Orphaned interviews cleaned up successfully.');
    } catch (err) {
      logger.warn(`[DB] Failed to clean up orphaned interviews: ${err.message}`);
    }

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
