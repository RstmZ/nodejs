const { DataTypes } = require('sequelize');
const { sequelize } = require('../databaseConnection');
const { Contact } = require('./contactModel');
const { Subject } = require('./subjectModel');

const ContactToSubjects = sequelize.define('ContactToSubjects', {
  ContactId: {
    type: DataTypes.INTEGER,
    // references: {
    //   model: Contact,
    //   key: 'id',
    // },
  },
  SubjectId: {
    type: DataTypes.INTEGER,
    references: {
      model: Subject,
      key: 'id',
    },
  },
  ownerId: {
    type: DataTypes.INTEGER,
  },
}, {
  timestamps: false,
});

module.exports = { ContactToSubjects };
