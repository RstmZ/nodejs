const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const PaymentLimit = sequelize.define('PaymentLimit', {
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    paymentResultId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    currentEmails: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    currentCampaigns: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    currentDocuments: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }, 
    startPeriod: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('NOW()')
    },
    endPeriod: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('NOW()')
    },
})

module.exports = { PaymentLimit };