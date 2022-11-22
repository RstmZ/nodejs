const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const BalanceHistory = sequelize.define('BalanceHistory', {
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    historyId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    amount: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    source: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        // defaultValue: sequelize.literal('NOW()')
    },
}, {
    createdAt: false,
    updatedAt: false,
})

module.exports = { BalanceHistory };
