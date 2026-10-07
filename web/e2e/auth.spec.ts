import { expect, test } from '@playwright/test';

test.describe('authentication', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects anonymous users to the login page', async ({ page }) => {
    await page.goto('/doctors');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('shows a generic error for wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@doctortracker.dev');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });
});
