const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const ErrorMessage = sequelize.define('ErrorMessage', {
    user: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    message: {
        type: DataTypes.STRING(3000),
        allowNull: false,
      },
}, {
    createdAt: true,
    updatedAt: false
})

module.exports = { ErrorMessage };