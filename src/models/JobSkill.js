'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Pivot table: Job <-> Skill (M:N)
const JobSkill = sequelize.define('JobSkill', {
  job_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  skill_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
}, {
  tableName: 'job_skills',
  timestamps: false,
});

module.exports = JobSkill;
