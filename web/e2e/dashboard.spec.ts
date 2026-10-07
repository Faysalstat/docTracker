import { expect, type Page, test } from '@playwright/test';

async function gotoDashboard(page: Page, query = '') {
  await page.goto(`/dashboard${query}`);
  // Charts are client-rendered after their data streams in.
  await expect(page.locator('.recharts-surface')).toHaveCount(3, { timeout: 20_000 });
}

test.describe('dashboard', () => {
  test('shows KPIs and charts, each with an accessible data table', async ({ page }) => {
    await gotoDashboard(page);

    for (const label of ['Total doctors', 'Total patients', 'Currently in care']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    for (const caption of ['Admissions per', 'Patients per doctor', 'Patients by condition']) {
      await expect(page.getByRole('table', { name: new RegExp(caption) })).toBeAttached();
    }
  });

  test('the date range scopes every widget and lives in the URL', async ({ page }) => {
    await gotoDashboard(page);

    await page.getByRole('combobox', { name: 'Date range' }).click();
    await page.getByRole('option', { name: 'Last 30 days' }).click();

    await expect(page).toHaveURL(/range=30d/);
    await expect(page.getByText('Admissions · last 30 days')).toBeVisible();
    await expect(page.getByText(/Patients admitted per day · last 30 days/)).toBeVisible();
    await expect(
      page.getByText(/Top \d+ doctors by admitted patients · last 30 days/),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Date range' })).toHaveText('Last 30 days');
  });

  test('clicking a doctor bar opens that doctor', async ({ page }) => {
    await gotoDashboard(page);
    const topDoctorsChart = page.locator('[data-slot="card"]', { hasText: 'Patients per doctor' });

    await topDoctorsChart.locator('.recharts-bar-rectangle').first().click();
    await expect(page).toHaveURL(/\/doctors\/[a-f\d]{24}$/);
  });
});
