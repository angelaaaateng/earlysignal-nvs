import { expect, test } from '@playwright/test';
import { pageText, signInDemo, tab, text } from './helpers';

test.describe('The core loop: a question tied to the week, asked, and logged', () => {
  test('home shows tonight’s starter about the nearest event, and “Try another” changes it', async ({ page }) => {
    await signInDemo(page);
    await expect(text(page, /Tonight with Ava|Another one for Ava/)).toBeVisible();
    const q1 = await page.getByRole('heading').nth(1).innerText();
    await page.getByRole('button', { name: 'Try another' }).click();
    const q2 = await page.getByRole('heading').nth(1).innerText();
    expect(q2).not.toBe(q1);
    expect(q2.endsWith('?')).toBe(true);
    await expect(text(page, /talks? this week/)).toBeVisible();
    await expect(text(page, 'Coming up for Ava')).toBeVisible();
  });

  test('“I asked it” logs how it went and the week updates; notes stay on the device', async ({ page }) => {
    await signInDemo(page);
    const before = (await text(page, /^\d+ talks? this week$/).innerText()).match(/\d+/)![0];
    await page.getByRole('button', { name: 'Car ride' }).click();
    await page.getByRole('button', { name: 'I asked it' }).click();
    await expect(text(page, 'Nice. That’s the whole job.')).toBeVisible();
    await page.getByRole('radio', { name: 'Good talk' }).click();
    await page.getByLabel('A note for you (optional)').fill('PRIVATE-NOTE-7f3a she mentioned the robotics kid');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(text(page, /^Good (morning|afternoon|evening)$/)).toBeVisible();
    const after = (await text(page, /^\d+ talks? this week$/).innerText()).match(/\d+/)![0];
    expect(Number(after)).toBe(Number(before) + 1);
    // The note is on the Grow screen (device-only) and in no log line.
    await tab(page, 'Grow');
    await expect(text(page, /PRIVATE-NOTE-7f3a/)).toBeVisible();
    await page.goto('/diagnostics');
    await expect(page.getByRole('heading', { name: 'Diagnostics' })).toBeVisible();
    await expect(text(page, /audit\/talk\.log/).first()).toBeVisible();
    expect(await pageText(page)).not.toContain('PRIVATE-NOTE-7f3a');
  });

  test('switching kids changes the starter', async ({ page }) => {
    await signInDemo(page);
    await page.getByRole('button', { name: /Leo, Grade 8/ }).click();
    await expect(text(page, /Tonight with Leo|Another one for Leo/)).toBeVisible();
    await expect(text(page, 'Coming up for Leo')).toBeVisible();
  });
});

test.describe('The week', () => {
  test('an event shows three questions; adding one puts it on the calendar and on tonight’s starter', async ({ page }) => {
    await signInDemo(page);
    await tab(page, 'Week');
    await expect(text(page, 'The week')).toBeVisible();
    await text(page, 'Math test').first().click();
    await expect(page.getByRole('button', { name: 'I asked it' })).toHaveCount(3);
    await expect(page.getByRole('heading').filter({ hasText: /Math test/ })).toHaveCount(2);

    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByLabel('What is it?').fill('Spelling bee');
    await page.getByRole('button', { name: 'Presentation' }).click();
    await page.getByRole('button', { name: /today/ }).click();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(text(page, 'Spelling bee')).toBeVisible();
    await tab(page, 'Home');
    await expect(text(page, /Spelling bee/).first()).toBeVisible();
  });

  test('a removed event disappears', async ({ page }) => {
    await signInDemo(page);
    await tab(page, 'Week');
    await text(page, 'Fall dance').click();
    await page.getByRole('button', { name: 'Remove Fall dance' }).click();
    await expect(text(page, 'Fall dance')).toHaveCount(0);
  });
});

test.describe('Grow and family', () => {
  test('the Sunday check-in counts, never grades, and plans next week', async ({ page }) => {
    await signInDemo(page);
    await tab(page, 'Grow');
    await expect(text(page, /talks? this week|A quiet week/)).toBeVisible();
    await expect(text(page, 'Weeks with a talk: 2 of 4, last four weeks')).toHaveCount(0); // free-form check follows
    const body = await pageText(page);
    expect(body).not.toMatch(/streak|score|\d+%/i);
    await page.getByRole('button', { name: 'Nothing new' }).click();
    await expect(text(page, 'Next week is planned.')).toBeVisible();
  });

  test('a new parent adds a kid and the first event, then lands on a starter about it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create my own account' }).click();
    await page.getByLabel('Your name').fill('Jordan Lee');
    await page.getByLabel('Email').fill('jordan@example.com');
    await page.getByLabel('Password').fill('Acorns2026!');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(text(page, 'Hi, Jordan')).toBeVisible();
    await page.getByRole('button', { name: 'Add your kid' }).click();
    await page.getByLabel('First name').fill('Sam');
    await page.getByRole('button', { name: 'Grade 7' }).click();
    await page.getByRole('button', { name: 'Robotics', exact: true }).click();
    await page.getByRole('button', { name: 'Next: their week' }).click();
    await expect(text(page, 'What’s on Sam’s week?')).toBeVisible();
    await page.getByLabel('What is it?').fill('Soccer tryout');
    await page.getByRole('button', { name: 'Tryout or audition' }).click();
    await page.getByRole('button', { name: 'Add and finish' }).click();
    await expect(text(page, 'Tonight with Sam')).toBeVisible();
    await expect(text(page, /Soccer tryout/).first()).toBeVisible();
    // Family shows what Rooted knows, and only that.
    await tab(page, 'Family');
    await expect(text(page, 'Jordan’s kids')).toBeVisible();
    await expect(text(page, 'Robotics')).toBeVisible();
    await expect(text(page, 'Your kid never uses the app.', { exact: false })).toBeVisible();
  });

  test('typed URLs are guarded: signed-out users land on sign-in', async ({ page }) => {
    await page.goto('/grow');
    await expect(page.getByRole('button', { name: 'Try the demo' })).toBeVisible();
  });
});
