const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const TestAccount = sequelize.define('TestAccount', {
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    isVerification: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: true,
    },
    isLimits: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: true,
    },
    isPay: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: true,
    }
}, {
    createdAt: true,
    updatedAt: false
})

module.exports = { TestAccount };