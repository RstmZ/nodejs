const { Sequelize } = require('sequelize');
const logger = require('./winston');
require('dotenv').config();

const {
  DB_NAME, DB_HOST, DB_USER, DB_PASS,
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  dialect: 'postgres',
  pool: {
    acquire: 600000,
  },
  logging: false
});

(async () => {
  try {
    await sequelize.authenticate();
  } catch (err) {
    console.error(err.message);
    logger.info(new Error('Database connection error.').stack);
  }
  // await sequelize.sync();
})();

// { force: true }
module.exports = { sequelize };
