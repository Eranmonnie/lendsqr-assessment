import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';

const startServer = async () => {
  try {
    const server = app.listen(env.port, () => {
      logger.info(`Swagger docs available at ${env.productionUrl}/api-docs`);
    });

    // Graceful Shutdown
    const exitHandler = () => {
      if (server) {
        server.close(() => {
          logger.info('Server closed');
          process.exit(1);
        });
      } else {
        process.exit(1);
      }
    };

    const unexpectedErrorHandler = (error: Error) => {
      logger.error(`Unexpected Error: ${error.message}`);
      exitHandler();
    };

    process.on('uncaughtException', unexpectedErrorHandler);
    process.on('unhandledRejection', unexpectedErrorHandler);

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received');
      if (server) {
        server.close();
      }
    });
  } catch (error) {
    logger.error('Failed to start the server:', error);
    process.exit(1);
  }
};

startServer();
