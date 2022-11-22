'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.createTable('Signatures', {
      id: {
        type: Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ownerId: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      fromEmail: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      domain: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      domainId: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
      },
      signatureId: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
      },
      confirmed: {
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      DKIMVerified: {
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      SPFVerified: {
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Signatures');
  }
};
