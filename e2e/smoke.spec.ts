import { expect, test } from '@playwright/test';
import { checkMobile, snap } from './helpers';

test('new user: subject → assignment → session → progress', async ({ page }) => {
  await page.goto('./');
  await snap(page, 'landing');
  await page.getByRole('link', { name: 'Open my week' }).click();
  await expect(page.getByText('Start by adding a subject')).toBeVisible();
  await page.getByRole('link', { name: 'Add a subject' }).click();
  await page.getByLabel('Subject name').fill('Microeconomics');
  await page.getByRole('button', { name: 'Add subject' }).click();
  await expect(page.getByText('Added Microeconomics')).toBeVisible();

  await page.getByRole('link', { name: 'Assignments' }).click();
  await page.getByLabel('Title').fill('Market structures essay');
  await page.getByRole('button', { name: 'Add assignment' }).click();
  await expect(page.getByText('Market structures essay').first()).toBeVisible();

  await page.getByRole('link', { name: 'Week' }).click();
  await page.getByLabel('Assignment (optional)').selectOption({ label: 'Market structures essay' });
  await page.getByLabel('Start time').fill('17:00');
  await page.getByRole('button', { name: 'Add session' }).click();
  await expect(page.getByText(/Session added/)).toBeVisible();
  await expect(page.getByText('17:00–18:00')).toBeVisible();
  await page.getByRole('button', { name: 'Add session' }).click();
  await expect(page.getByText('Overlaps another session at 17:00.')).toBeVisible();

  await page.reload();
  await expect(page.getByText('17:00–18:00')).toBeVisible();
  await page.getByRole('link', { name: 'Assignments' }).click();
  await page.getByLabel('Mark “Market structures essay” complete').check();
  await expect(page.getByText('1 of 1 complete')).toBeVisible();
  await page.getByRole('link', { name: 'Week' }).click();
  await expect(page.getByTestId('overall')).toHaveText('100%');
  await snap(page, 'week');
  await checkMobile(page);
});
