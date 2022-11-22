const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const Signature = sequelize.define('Signature', {
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fromEmail: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  domainId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  signatureId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  confirmed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  DKIMVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  SPFVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
});

module.exports = { Signature };
