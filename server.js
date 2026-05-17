'use strict';

require('dotenv').config();

const app = require('./src/app');
const sequelize = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    
    // Auto-create/alter tables for new columns and models
    const { User, Experience, Education, Certification } = require('./src/models');
    await User.sync({ alter: true });        // adds new 'phone' column safely
    await Experience.sync();
    await Education.sync();
    await Certification.sync();

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
