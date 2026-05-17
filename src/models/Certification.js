'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Certification = sequelize.define('Certification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  organization: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  year: {
    type: DataTypes.STRING(50),
    allowNull: true,
  }
}, {
  tableName: 'Certifications',
  timestamps: true,
});

module.exports = Certification;
