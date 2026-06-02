'use strict';

require('dotenv').config();

const app = require('./src/app');
const sequelize = require('./src/config/db');
const logger = require('./src/config/logger');
// Initialize email queue worker (starts listening for jobs)
require('./src/queues/emailQueue');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    
    const {
      User, RefreshToken, Experience, Education, Certification,
      Interview, InterviewSchedule,
    } = require('./src/models');

    await User.sync({ alter: true });
    await RefreshToken.sync({ alter: true });
    await Experience.sync({ alter: true });
    await Education.sync({ alter: true });
    await Certification.sync({ alter: true });
    await Interview.sync({ alter: true });
    await InterviewSchedule.sync({ alter: true });

    app.listen(PORT, () => {
      logger.info(`\n    RevUp API is live`);
      logger.info(`    http://localhost:${PORT}`);
      logger.info(`    http://localhost:${PORT}/api-docs\n`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err.message || err);
    process.exit(1);
  }
};

start();
