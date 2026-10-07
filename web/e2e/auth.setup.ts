import { expect, test as setup } from '@playwright/test';

const STORAGE_STATE = 'e2e/.auth/admin.json';

setup('sign in as admin', async ({ page }) => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD');

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
  await page.context().storageState({ path: STORAGE_STATE });
});
