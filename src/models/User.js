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
    unique: true,
  },
  github_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  },
  bio: {
    type: DataTypes.TEXT,
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
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
