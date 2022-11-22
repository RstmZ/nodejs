const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const Profile = sequelize.define('Profile', {
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  countUsers: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  countSizes: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  countEmails: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10000
  },
  countCampaigns: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  countDocuments: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 20
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  darkMode: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  timeZone: {
    type: DataTypes.STRING,
    defaultValue: '-04:00 America/New York',
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING,
    defaultValue: 'Unated States',
    allowNull: false,
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: 'English',
    allowNull: false,
  },
  paymentReminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  productUpdates: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  tipsInspiration: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },   
  successPromoCodeForLife: {
    type: DataTypes.BOOLEAN, 
    defaultValue: false,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: sequelize.literal('NOW()')
  },
}, {
  createdAt: false,
  updatedAt: false
});

module.exports = { Profile };
