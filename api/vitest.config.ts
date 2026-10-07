import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The first run downloads a MongoDB binary for mongodb-memory-server.
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/doctor-tracker-test',
      JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    },
  },
});
