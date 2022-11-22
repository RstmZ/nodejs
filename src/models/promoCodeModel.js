const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const PromoCode = sequelize.define('PromoCode', {
    promoCode: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('NOW()')
    },
}, {
    createdAt: false,
    updatedAt: false
})

module.exports = { PromoCode };