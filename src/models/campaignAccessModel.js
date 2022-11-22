const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');
// const { Campaign } = require('./campaignModel');
// const { User } = require('./userModel');

const CampaignAccess = sequelize.define('CampaignAccess', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  campaignId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM,
    values: ['Admin', 'Moderator'],
    defaultValue: 'Moderator',
    allowNull: true,
  },
}, {
  timestamps: false,
  // indexes: [{
  //   using: 'BTREE',
  //   fields: ['campaignId'],
  // }],
});

module.exports = { CampaignAccess };
