const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const OnBoard = sequelize.define('OnBoard', {
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
    }, 
    forService: {
        type: DataTypes.STRING,
        // values: ['Study', 'Work', 'Social Networks', 'Other Projects'],
        allowNull: true,
    },
    primary: {
        type: DataTypes.STRING,
        // values: ['Communications', 'Customer Support', 'Engineering', 'HR and recruting', 'IT', 'Marketing', 'Owner or company leadership', 'Sales', 'Other'],
        allowNull: true,
    },
    companySize: {
        type: DataTypes.STRING,
        // values: ['Just me', '2-20 employees', '21-50 employees', '51-100 employees', '101-250 employees', '251-750 employees', '751-2500 employees', '25000+ employees'],
        allowNull: true
    },
    role: {
        type: DataTypes.STRING,
        // values: ['Intern', 'Team member', 'Manager', 'CEO', 'Other'],
        allowNull: true
    },
    option: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true
    }

})

module.exports = { OnBoard };