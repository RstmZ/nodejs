const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const InvitationToken = sequelize.define('InvitationToken', {
  token: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: sequelize.literal('NOW()')
  },
}, {
});

module.exports = { InvitationToken };