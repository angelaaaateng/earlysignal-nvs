// Renders the PWA / home-screen icons: two speech bubbles in conversation,
// from the Rooted design-system cover. Usage: node scripts/make-icons.mjs
import { chromium } from '@playwright/test';

// soil bubble (ours to ask, tail bottom-left), moss bubble (the reply, tail bottom-right), one spark disc.
const MARK = `
<path fill="#f6f4f0" d="M44 40h104a24 24 0 0 1 24 24v62a24 24 0 0 1-24 24H34a6 6 0 0 1-6-6V64a24 24 0 0 1 24-24z"/>
<path fill="#5dcc8c" d="M104 112h108a24 24 0 0 1 24 24v62a6 6 0 0 1-6 6H104a24 24 0 0 1-24-24v-44a24 24 0 0 1 24-24z"/>
<circle cx="200" cy="64" r="18" fill="#c5ef6a"/>`;

const html = (size, pad) => `<!doctype html><html><body style="margin:0">
<div style="width:${size}px;height:${size}px;background:#123a28;display:flex;align-items:center;justify-content:center;overflow:hidden">
<svg width="${size * (1 - 2 * pad)}" height="${size * (1 - 2 * pad)}" viewBox="0 0 240 240">${MARK}</svg></div></body></html>`;

const out = [
  ['public/icons/icon-192.png', 192, 0.08],
  ['public/icons/icon-512.png', 512, 0.08],
  ['public/icons/maskable-512.png', 512, 0.18],
  ['public/icons/apple-touch-icon.png', 180, 0.1],
  ['assets/icon.png', 1024, 0.12],
  ['assets/favicon.png', 48, 0.04],
  ['assets/android-icon-foreground.png', 1024, 0.26],
];
const b = await chromium.launch();
for (const [path, size, pad] of out) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(html(size, pad));
  await p.screenshot({ path });
  await p.close();
  console.log('wrote', path);
}
// Solid background and a monochrome foreground for Android adaptive icons.
const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
await p.setContent(`<body style="margin:0;background:#123a28"></body>`);
await p.screenshot({ path: 'assets/android-icon-background.png' });
await p.setContent(html(1024, 0.26).replace(/#f6f4f0|#5dcc8c|#c5ef6a/g, '#ffffff').replace('background:#123a28', 'background:transparent'));
await p.screenshot({ path: 'assets/android-icon-monochrome.png', omitBackground: true });
await b.close();
