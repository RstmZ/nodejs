const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const MailingSessionResult = sequelize.define('MailingSessionResult', {
  mailingSessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  successfulResult: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  error: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  errorMessage: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  messageId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: sequelize.literal('NOW()')
  },
}, {
  updatedAt: false,
});

module.exports = { MailingSessionResult };
