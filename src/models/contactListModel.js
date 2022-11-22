const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const ContactList = sequelize.define('ContactList', {
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: sequelize.literal('NOW()')
  },
}, {
  createdAt: false,
  updatedAt: false,
  // indexes: [{
  //   unique: true,
  //   using: 'BTREE',
  //   fields: ['email'],
  // }],
});

module.exports = { ContactList };
