'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LessonProgress = sequelize.define('LessonProgress', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  lesson_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'lesson_progress',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['user_id', 'lesson_id'] },
  ],
});

module.exports = LessonProgress;
