import { expect, type Page } from '@playwright/test';

/** Fresh app, signed in to the demo family (Maya, with Ava and Leo). */
export async function signInDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(text(page, /^Good (morning|afternoon|evening)$/)).toBeVisible();
}

export async function tab(page: Page, name: 'Home' | 'Week' | 'Grow' | 'Family') {
  await page.getByRole('tab', { name }).click();
}

export async function pageText(page: Page) {
  return page.evaluate(() => document.body.innerText);
}

/** Visible-only text lookup (screens under a pushed screen stay mounted). */
export function text(page: Page, t: string | RegExp, opts?: { exact?: boolean }) {
  return page.getByText(t, opts).filter({ visible: true });
}
export function label(page: Page, t: string | RegExp) {
  return page.getByLabel(t).filter({ visible: true });
}
