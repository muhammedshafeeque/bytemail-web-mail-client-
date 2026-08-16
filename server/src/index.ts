import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { connectMongoDB } from './config/mongodb';
import { connectWildduck } from './config/wildduck';
import { connectRedis } from './config/redis';
import { initSocket } from './socket/socket';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  await connectMongoDB();
  await connectWildduck();
  await connectRedis();

  const httpServer = createServer(app);
  initSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`ByteMail server running on port ${env.PORT}`, {
      env: env.NODE_ENV,
      port: env.PORT,
    });
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

bootstrap();
