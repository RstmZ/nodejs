const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');

const ContactNote = sequelize.define('ContactNote', {
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  textContent: {
    type: DataTypes.TEXT,
    allowNull: true,
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

// ContactNote.beforeDestroy((something) => {
//   console.log('AAAAAAAAAAAAAAAAAAAAA', something);
// });

module.exports = { ContactNote };
