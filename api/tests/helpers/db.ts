import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

/** Starts an in-memory MongoDB for the current test file and clears it between tests. */
export function useTestDatabase() {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterEach(async () => {
    const collections = await mongoose.connection.db?.collections();
    await Promise.all(collections?.map((c) => c.deleteMany({})) ?? []);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });
}
