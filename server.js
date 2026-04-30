'use strict';

require('dotenv').config();

const app = require('./src/app');
const sequelize = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('  MySQL connected successfully.');

    // Sync all models (creates tables if they don't exist, non-destructive)
    await sequelize.sync({ alter: false });
    console.log('  Database synced.');

    app.listen(PORT, () => {
      console.log(`  RevUp API running on http://localhost:${PORT}`);
      console.log(`  Swagger docs at  http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error('  Failed to start server:', err.message || err);
    process.exit(1);
  }
};

start();
