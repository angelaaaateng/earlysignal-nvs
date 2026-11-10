import { expect, test } from '@playwright/test';
import { signInDemo, tab, text } from './helpers';

test.describe('Observability', () => {
  test('actions land in the redacted audit log', async ({ page }) => {
    await signInDemo(page);
    await tab(page, 'Grow');
    await page.getByRole('button', { name: 'Nothing new' }).click();
    await page.goto('/diagnostics');
    await expect(page.getByRole('heading', { name: 'Diagnostics' })).toBeVisible();
    await expect(text(page, /audit\/auth\.sign_in/).first()).toBeVisible();
    await expect(text(page, /audit\/week\.review/).first()).toBeVisible();
    await expect(text(page, /nav\/screen\.view/).first()).toBeVisible();
    await expect(text(page, /metric\/app\.ready_ms/).first()).toBeVisible();
  });

  test('no console errors across a full session', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await signInDemo(page);
    for (const t of ['Week', 'Grow', 'Family', 'Home'] as const) await tab(page, t);
    expect(errors).toEqual([]);
  });

  test('reset demo data returns to a clean start', async ({ page }) => {
    await signInDemo(page);
    await tab(page, 'Week');
    await text(page, 'Fall dance').click();
    await page.getByRole('button', { name: 'Remove Fall dance' }).click();
    await page.goto('/diagnostics');
    await page.getByRole('button', { name: 'Reset demo data' }).click();
    await expect(page.getByRole('button', { name: 'Try the demo' })).toBeVisible();
    await signInDemo(page);
    await tab(page, 'Week');
    await expect(text(page, 'Fall dance')).toBeVisible();
  });
});
