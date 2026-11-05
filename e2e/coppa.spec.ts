import { expect, test } from '@playwright/test';
import { label, signIn, text } from './helpers';

test.describe('COPPA: consent before an under-13 account exists', () => {
  test('under 13 requires consent; the account appears only after it', async ({ page }) => {
    await signIn(page, 'parent');
    await page.getByRole('tab', { name: 'Account' }).click();
    await expect(text(page, 'Leo')).toHaveCount(0);
    await page.getByRole('button', { name: 'Set up a child’s account' }).click();

    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await label(page, 'First name').fill('Leo');
    await label(page, 'Last name').fill('Santos');
    await label(page, 'Birth date').fill('2017-02-10');
    await label(page, 'Sign-in PIN').fill('1234');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(text(page, 'Leo is under 13. We need your consent first.')).toBeVisible();
    await expect(text(page, /Notes Leo writes to Pip are never shared/)).toBeVisible();
    const give = page.getByRole('button', { name: 'Give consent and create account' });
    await expect(give).toBeDisabled();

    // Backing out creates nothing.
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(text(page, 'Leo')).toHaveCount(0);

    await page.getByRole('button', { name: 'Set up a child’s account' }).click();
    await label(page, 'First name').fill('Leo');
    await label(page, 'Last name').fill('Santos');
    await label(page, 'Birth date').fill('2017-02-10');
    await label(page, 'Sign-in PIN').fill('1234');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('radio', { name: /Signed form/ }).click();
    await page.getByRole('checkbox').click();
    await give.click();

    await expect(text(page, 'Leo’s Burrow is ready')).toBeVisible();
    await page.getByRole('button', { name: 'Back to Account' }).click();
    await expect(text(page, 'Leo', { exact: true })).toBeVisible();
    await expect(text(page, /Parental consent on file · signed form/)).toBeVisible();
  });

  test('13 and over skips the consent step', async ({ page }) => {
    await signIn(page, 'parent');
    await page.getByRole('tab', { name: 'Account' }).click();
    await page.getByRole('button', { name: 'Set up a child’s account' }).click();
    await label(page, 'First name').fill('Ines');
    await label(page, 'Last name').fill('Santos');
    await label(page, 'Birth date').fill('2010-01-01');
    await label(page, 'Sign-in PIN').fill('5678');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(text(page, 'Ines’s Burrow is ready')).toBeVisible();
  });

  test('bad dates are rejected before anything is saved', async ({ page }) => {
    await signIn(page, 'parent');
    await page.getByRole('tab', { name: 'Account' }).click();
    await page.getByRole('button', { name: 'Set up a child’s account' }).click();
    await label(page, 'First name').fill('Leo');
    await label(page, 'Last name').fill('Santos');
    await label(page, 'Sign-in PIN').fill('1234');
    await label(page, 'Birth date').fill('10/02/2017');
    await expect(text(page, 'Use the format YYYY-MM-DD.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});
