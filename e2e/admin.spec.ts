import { expect, test } from '@playwright/test';
import { pageText, signIn, text } from './helpers';

test.describe('Admin: partner dashboard (web)', () => {
  test('KPIs and the follow-up list come from opted-in families only', async ({ page }) => {
    await signIn(page, 'admin');
    await expect(text(page, 'Lincoln Middle School · Counselor view')).toBeVisible();
    await expect(text(page, 'Families enrolled')).toBeVisible();
    await expect(text(page, '48', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Needs follow-up (3)' })).toBeVisible();
    for (const p of ['Stress 4+ on most days for 3 weeks', 'Check-ins stopped 9 days ago', 'Missed quest steps before every test']) {
      await expect(text(page, p)).toBeVisible();
    }
    await page.getByRole('button', { name: 'All families' }).click();
    await expect(text(page, 'Stress easing since coach started')).toBeVisible();
    // Families that did not opt in are seeded with the surname "Hidden …".
    expect(await pageText(page)).not.toMatch(/Hidden/);
  });

  test('actions: suggest a coach adds a referral; reach out; view shares', async ({ page }) => {
    await signIn(page, 'admin');
    await expect(text(page, 'S. Haddad → EF coach')).toHaveCount(0);
    await page.getByRole('button', { name: 'Suggest coach' }).click();
    await expect(page.getByRole('button', { name: 'Coach suggested ✓' })).toBeVisible();
    await expect(text(page, 'S. Haddad → EF coach')).toBeVisible();
    await expect(text(page, 'Open referrals').locator('..').getByText('6', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Reach out' }).first().click();
    await expect(page.getByRole('button', { name: 'Contacted ✓' })).toBeVisible();

    await page.getByRole('button', { name: 'All families' }).click();
    await page.getByRole('button', { name: 'View' }).first().click();
    await expect(text(page, /^Shares: /)).toBeVisible();
  });

  test('sidebar sections', async ({ page }) => {
    await signIn(page, 'admin');
    await page.getByRole('link', { name: 'Referrals' }).click();
    await expect(page.getByRole('heading', { name: 'Referrals' })).toBeVisible();
    await page.getByRole('link', { name: 'Follow-ups' }).click();
    await expect(page.getByRole('heading', { name: 'Follow-ups' })).toBeVisible();
    await page.getByRole('link', { name: 'Reports' }).click();
    await expect(text(page, 'Not on the design canvas yet.', { exact: false })).toBeVisible();
  });

  test('works at phone width too', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, 'admin');
    await expect(text(page, 'Families enrolled')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});
