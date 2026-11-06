import { expect, test } from '@playwright/test';
import { label, pageText, signIn, signOutParent, signOutStudent, text } from './helpers';

const SECRET = 'E2E-PRIVATE-NOTE-7f3a';

test.describe('Rules: sharing and private notes', () => {
  test('a private note never reaches the parent or the admin', async ({ page }) => {
    await signIn(page, 'student');
    await text(page, 'Check in', { exact: true }).click();
    await page.getByRole('radio', { name: '5, A lot' }).click();
    await label(page, /Anything on your mind/).first().fill(SECRET);
    await page.getByRole('button', { name: 'Pick one thing' }).click();

    // The student can read it back.
    await page.getByRole('tab', { name: 'Burrow' }).click();
    await text(page, 'Update', { exact: true }).click();
    await expect(label(page, /Anything on your mind/).first()).toHaveValue(SECRET);
    await page.getByRole('button', { name: 'Back to the Burrow' }).click();
    await signOutStudent(page);

    await signIn(page, 'parent');
    expect(await pageText(page)).not.toContain(SECRET);
    await page.getByRole('tab', { name: 'Help' }).click();
    expect(await pageText(page)).not.toContain(SECRET);
    await signOutParent(page);

    await page.setViewportSize({ width: 1280, height: 900 });
    await signIn(page, 'admin');
    await page.getByRole('button', { name: 'All families' }).click();
    expect(await pageText(page)).not.toContain(SECRET);

    // Nor the logs: diagnostics shows the check-in event but not the note.
    await page.goto('/diagnostics');
    await expect(text(page, /checkin\.submit/).first()).toBeVisible();
    expect(await pageText(page)).not.toContain(SECRET);
  });

  test('the parent sees only what the student shares, the moment it changes', async ({ page }) => {
    await signIn(page, 'student');
    await page.getByRole('tab', { name: 'Me' }).click();
    await expect(text(page, 'What Ana can see')).toBeVisible();
    await page.getByRole('switch', { name: 'Weekly mood trend' }).click();
    await page.getByRole('switch', { name: 'Quests finished' }).click();
    await expect(page.getByRole('switch', { name: 'Weekly mood trend' })).toHaveAttribute('aria-checked', 'false');

    // The student's preview matches what Mom will see.
    await text(page, /Friday summary →/).click();
    await expect(text(page, 'Maya keeps the mood trend private.')).toBeVisible();
    await page.getByRole('button', { name: 'Back to privacy settings' }).click();
    await signOutStudent(page);

    await signIn(page, 'parent');
    await expect(text(page, 'Maya keeps the mood trend private.')).toBeVisible();
    await expect(text(page, 'check-ins private')).toBeVisible();
    await expect(text(page, 'quests private')).toBeVisible();
    await expect(text(page, 'day streak')).toBeVisible(); // still shared
    await expect(text(page, 'Watch', { exact: true })).toHaveCount(0);
  });

  test('upcoming tests stay hidden until the student turns them on', async ({ page }) => {
    await signIn(page, 'parent');
    await expect(text(page, 'Science quiz: Cells')).toHaveCount(0);
    await signOutParent(page);

    await signIn(page, 'student');
    await page.getByRole('tab', { name: 'Me' }).click();
    await page.getByRole('switch', { name: 'Upcoming tests' }).click();
    await signOutStudent(page);

    await signIn(page, 'parent');
    await expect(text(page, /Science quiz: Cells · /)).toBeVisible();
  });
});

test.describe('Role guards', () => {
  test('a student cannot open parent or admin routes by URL', async ({ page }) => {
    await signIn(page, 'student');
    for (const path of ['/admin', '/parent', '/parent/help']) {
      await page.goto(path);
      await expect(text(page, /^Hi, Maya$/)).toBeVisible();
      await expect(text(page, 'Good morning, Ms. Patel').or(text(page, /Maya’s week/))).toHaveCount(0);
    }
  });

  test('signed out, every app route lands on the role picker', async ({ page }) => {
    for (const path of ['/student', '/student/check-in', '/parent', '/admin']) {
      await page.goto(path);
      await expect(text(page, 'Who’s signing in?')).toBeVisible();
    }
  });
});
