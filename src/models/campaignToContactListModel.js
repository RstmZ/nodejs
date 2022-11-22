// const { CLIEngine } = require('eslint');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');
const { Campaign } = require('./campaignModel');
const { ContactList } = require('./contactListModel');

const CampaignToContactList = sequelize.define('CampaignToContactList', {
  CampaignId: {
    type: DataTypes.INTEGER,
    references: {
      model: Campaign,
      key: 'id',
    },
  },
  ContactListId: {
    type: DataTypes.INTEGER,
    references: {
      model: ContactList,
      key: 'id',
    },
  },

}, {
  timestamps: false,
});

module.exports = { CampaignToContactList };
