const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const SessionUser = sequelize.define('SessionUser', {
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    dateLogin: {
        type: DataTypes.DATE, 
        allowNull: false
    },
    dateLogout: {
        type: DataTypes.DATE,
        allowNull: true
    },
    duration: {
        type: DataTypes.FLOAT,
        allowNull: true
    }
}, {
    createdAt: true,
    updatedAt: false
})

module.exports = { SessionUser };