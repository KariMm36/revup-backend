'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Experience = sequelize.define('Experience', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  company: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  duration: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'Experiences',
  timestamps: true,
});

module.exports = Experience;
