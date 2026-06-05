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
    type: DataTypes.ENUM('applied', 'under_review', 'shortlisted', 'rejected', 'hired'),
    allowNull: false,
    defaultValue: 'applied',
  },
  // Shown to seeker when rejected
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Internal HR notes — never exposed to seeker
  hr_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
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
