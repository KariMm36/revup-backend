'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');


const UserSkill = sequelize.define('UserSkill', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  skill_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
}, {
  tableName: 'user_skills',
  timestamps: false,
});

module.exports = UserSkill;
