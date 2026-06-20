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

  // ─── v2 fields (new conversational API) ──────────────────────────────────────
  // The local Job this interview is for
  job_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // null on legacy v1 records
  },
  // The interview ID returned by the external AI API
  ai_interview_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // How many total questions the AI will ask (set at start)
  total_questions: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Accumulates per-answer results: [{ question_id, answer, score, feedback, ai_probability, time_taken_seconds }]
  answers: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },

  // ─── API version tag ─────────────────────────────────────────────────────────
  // 'v1' = legacy batch system, 'v2' = new conversational system
  api_version: {
    type: DataTypes.ENUM('v1', 'v2'),
    allowNull: false,
    defaultValue: 'v2',
  },

  // ─── Shared fields ───────────────────────────────────────────────────────────
  // pending → in_progress → completed → passed / failed
  status: {
    type: DataTypes.ENUM('pending', 'submitted', 'in_progress', 'completed', 'passed', 'failed'),
    allowNull: false,
    defaultValue: 'in_progress',
  },
  // Full grading report stored after interview completes
  report: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  // Computed overall score (0–100) — null until completed
  total_score: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },

}, {
  tableName: 'interviews',
  timestamps: true,
});

module.exports = Interview;
