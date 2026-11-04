import { expect, test } from '@playwright/test';
import { label, signIn, text } from './helpers';

test.describe('Observability', () => {
  test('actions and data views land in the audit log', async ({ page }) => {
    await signIn(page, 'student');
    await page.getByRole('tab', { name: 'Me' }).click();
    await page.getByRole('switch', { name: 'Upcoming tests' }).click();
    await page.goto('/diagnostics');
    await expect(page.getByRole('heading', { name: 'Diagnostics' })).toBeVisible();
    await expect(text(page, /audit\/auth\.sign_in/).first()).toBeVisible();
    await expect(text(page, /audit\/sharing\.update/).first()).toBeVisible();
    await expect(text(page, /nav\/screen\.view/).first()).toBeVisible();
    await expect(text(page, /metric\/app\.ready_ms/).first()).toBeVisible();
  });

  test('no console errors across a full session', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await signIn(page, 'student');
    for (const tab of ['Quests', 'Focus', 'Me', 'Burrow']) {
      await page.getByRole('tab', { name: tab }).click();
      if (tab === 'Focus') await page.getByRole('button', { name: 'Back to quests' }).click();
    }
    expect(errors).toEqual([]);
  });

  test('reset demo data returns to a clean start', async ({ page }) => {
    await signIn(page, 'student');
    await text(page, 'Check in', { exact: true }).click();
    await page.getByRole('radio', { name: '1, Light' }).click();
    await page.getByRole('button', { name: 'Plan a light night' }).click();
    await page.goto('/diagnostics');
    await page.getByRole('button', { name: 'Reset demo data' }).click();
    await expect(text(page, 'Who’s signing in?')).toBeVisible();
    await text(page, 'I’m a student').click();
    await expect(label(page, '124 acorns')).toBeVisible();
  });
});
