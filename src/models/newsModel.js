const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const News = sequelize.define('News', {
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    campaignId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING(2000),
        allowNull: false
    },
    url: {
        type: DataTypes.STRING(1000),
        allowNull: false
    },
    previewContent: {
        type: DataTypes.STRING(2000),
        allowNull: false
    },
}, {
    createdAt: true,
    updatedAt: false
})

module.exports = { News };