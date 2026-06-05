'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: true, // null for OAuth-only users
  },
  role: {
    type: DataTypes.ENUM('seeker', 'recruiter', 'admin', 'pending'),
    allowNull: false,
    defaultValue: 'seeker',
  },
  google_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    // unique index removed — MySQL 64-key limit; uniqueness enforced at app level
  },
  github_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    // unique index removed — MySQL 64-key limit; uniqueness enforced at app level
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  profile_pic: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  resume_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  reset_token_expiry: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended'),
    allowNull: false,
    defaultValue: 'active',
  },
  token_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  // ── Multi-recruiter support ──────────────────────────────────────────────────
  // A recruiter is assigned to a company by the company owner.
  // Null for seekers and admins.
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
