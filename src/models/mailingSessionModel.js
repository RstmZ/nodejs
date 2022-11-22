const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const MailingSession = sequelize.define('MailingSession', {
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  contentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  campaignId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tag: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: sequelize.literal('NOW()')
  },
}, {
  createdAt: false,
  updatedAt: false,
});

module.exports = { MailingSession };
