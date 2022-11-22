const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const PaymentInfo = sequelize.define('PaymentInfo', {
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    priceId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    methodPayment: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('NOW()')
    },
})

module.exports = { PaymentInfo };