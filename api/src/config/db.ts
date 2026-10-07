import mongoose from 'mongoose';
import { env, isProduction } from './env.js';
import { logger } from './logger.js';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<void> {
  // Index builds are explicit in production (seed / migration), automatic elsewhere.
  await mongoose.connect(uri, {
    autoIndex: !isProduction,
    serverSelectionTimeoutMS: 10_000,
  });
  logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
