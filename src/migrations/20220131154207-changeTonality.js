'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.changeColumn(
      'Files',
      'tonality',
      {
        type: Sequelize.DataTypes.STRING,
        defaultValue: 'respectful',
        allowNull: false,
      },
    );
  },

  down: async (queryInterface, Sequelize) => {
    queryInterface.changeColumn(
      'Files',
      'tonality',
      {
        type: Sequelize.DataTypes.STRING,
        defaultValue: 'neutral',
        allowNull: false,
      },
    );
  },
};
