const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const PaymentResult = sequelize.define('PaymentResult', {
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    intent: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    state: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    success: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
    paymentMethodId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    paymentId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    total: {
        type: DataTypes.STRING
    },
    discount: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('NOW()')
    },
    current_period_end: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('NOW()')
    },
    profileId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
})

module.exports = { PaymentResult };