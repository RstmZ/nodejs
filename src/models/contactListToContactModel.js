const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');
const { ContactList } = require('./contactListModel');
const { Contact } = require('./contactModel');

const ContactListToContact = sequelize.define('ContactListToContact', {
  ContactListId: {
    type: DataTypes.INTEGER,
    references: {
      model: ContactList,
      key: 'id',
    },
  },
  ContactId: {
    type: DataTypes.INTEGER,
    references: {
      model: Contact,
      key: 'id',
    },
  },

}, {
  timestamps: false,
});

module.exports = { ContactListToContact };
