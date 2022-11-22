const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const UserTeamMember = sequelize.define('UserTeamMember', {
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    // values: ['Admin', 'Moderator', 'Viewer'],
    defaultValue: 'Viewer',
    allowNull: false,
  },
}, {
  timestamps: false,
  // indexes: [{
  //   using: 'BTREE',
  //   fields: ['campaignId'],
  // }],
});

module.exports = { UserTeamMember };
