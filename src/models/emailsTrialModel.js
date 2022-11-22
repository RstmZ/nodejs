const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const EmailsTrial = sequelize.define('EmailsTrial', {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    success: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
}, {
    createdAt: true,
    updatedAt: false
})

module.exports = { EmailsTrial };