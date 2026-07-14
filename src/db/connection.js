const { Sequelize } = require('sequelize');
const appConfig = require('../config/app.config');
const { logger } = require('../utils/logger.utils');

const sequelize = new Sequelize(
  appConfig.db.name,
  appConfig.db.user,
  appConfig.db.password,
  {
    host: appConfig.db.host,
    port: appConfig.db.port,
    dialect: 'postgres',
    logging: (sql) => {
      if (appConfig.env === 'development') {
        logger.info('[DB]', sql);
      }
    },
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: appConfig.db.ssl ? { rejectUnauthorized: false } : false,
    },
  }
);

const connectDB = async () => {
  await sequelize.authenticate();
  logger.info('Database connection established');
};

module.exports = { sequelize, connectDB };
