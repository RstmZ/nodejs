'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.addColumn(
      'Files',
      'tonality',
      {
        type: Sequelize.DataTypes.STRING,
        defaultValue: 'neutral',
        allowNull: false,
      },
    );
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Files', 'tonality');
  },
};
