const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');
 
const PaymentCard = sequelize.define('PaymentCard', {
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    card: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastFourCard: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cardholdersName: {
        type: DataTypes.STRING,
        allowNull: true
    },
}, {
    updatedAt: false,
})

module.exports = { PaymentCard };
