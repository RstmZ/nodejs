const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const Subject = sequelize.define('Subject', {
  subjectText: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  timestamps: false,
  // indexes: [{
  //   unique: true,
  //   using: 'BTREE',
  //   fields: ['email'],
  // }],
});

module.exports = { Subject };
