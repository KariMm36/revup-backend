'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Course = sequelize.define('Course', {
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
  thumbnail: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  level: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    allowNull: false,
    defaultValue: 'beginner',
  },
  status: {
    type: DataTypes.ENUM('draft', 'published'),
    allowNull: false,
    defaultValue: 'draft',
  },
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'courses',
  timestamps: true,
});

module.exports = Course;
