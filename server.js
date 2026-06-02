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

    // Sync each table individually so one failure doesn't crash the whole server
    const models = { User, RefreshToken, Experience, Education, Certification, Interview, InterviewSchedule };
    for (const [name, model] of Object.entries(models)) {
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
