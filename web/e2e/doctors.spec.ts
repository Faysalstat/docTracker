import { expect, type Locator, type Page, test } from '@playwright/test';

const runId = Date.now().toString(36);

/** Picks an option in a Radix Select inside `scope` (options render in a portal on `page`). */
async function chooseOption(page: Page, scope: Locator, label: string, option: string) {
  await scope.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

const fieldError = (scope: Locator, text: string) =>
  scope.getByRole('alert').filter({ hasText: text });

/** Waits until the streamed list has rendered, so the page is hydrated and interactive. */
async function gotoDoctors(page: Page) {
  await page.goto('/doctors');
  await expect(page.getByText(/Showing \d|No doctors/).first()).toBeVisible();
}

async function addDoctor(page: Page, name: string, email: string) {
  await page.getByRole('button', { name: 'Add doctor' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add doctor' });
  await dialog.getByLabel('Full name').fill(name);
  await chooseOption(page, dialog, 'Specialization', 'Neurology');
  await dialog.getByLabel('Hospital').fill('E2E General');
  await dialog.getByLabel('Phone').fill('+1 555 0199');
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByRole('button', { name: 'Add doctor' }).click();
}

test.describe('doctors', () => {
  test('validates the form on the client before submitting', async ({ page }) => {
    await gotoDoctors(page);
    await page.getByRole('button', { name: 'Add doctor' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add doctor' });
    await dialog.getByRole('button', { name: 'Add doctor' }).click();

    await expect(fieldError(dialog, 'Select a specialization')).toBeVisible();
    await expect(fieldError(dialog, 'Enter a valid email address')).toBeVisible();
  });

  test('creates a doctor, finds it by search, and rejects a duplicate email', async ({ page }) => {
    const name = `Zz E2E Doctor ${runId}`;
    const email = `e2e-${runId}@example.com`;

    await gotoDoctors(page);
    await addDoctor(page, name, email);
    await expect(page.getByText('Doctor added')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.getByRole('searchbox', { name: /search/i }).fill(`zz e2e doctor ${runId}`);
    await expect(page).toHaveURL(new RegExp(`q=zz`));
    await expect(page.getByRole('link', { name, exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Showing 1–1 of 1 doctors/)).toBeVisible();

    // The URL is the state: a reload shows the same filtered result.
    await page.reload();
    await expect(page.getByRole('link', { name, exact: true }).first()).toBeVisible();

    await addDoctor(page, `${name} Copy`, email);
    await expect(
      fieldError(page.getByRole('dialog'), 'A doctor with this email already exists'),
    ).toBeVisible();
  });

  test('adds a patient under a doctor and deletes it', async ({ page }) => {
    const doctorName = `Zz E2E Care ${runId}`;
    await gotoDoctors(page);
    await addDoctor(page, doctorName, `e2e-care-${runId}@example.com`);
    await expect(page.getByText('Doctor added')).toBeVisible();

    await page.getByRole('searchbox', { name: /search/i }).fill(doctorName.toLowerCase());
    await page.getByRole('link', { name: doctorName, exact: true }).first().click();
    await expect(page.getByRole('heading', { name: doctorName })).toBeVisible();
    await expect(page.getByText('No patients yet')).toBeVisible();

    const patientName = `Pat E2E ${runId}`;
    await page.getByRole('button', { name: 'Add patient' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add patient' });
    await dialog.getByLabel('Full name').fill(patientName);
    await dialog.getByLabel('Age').fill('42');
    await chooseOption(page, dialog, 'Gender', 'Female');
    await dialog.getByLabel('Phone').fill('+1 555 0142');
    await chooseOption(page, dialog, 'Condition', 'Asthma');
    await dialog.getByRole('button', { name: 'Add patient' }).click();

    await expect(page.getByText('Patient added')).toBeVisible();
    const row = page.getByRole('row', { name: new RegExp(patientName) });
    await expect(row).toBeVisible();
    await expect(row.getByText('Asthma')).toBeVisible();

    await row.getByRole('button', { name: `Delete ${patientName}` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Patient deleted')).toBeVisible();
    await expect(page.getByText('No patients yet')).toBeVisible();
  });

  test('shows the not-found page for an unknown doctor', async ({ page }) => {
    await page.goto('/doctors/64b7f0f0f0f0f0f0f0f0f0f0');
    await expect(page.getByRole('heading', { name: 'Doctor not found' })).toBeVisible();
  });
});
