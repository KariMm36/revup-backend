'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  job_type: {
    type: DataTypes.ENUM('Full-time', 'Part-time', 'Contract', 'Internship', 'Remote', 'Hybrid'),
    allowNull: false,
    defaultValue: 'Full-time',
  },
  salary_range: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('open', 'closed'),
    allowNull: false,
    defaultValue: 'open',
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'jobs',
  timestamps: true,
});

module.exports = Job;
