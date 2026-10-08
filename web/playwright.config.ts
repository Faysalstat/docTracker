import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig, devices } from '@playwright/test';

// Admin credentials come from api/.env (the same values `npm run seed` uses). Only these
// two keys are read: loading the whole file would leak PORT/NODE_ENV into the web server.
try {
  const apiEnv = parseEnv(readFileSync('../api/.env', 'utf8'));
  process.env.SEED_ADMIN_EMAIL ??= apiEnv.SEED_ADMIN_EMAIL;
  process.env.SEED_ADMIN_PASSWORD ??= apiEnv.SEED_ADMIN_PASSWORD;
} catch {
  // No api/.env: rely on the environment (e.g. CI secrets).
}

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // Specs share one real database and a single local server, so run them serially.
  workers: 1,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  // The first requests to a freshly started (cold) server can be slow, especially on Windows.
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  // Expects MongoDB (infra) to be up and the web app built (`npm run build -w web`).
  webServer: [
    {
      command: 'npm run dev -w api',
      cwd: '..',
      url: 'http://localhost:4000/api',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npm run start',
      url: `${BASE_URL}/login`,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
