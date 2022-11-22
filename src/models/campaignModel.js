// const { CLIEngine } = require('eslint');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');
// const { User } = require('./userModel');

const Campaign = sequelize.define('Campaign', {
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  pitchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  campaignType: {
    type: DataTypes.STRING,
    // values: ['havePitch', 'oneForAll', 'individual'],
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    // values: ['Completed', 'Active', 'Unfinished'],
    defaultValue: 'Unfinished',
    allowNull: true,
  },
  title: {
    type: DataTypes.STRING,
    defaultValue: 'Campaign title',
    allowNull: true,
  },
  campaignDescription: {
    type: DataTypes.STRING,
    defaultValue: 'Campaign description',
    allowNull: true,
  },
  sender: {
    type: DataTypes.STRING,
    defaultValue: 'Sender name',
    allowNull: true,
  },
  senderEmail: {
    type: DataTypes.STRING,
    defaultValue: 'Sender email',
    allowNull: true,
  },
  picture: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  step: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: true,
  },
  sheduleTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  arweaveUrl: {
    type: DataTypes.STRING, 
    allowNull: true,
  },
  nft: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  },
  videoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  videoPitch: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  },
  emailResponseAnalysis: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: true,
  },
  boostOpenRate: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: true,
  },
  duplicateWhatsApp: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  },
  template: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  },
  shedule: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  },
  useTimeZone: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  },
  hour: {
    type: DataTypes.INTEGER, 
    allowNull: true,
  },
  minute: {
    type: DataTypes.INTEGER, 
    allowNull: true,
  },
  year: {
    type: DataTypes.INTEGER, 
    allowNull: true,
  },
  month: {
    type: DataTypes.INTEGER, 
    allowNull: true,
  },
  day: {
    type: DataTypes.INTEGER, 
    allowNull: true,
  },
  successSendEmails: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  },
  sendCopy: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: true,
  },
  boolAltEmailService: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  }
  
}, {
  updatedAt: false,
  indexes: [{
    using: 'BTREE',
    fields: ['ownerId'],
  }],
});

module.exports = { Campaign };
