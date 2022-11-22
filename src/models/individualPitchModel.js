const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const IndividualPitch = sequelize.define('IndividualPitch', {
  ownerId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pitchId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  contactId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: false,
  // indexes: [{
  //   unique: true,
  //   using: 'BTREE',
  //   fields: ['email'],
  // }],
});

module.exports = { IndividualPitch };
