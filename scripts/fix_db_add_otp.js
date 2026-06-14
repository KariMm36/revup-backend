require('dotenv').config();
const sequelize = require('../src/config/db');

(async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    
    console.log('Adding 2FA columns to users table...');
    await sequelize.query('ALTER TABLE users ADD COLUMN otp_code VARCHAR(255) DEFAULT NULL;');
    await sequelize.query('ALTER TABLE users ADD COLUMN otp_expiry DATETIME DEFAULT NULL;');
    
    console.log('✅ Successfully added otp_code and otp_expiry columns to the users table!');
  } catch (err) {
    if (err.message.includes('Duplicate column name')) {
      console.log('✅ Columns already exist in the database. You are good to go!');
    } else {
      console.error('❌ Error adding columns:', err.message);
    }
  } finally {
    process.exit(0);
  }
})();
