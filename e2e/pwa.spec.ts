import { expect, test } from '@playwright/test';
import { text } from './helpers';

test.describe('Installable web app (PWA)', () => {
  test('manifest is installable', async ({ request }) => {
    const res = await request.get('/manifest.json');
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m).toMatchObject({ name: 'EarlySignal', display: 'standalone', start_url: '/', theme_color: '#3A2416' });
    const sizes = m.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
    for (const i of m.icons) expect((await request.get(i.src)).ok()).toBe(true);
  });

  test('iPhone home-screen tags are present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/apple-touch-icon.png');
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/);
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.json');
  });

  test('service worker registers and the app opens offline', async ({ page, context }) => {
    await page.goto('/');
    await expect(text(page, 'Who’s signing in?')).toBeVisible();
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(scope).toMatch(/\/$/);
    // Let the worker take control and cache the build files, then go offline.
    await page.reload();
    await expect(text(page, 'Who’s signing in?')).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(text(page, 'Who’s signing in?')).toBeVisible();
    await text(page, 'I’m a student').click();
    await expect(text(page, /^Hi, Maya$/)).toBeVisible();
    await context.setOffline(false);
  });

  test('deep links work (SPA fallback) and security headers are set', async ({ request }) => {
    const res = await request.get('/student/quests');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('<div id="root">');
    const h = res.headers();
    expect(h['content-security-policy']).toContain("default-src 'self'");
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['cache-control']).toBe('no-cache');
  });
});
