require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  logFormat: process.env.LOG_FORMAT || (process.env.NODE_ENV === 'production' ? 'combined' : 'dev'),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'easecommerce',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'yourpassword',
  },

  couriers: {
    urbanebolt: {
      baseUrl: process.env.URBANEBOLT_BASE_URL || 'https://uat.urbanebolt.in',
      username: process.env.URBANEBOLT_USERNAME || '',
      password: process.env.URBANEBOLT_PASSWORD || '',
      customerCode: process.env.URBANEBOLT_CUSTOMER_CODE || '',
      timeout: parseInt(process.env.URBANEBOLT_TIMEOUT || '10000', 10),
      maxRetries: parseInt(process.env.URBANEBOLT_MAX_RETRIES || '3', 10),
      retryDelay: parseInt(process.env.URBANEBOLT_RETRY_DELAY || '1000', 10),
    },
  },

  bulk: {
    concurrency: parseInt(process.env.BULK_CONCURRENCY || '10', 10),
  },
};

module.exports = config;
