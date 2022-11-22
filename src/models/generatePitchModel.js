const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const GeneratePitch = sequelize.define('GeneratePitch', {
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    campaignId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    version5: {
        type: DataTypes.BOOLEAN
    },
    text: {
        type: DataTypes.STRING(2000),
        allowNull: false,
    }
}, {
    createdAt: true,
    updatedAt: false
});

module.exports = { GeneratePitch };