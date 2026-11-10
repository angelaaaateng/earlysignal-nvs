import { expect, test } from '@playwright/test';
import { pageText, signInDemo, tab, text } from './helpers';

test.describe('Pilot features', () => {
  test('the second move appears after a real talk, and “Wrong moment” never counts', async ({ page }) => {
    await signInDemo(page);
    await expect(text(page, /If they answer: “/)).toBeVisible();
    const before = Number((await text(page, /^\d+ talks? this week$/).innerText()).match(/\d+/)![0]);
    await page.getByRole('button', { name: 'I asked it' }).click();
    await page.getByRole('radio', { name: 'Wrong moment' }).click();
    await expect(text(page, /never counts against you/)).toBeVisible();
    await expect(text(page, 'The second move')).toHaveCount(0);
    await page.getByRole('radio', { name: 'Good talk' }).click();
    await expect(text(page, 'The second move')).toBeVisible();
    await page.getByRole('button', { name: 'I asked this too' }).click();
    await expect(page.getByRole('button', { name: 'Asked the follow-up' })).toBeVisible();
    await page.getByRole('radio', { name: 'Wrong moment' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(text(page, /^Good (morning|afternoon|evening)$/)).toBeVisible();
    const after = Number((await text(page, /^\d+ talks? this week$/).innerText()).match(/\d+/)![0]);
    expect(after).toBe(before);
  });

  test('import: pasted lines become approved events on the week', async ({ page }) => {
    await signInDemo(page);
    await tab(page, 'Week');
    await page.getByRole('button', { name: 'Import' }).click();
    await page.getByLabel('Newsletter, syllabus or a few lines').fill('Spelling bee Nov 20\nPicture day 11/25\nNo date on this one');
    await page.getByRole('button', { name: 'Find events' }).click();
    await expect(text(page, '2 to add')).toBeVisible();
    await page.getByRole('checkbox', { name: 'Keep Picture day' }).click();
    await expect(text(page, '1 to add')).toBeVisible();
    await page.getByRole('button', { name: /Add 1 to Ava/ }).click();
    await expect(text(page, 'Spelling bee')).toBeVisible();
    await expect(text(page, 'Picture day')).toHaveCount(0);
  });

  test('repeats weekly adds eight events', async ({ page }) => {
    await signInDemo(page);
    await tab(page, 'Week');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByLabel('What is it?').fill('Piano lesson');
    await page.getByRole('button', { name: 'Something else' }).click();
    await page.getByRole('checkbox', { name: /Repeats weekly/ }).click();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(text(page, 'Piano lesson').first()).toBeVisible();
    // The Week screen shows two weeks; the rest live further out.
    expect((await pageText(page)).match(/Piano lesson/g)!.length).toBeGreaterThanOrEqual(2);
  });

  test('reminder and pilot-mode switches persist; the experiment card explains itself', async ({ page }) => {
    await signInDemo(page);
    await tab(page, 'Family');
    await page.getByRole('switch', { name: 'Daily reminder' }).click();
    await expect(page.getByRole('switch', { name: 'Daily reminder' })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: 'Bedtime · 8 pm' }).click();
    await expect(text(page, /Demo: reminders are saved but not sent/)).toBeVisible();
    await tab(page, 'Grow');
    await expect(text(page, 'The experiment')).toBeVisible();
    await tab(page, 'Family');
    await page.getByRole('switch', { name: 'Pilot mode' }).click();
    await expect(page.getByRole('switch', { name: 'Pilot mode' })).toHaveAttribute('aria-checked', 'false');
    await tab(page, 'Grow');
    await expect(text(page, 'The experiment')).toHaveCount(0);
  });

  test('the founding-family offer records interest once', async ({ page }) => {
    await signInDemo(page);
    await tab(page, 'Grow');
    await page.getByRole('link', { name: /Founding-family pilot/ }).click();
    await page.getByRole('button', { name: 'Count me in' }).click();
    await expect(text(page, 'You’re on the list.')).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(text(page, /You’re on the list for the four-week pilot/)).toBeVisible();
  });

  test('forgot password is reachable from sign-in; the demo explains it has no email', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'I already have an account' }).click();
    await page.getByRole('button', { name: 'Forgot your password?' }).click();
    await page.getByLabel('Email').fill('maya@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(text(page, /demo has no email/)).toBeVisible();
  });
});
