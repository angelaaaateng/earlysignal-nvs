import { expect, test } from '@playwright/test';
import { signIn, text } from './helpers';

test.describe('Parent: weekly summary and help', () => {
  test('summary shows shared stats, weekly mood averages and coaching copy', async ({ page }) => {
    await signIn(page, 'parent');
    await expect(text(page, /^Friday summary · /)).toBeVisible();
    await expect(text(page, 'days checked in')).toBeVisible();
    await expect(text(page, 'quests finished')).toBeVisible();
    await expect(text(page, '9', { exact: true })).toBeVisible();
    await expect(text(page, 'Weekly average, last 5 weeks')).toBeVisible();
    await expect(text(page, 'This wk')).toBeVisible();
    await expect(text(page, 'Win', { exact: true })).toBeVisible();
    await expect(text(page, 'Try saying tonight')).toBeVisible();
    await expect(text(page, 'Example data')).toBeVisible();
  });

  test('send a cheer', async ({ page }) => {
    await signIn(page, 'parent');
    await page.getByRole('button', { name: 'Send a cheer' }).click();
    await expect(page.getByRole('button', { name: 'Pip will deliver it ✓' })).toBeDisabled();
  });

  test('help: pick who to contact, copy the drafted message, crisis line visible', async ({ page, context, browserName }) => {
    if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await signIn(page, 'parent');
    await page.getByRole('link', { name: 'Get help' }).click();
    await expect(text(page, 'Talk to a person')).toBeVisible();
    await expect(text(page, /Hi Ms\. Patel,/)).toBeVisible();
    await page.getByRole('radio', { name: /Executive-function coach/ }).click();
    await expect(text(page, /My 6th grader struggles with planning/)).toBeVisible();
    await page.getByRole('button', { name: 'Copy message' }).click();
    await expect(page.getByRole('button', { name: 'Copied ✓' })).toBeVisible();
    await expect(text(page, '988')).toBeVisible();
  });
});
