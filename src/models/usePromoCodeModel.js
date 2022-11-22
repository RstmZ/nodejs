const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const UsePromoCode = sequelize.define('UsePromoCode', {
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    promoCodeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    success: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
    
}, {
    updatedAt: false,
})

module.exports = { UsePromoCode };