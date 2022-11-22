const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const ContactStatus = sequelize.define('ContactStatus', {
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  updatedAt: false,
  createdAt: false,
  // indexes: [{
  //   unique: true,
  //   using: 'BTREE',
  //   fields: ['email'],
  // }],
});

module.exports = { ContactStatus };
