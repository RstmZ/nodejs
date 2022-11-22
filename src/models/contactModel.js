const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const Contact = sequelize.define('Contact', {
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  avatar: {
    type: DataTypes.TEXT(3000),
    allowNull: true,
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  companyType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  jobRole: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  position: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  twitterUsername: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mobilePhoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  faxNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  workingLanguages: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    // values: ["Active", "Problem", "Dormant", "New", "Not Verified"], 
    defaultValue: 'Active',
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  aboutContact: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  contactOwnSubjects: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  uniqueVisitors: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  audienceReach: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  companyCity: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  aboutCompany: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  similarityIndex: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  countOfRecients: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  type:{
    type: DataTypes.STRING,
    defaultValue: 'Journalist'
  }
}, {
  updatedAt: false,
});

module.exports = { Contact };
