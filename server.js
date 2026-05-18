'use strict';

require('dotenv').config();

const app = require('./src/app');
const sequelize = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    
    const {
      User, Experience, Education, Certification,
      Interview, InterviewSchedule,
    } = require('./src/models');

    await User.sync({ alter: true });
    await Experience.sync({ alter: true });
    await Education.sync({ alter: true });
    await Certification.sync({ alter: true });
    await Interview.sync({ alter: true });
    await InterviewSchedule.sync({ alter: true });

    app.listen(PORT, () => {
      console.log('\n    RevUp API is live');
      console.log(`    http://localhost:${PORT}`);
      console.log(`    http://localhost:${PORT}/api-docs\n`);
    });
  } catch (err) {
    console.error('    Failed to start server:', err.message || err);
    process.exit(1);
  }
};

start();
