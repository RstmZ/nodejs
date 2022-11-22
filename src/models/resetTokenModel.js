const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const ResetToken = sequelize.define('ResetToken', {
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  UserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  createdAt: true
});

module.exports = { ResetToken };
