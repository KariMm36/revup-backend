'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Pivot table: User <-> Job (Saved/Bookmarked Jobs)
const SavedJob = sequelize.define('SavedJob', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  job_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
}, {
  tableName: 'saved_jobs',
  timestamps: true,
  updatedAt: false,
});

module.exports = SavedJob;
