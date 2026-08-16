import mongoose, { Connection } from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

let connection: Connection | null = null;

export async function connectWildduck(): Promise<Connection> {
  if (connection && connection.readyState === 1) return connection;

  connection = mongoose.createConnection(env.WILDDUCK_MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  });

  await connection.asPromise();
  logger.info('WildDuck MongoDB connected');

  connection.on('error', (err) => {
    logger.error('WildDuck MongoDB error', { error: err.message });
  });

  connection.on('disconnected', () => {
    logger.warn('WildDuck MongoDB disconnected');
  });

  return connection;
}

export function getWildduckConnection(): Connection {
  if (!connection || connection.readyState !== 1) {
    throw new Error('WildDuck MongoDB is not connected');
  }
  return connection;
}

export function getWildduckDb() {
  const db = getWildduckConnection().db;
  if (!db) throw new Error('WildDuck database handle missing');
  return db;
}
