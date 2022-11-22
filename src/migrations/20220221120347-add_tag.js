'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.addColumn(
      'MailingSessions',
      'tag',
      {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
    );
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('MailingSessions', 'tag');
  }
};
