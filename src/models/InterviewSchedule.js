'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InterviewSchedule = sequelize.define('InterviewSchedule', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  // The AI interview that was passed
  interview_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // The seeker being scheduled
  seeker_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // The recruiter who scheduled it
  // allowNull: true — required for onDelete: 'SET NULL' FK (MySQL errno 150 otherwise)
  recruiter_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // When is the real interview?
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  // Where / how is the interview?
  location: {
    type: DataTypes.STRING(500),
    allowNull: true, // e.g. "Google Meet link", "Office Room 3", "Zoom: ..."
  },
  // Any notes for the seeker
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // pending → confirmed → cancelled → completed
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed'),
    allowNull: false,
    defaultValue: 'pending',
  },
}, {
  tableName: 'interview_schedules',
  timestamps: true,
});

module.exports = InterviewSchedule;
