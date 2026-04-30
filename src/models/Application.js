'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Application = sequelize.define('Application', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  job_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  seeker_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  resume_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  cover_letter: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('applied', 'shortlisted', 'rejected', 'hired'),
    allowNull: false,
    defaultValue: 'applied',
  },
}, {
  tableName: 'applications',
  timestamps: true,
  // Prevent duplicate applications
  indexes: [
    {
      unique: true,
      fields: ['job_id', 'seeker_id'],
    },
  ],
});

module.exports = Application;
