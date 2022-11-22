const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const Notification = sequelize.define('Notification', {
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING,
    // values: ['campaign', 'payment', 'update'],
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subtitle: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  text: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  additionalData: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  updatedAt: false,
  // indexes: [{
  //   unique: true,
  //   using: 'BTREE',
  //   fields: ['email'],
  // }],
});

module.exports = { Notification };
