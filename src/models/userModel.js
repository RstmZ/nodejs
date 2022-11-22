const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  }, 
  picture: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subscriptionIsActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  customerId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subscriptionId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  organization: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  typeSignUp: {
    type: DataTypes.STRING,
    defaultValue: 'Simple',
    allowNull: true,
  },
  success: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  }, 
  isMenu: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  }, 
  isTrial: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  }, 
  profileId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  showDocument: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  },
  showCampaign: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  }
}, {
  updatedAt: false,
  indexes: [{
    unique: true,
    using: 'BTREE',
    fields: ['email'],
  }],
});

module.exports = { User };
