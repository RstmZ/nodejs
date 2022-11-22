module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => Promise.all(
    [
      queryInterface.addColumn(
        'Files',
        'writingStyle',
        {
          type: Sequelize.DataTypes.ENUM,
          values: ['press_release', 'work', 'school', 'blogs'],
          allowNull: true,
        },
        {
          transaction: t,
        },
      ),
      queryInterface.changeColumn(
        'Files',
        'tonality',
        {
          type: Sequelize.DataTypes.STRING,
          allowNull: true,
        }, {
          transaction: t,
        },
      ),
    ],
  )),

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('Files', 'writingStyle', { transaction: t }),
        queryInterface.changeColumn(
          'Files',
          'tonality',
          {
            type: Sequelize.DataTypes.STRING,
            defaultValue: 'respectful',
            allowNull: false,
          },
          { transaction: t },
        )
      ])
    })
  }
};
