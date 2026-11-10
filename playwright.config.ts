import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the production web build (`npm run build:web`)
 * served by scripts/serve.mjs, so they exercise the real PWA: service worker,
 * manifest, security headers, SPA routing and persisted state.
 */
const PORT = 4173;
const chromium = { browserName: 'chromium' as const };

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 45_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Phones (Chromium engine with each device's viewport, touch and user agent).
    { name: 'iphone', use: { ...devices['iPhone 14'], ...chromium }, testIgnore: /pwa\.spec/ },
    { name: 'android', use: { ...devices['Pixel 7'], ...chromium }, testIgnore: /pwa\.spec/ },
    // Install metadata, offline and headers once, on desktop Chrome.
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } }, testMatch: /pwa\.spec|core-loop\.spec/ },
  ],
  webServer: {
    command: `node scripts/serve.mjs dist ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
  },
});
