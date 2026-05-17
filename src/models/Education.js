'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Education = sequelize.define('Education', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  degree: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  university: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  duration: {
    type: DataTypes.STRING(100),
    allowNull: true,
  }
}, {
  tableName: 'Educations',
  timestamps: true,
});

module.exports = Education;
