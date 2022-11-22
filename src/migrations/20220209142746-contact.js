'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction((t) => {
      return Promise.all([
        queryInterface.addColumn('Contacts', 'state', {
          type: Sequelize.DataTypes.STRING
        }, { transaction: t }),
        queryInterface.addColumn('Contacts', 'uniqueVisitors', {
          type: Sequelize.DataTypes.INTEGER,
        }, { transaction: t }),
        queryInterface.addColumn('Contacts', 'audienceReach', {
          type: Sequelize.DataTypes.INTEGER
        }, { transaction: t }),
        queryInterface.addColumn('Contacts', 'companyCity', {
          type: Sequelize.DataTypes.STRING
        }, { transaction: t }),
        queryInterface.addColumn('Contacts', 'website', {
          type: Sequelize.DataTypes.STRING
        }, { transaction: t }),
        queryInterface.addColumn('Contacts', 'aboutCompany', {
          type: Sequelize.DataTypes.TEXT
        }, { transaction: t })
      ]);
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction((t) => {
      return Promise.all([
        queryInterface.removeColumn('Contacts', 'state', { transaction: t }),
        queryInterface.removeColumn('Contacts', 'uniqueVisitors', { transaction: t }),
        queryInterface.removeColumn('Contacts', 'audienceReach', { transaction: t }),
        queryInterface.removeColumn('Contacts', 'companyCity', { transaction: t }),
        queryInterface.removeColumn('Contacts', 'website', { transaction: t }),
        queryInterface.removeColumn('Contacts', 'aboutCompany', { transaction: t })
      ]);
    });
  },
};
