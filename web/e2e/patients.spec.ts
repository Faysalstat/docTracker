import { readFileSync } from 'node:fs';
import { expect, type Locator, type Page, test } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1';
const runId = Date.now().toString(36);

/** The session cookie holds the API JWT, so tests can arrange data through the API directly. */
function sessionToken() {
  const state = JSON.parse(readFileSync('e2e/.auth/admin.json', 'utf8')) as {
    cookies: { name: string; value: string }[];
  };
  const token = state.cookies.find((cookie) => cookie.name === 'session')?.value;
  if (!token) throw new Error('No session cookie in storage state');
  return token;
}

async function chooseOption(page: Page, scope: Locator, label: string, option: string) {
  await scope.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test.describe('patients', () => {
  const doctorName = `Aa E2E Patients Doc ${runId}`;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_URL}/doctors`, {
      headers: { Authorization: `Bearer ${sessionToken()}` },
      data: {
        name: doctorName,
        specialization: 'Pediatrics',
        hospital: 'E2E Children’s',
        phone: '+1 555 0177',
        email: `e2e-patients-${runId}@example.com`,
      },
    });
    expect(res.status()).toBe(201);
  });

  test('creates, filters, edits and deletes a patient', async ({ page }) => {
    const patientName = `Pat Flow ${runId}`;
    await page.goto('/patients');
    await expect(page.getByText(/Showing \d|No patients/).first()).toBeVisible();

    // Create with a doctor picked in the form.
    await page.getByRole('button', { name: 'Add patient' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add patient' });
    await dialog.getByLabel('Full name').fill(patientName);
    await dialog.getByLabel('Age').fill('7');
    await chooseOption(page, dialog, 'Gender', 'Male');
    await dialog.getByLabel('Phone').fill('+1 555 0107');
    await chooseOption(page, dialog, 'Condition', 'Respiratory');
    await chooseOption(page, dialog, 'Doctor', doctorName);
    await dialog.getByRole('button', { name: 'Add patient' }).click();
    await expect(page.getByText('Patient added')).toBeVisible();

    // Filter by doctor and condition: the URL holds the state.
    const filters = page.locator('main');
    await chooseOption(page, filters, 'Doctor', doctorName);
    await expect(page).toHaveURL(/doctorId=[a-f\d]{24}/);
    await chooseOption(page, filters, 'Condition', 'Respiratory');
    await expect(page).toHaveURL(/condition=respiratory/);

    const row = page.getByRole('row', { name: new RegExp(patientName) });
    await expect(row).toBeVisible();
    await expect(row.getByRole('link', { name: doctorName })).toBeVisible();
    await expect(page.getByText(/Showing 1–1 of 1 patients/)).toBeVisible();

    // Edit the status.
    await row.getByRole('button', { name: `Edit ${patientName}` }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit patient' });
    await chooseOption(page, editDialog, 'Status', 'Recovered');
    await editDialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Patient updated')).toBeVisible();
    await expect(row.getByText('Recovered')).toBeVisible();

    // Delete: the row disappears.
    await row.getByRole('button', { name: `Delete ${patientName}` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Patient deleted')).toBeVisible();
    await expect(page.getByText('No patients match your filters')).toBeVisible();
  });

  test('requires a doctor when creating from the patients page', async ({ page }) => {
    await page.goto('/patients');
    await expect(page.getByText(/Showing \d|No patients/).first()).toBeVisible();
    await page.getByRole('button', { name: 'Add patient' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add patient' });
    await dialog.getByRole('button', { name: 'Add patient' }).click();

    await expect(dialog.getByRole('alert').filter({ hasText: 'Select a doctor' })).toBeVisible();
    await expect(dialog.getByRole('alert').filter({ hasText: 'Enter an age' })).toBeVisible();
  });
});
