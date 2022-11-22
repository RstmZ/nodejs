const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');
// const { Campaign } = require('./campaignModel');

const File = sequelize.define('File', {
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fileType: {
    type: DataTypes.ENUM,
    values: ['audio', 'note', 'document', 'userAvatar', 'campaignImage', 'contactAvatar', 'video'],
    allowNull: false,
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM,
    values: ['Completed', 'Draft', 'Failed'],
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  length: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  words: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  textTitle: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  recognizedTextPath: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  recognizedTextPreview: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileSource: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tonality: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'respectful'
  },
  writingStyle: {
    type: DataTypes.ENUM,
    values: ['press_release', 'work', 'school', 'blogs'],
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: sequelize.literal('NOW()')
  },
}, {
  createdAt: false,
  updatedAt: false,
  // indexes: [{
  //   using: 'BTREE',
  //   fields: ['campaignId'],
  // }],
});

module.exports = { File };
