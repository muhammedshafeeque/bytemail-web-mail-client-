import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export async function connectMongoDB(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    logger.info('MongoDB connected');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected, attempting reconnect...');
    });
  } catch (err) {
    const message = (err as Error).message;
    logger.error('MongoDB connection failed', { error: message });
    console.error(
      `MongoDB connection failed: ${message}\n` +
        `  URI host: ${new URL(env.MONGODB_URI.replace(/^mongodb(\+srv)?:\/\//, 'http://')).hostname}\n` +
        '  Ensure MongoDB is running (e.g. docker compose up -d mongodb) and MONGODB_URI is correct.',
    );
    process.exit(1);
  }
}
