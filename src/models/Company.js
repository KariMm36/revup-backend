'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  logo: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING(300),
    allowNull: true,
    validate: { isUrl: true },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  recruiter_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true, // One company per recruiter
  },
}, {
  tableName: 'companies',
  timestamps: true,
});

module.exports = Company;
