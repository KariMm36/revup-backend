'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Interview = sequelize.define('Interview', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  seeker_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  track: {
    type: DataTypes.ENUM('Frontend', 'Backend', 'AI Engineering', 'Data Engineering'),
    allowNull: false,
  },
  // pending → submitted → passed / failed
  status: {
    type: DataTypes.ENUM('pending', 'submitted', 'passed', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  // Full question object from AI: { mcq_questions: [...], written_questions: [...] }
  questions: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  // Seeker's MCQ answers: { "1": "option text", "2": "option text" }
  mcq_answers: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  // Seeker's written answers: { "0": "answer text", "1": "answer text" }
  written_answers: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  // Full grading report from AI: { mcq_grades, written_grades, cheating_report }
  report: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  // Computed overall score (0–100) — null until submitted
  total_score: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
}, {
  tableName: 'interviews',
  timestamps: true,
});

module.exports = Interview;
