import { expect, test } from '@playwright/test';
import { label, signIn, text } from './helpers';

test.describe('Student: check-in and quest loop', () => {
  test('starts in the canvas state', async ({ page }) => {
    await signIn(page, 'student');
    await expect(label(page, '124 acorns')).toBeVisible();
    await expect(label(page, '9 day streak')).toBeVisible();
    await expect(text(page, 'Burrow level 3')).toBeVisible();
    await expect(text(page, '36 acorns to the garden room')).toBeVisible();
    for (const q of ['Math worksheet 4.2', 'Science lab write-up', 'Read ch. 6, Hatchet']) {
      await expect(text(page, q, { exact: true })).toBeVisible();
    }
  });

  test('check-in → split quest → focus sprint → step done, with rewards', async ({ page }) => {
    await signIn(page, 'student');
    await text(page, 'Check in', { exact: true }).click();

    // No score is pre-selected; the CTA waits for a choice.
    await expect(page.getByRole('button', { name: 'Pick a number first' })).toBeDisabled();
    await page.getByRole('radio', { name: '4, Heavy' }).click();
    await expect(text(page, 'Cloudy in the Burrow')).toBeVisible();
    await expect(text(page, 'That’s a lot. Let’s break it into tiny steps.')).toBeVisible();
    await label(page, /Anything on your mind/).first().fill('big science thing tomorrow');
    await page.getByRole('button', { name: 'Make it smaller' }).click();

    // Planner explains the split because today is heavy.
    await expect(text(page, 'Tonight’s plan · about 55 min')).toBeVisible();
    await expect(text(page, 'because you said today feels heavy.', { exact: false })).toBeVisible();
    await expect(text(page, '15 min · next up')).toBeVisible();
    await expect(text(page, '2 of 4 prep steps done · rare item waiting')).toBeVisible();

    // Focus sprint: timer runs, pause works, hint is a nudge.
    await page.getByRole('button', { name: 'Start a 15-min focus sprint' }).click();
    await expect(text(page, 'Write 3 sentences: what happened?')).toBeVisible();
    await expect(text(page, 'Pip is studying with you')).toBeVisible();
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(text(page, 'Paused. Take a breath.')).toBeVisible();
    await page.getByRole('button', { name: 'Resume' }).click();
    await page.getByRole('button', { name: 'Get a hint' }).click();
    await expect(text(page, /Start with “First, we…”/)).toBeVisible();
    await page.getByRole('button', { name: 'I finished this step' }).click();

    // Back in the Burrow: +5 acorns for the check-in, streak extended, step advanced.
    await expect(label(page, '129 acorns')).toBeVisible();
    await expect(label(page, '10 day streak')).toBeVisible();
    await expect(text(page, 'Step 3 of 3 · due tomorrow')).toBeVisible();
    await expect(text(page, 'You said 4 today · tap to change')).toBeVisible();
  });

  test('finishing every step of a quest pays its acorns; un-ticking takes them back', async ({ page }) => {
    await signIn(page, 'student');
    await page.getByRole('tab', { name: 'Quests' }).click();
    await page.getByRole('checkbox', { name: /Write 3 sentences/ }).click();
    await page.getByRole('checkbox', { name: /Answer the 2 conclusion questions/ }).click();
    await page.getByRole('tab', { name: 'Burrow' }).click();
    await expect(label(page, '139 acorns')).toBeVisible();
    await page.getByRole('tab', { name: 'Quests' }).click();
    // The lab is finished, so Hatchet is now the featured quest; go back via the Burrow row instead.
    await page.getByRole('tab', { name: 'Burrow' }).click();
    await page.getByRole('checkbox', { name: /Read ch\. 6, Hatchet/ }).click();
    await expect(label(page, '144 acorns')).toBeVisible();
    await page.getByRole('checkbox', { name: /Read ch\. 6, Hatchet/ }).click();
    await expect(label(page, '139 acorns')).toBeVisible();
  });

  test('state survives a reload (installed-app behaviour)', async ({ page }) => {
    await signIn(page, 'student');
    await text(page, 'Check in', { exact: true }).click();
    await page.getByRole('radio', { name: '2, Okay' }).click();
    await page.getByRole('button', { name: 'See tonight’s plan' }).click();
    await page.reload();
    await expect(text(page, 'Tonight’s plan · about 55 min')).toBeVisible();
    await page.getByRole('tab', { name: 'Burrow' }).click();
    await expect(label(page, '129 acorns')).toBeVisible();
  });
});
