const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');
// const { Campaign } = require('./campaignModel');
// const { File } = require('./fileModel');

const Pitch = sequelize.define('Pitch', {
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  pitchTitle: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pitchTextPreview: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pitchText: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  preliminaryStory: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  preliminaryStoryOriginalId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  keyStory: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  keyStoryOriginalId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: sequelize.literal('NOW()')
  },
  score: {
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  subjects: {
    type: DataTypes.STRING(5000),
    allowNull: true
  }, 
  contentNews: {
    type: DataTypes.STRING(40000),
    allowNull: true,
  }
}, {
  createdAt: false,
  updatedAt: false,
  // indexes: [{
  //   using: 'BTREE',
  //   fields: ['ownerId'],
  // }],
});

module.exports = { Pitch };
