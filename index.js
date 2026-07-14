const app = require('./src/app');
const appConfig = require('./src/config/app.config');
const { logger } = require('./src/utils/logger.utils');
const { connectDB } = require('./src/db/connection');

const startServer = async () => {
  await connectDB();

  const server = app.listen(appConfig.port, () => {
    logger.info(`App running in ${appConfig.env} mode at http://localhost:${appConfig.port}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down...`);
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  });
};

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
