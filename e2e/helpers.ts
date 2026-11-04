import { expect, type Page } from '@playwright/test';

export type Role = 'student' | 'parent' | 'admin';
const CARD: Record<Role, string> = { student: 'I’m a student', parent: 'I’m a parent', admin: 'School or clinic admin' };

/** Fresh app, then sign in through the real role picker. */
export async function signIn(page: Page, role: Role) {
  await page.goto('/');
  await text(page, CARD[role]).click();
  const landmark = { student: /^Hi, Maya$/, parent: /Maya’s week/, admin: /Ms\. Patel/ }[role];
  await expect(text(page, landmark).first()).toBeVisible();
}

export async function signOutStudent(page: Page) {
  await page.getByRole('tab', { name: 'Me' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(text(page, 'Who’s signing in?')).toBeVisible();
}

export async function signOutParent(page: Page) {
  await page.getByRole('tab', { name: 'Account' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(text(page, 'Who’s signing in?')).toBeVisible();
}

/** Visible text of the whole page, for "this must never appear" checks. */
export async function pageText(page: Page) {
  return page.evaluate(() => document.body.innerText);
}

/**
 * Visible-only text lookup. Screens under a pushed screen stay mounted (hidden),
 * so a plain getByText can match the copy on the screen underneath.
 */
export function text(page: Page, t: string | RegExp, opts?: { exact?: boolean }) {
  return page.getByText(t, opts).filter({ visible: true });
}

/** Visible-only accessible-label lookup (see `text`). */
export function label(page: Page, t: string | RegExp) {
  return page.getByLabel(t).filter({ visible: true });
}
