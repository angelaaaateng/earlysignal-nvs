// Renders the PWA / home-screen icons from Pip (the canvas fox) with Playwright.
// Usage: node scripts/make-icons.mjs
import { chromium } from '@playwright/test';

const PIP = `
<path d="M16 214 Q120 120 224 214 Z" fill="#5A3A24"/>
<path d="M36 214 Q120 140 204 214 Z" fill="#1E120A"/>
<path d="M68 110 L80 46 L112 92 Z" fill="#D9652B"/><path d="M172 110 L160 46 L128 92 Z" fill="#D9652B"/>
<path d="M80 98 L84 64 L102 90 Z" fill="#2A190E"/><path d="M160 98 L156 64 L138 90 Z" fill="#2A190E"/>
<path d="M58 132 Q60 84 120 82 Q180 84 182 132 Q178 176 120 190 Q62 176 58 132 Z" fill="#E07B39"/>
<path d="M70 140 Q96 150 120 190 Q144 150 170 140 Q160 178 120 192 Q80 178 70 140 Z" fill="#FBF1E4"/>
<circle cx="96" cy="128" r="9" fill="#2E1B10"/><circle cx="144" cy="128" r="9" fill="#2E1B10"/>
<circle cx="99" cy="125" r="3" fill="#FBF1E4"/><circle cx="147" cy="125" r="3" fill="#FBF1E4"/>
<ellipse cx="120" cy="160" rx="9" ry="6.5" fill="#2E1B10"/>
<path d="M110 170 Q120 178 130 170" stroke="#2E1B10" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M150 196 q10 -16 24 -10 q-6 12 -24 10 Z" fill="#6A994E"/><circle cx="58" cy="198" r="7" fill="#E8B23A"/>`;

// `pad` = fraction of the canvas left empty on each side (maskable icons need ~10%+).
const html = (size, pad, radius) => `<!doctype html><html><body style="margin:0">
<div style="width:${size}px;height:${size}px;background:#3A2416;border-radius:${radius}px;display:flex;align-items:center;justify-content:center;overflow:hidden">
<svg width="${size * (1 - 2 * pad)}" height="${size * (1 - 2 * pad)}" viewBox="0 0 240 240">${PIP}</svg></div></body></html>`;

const out = [
  ['public/icons/icon-192.png', 192, 0.06, 0],
  ['public/icons/icon-512.png', 512, 0.06, 0],
  ['public/icons/maskable-512.png', 512, 0.16, 0],
  ['public/icons/apple-touch-icon.png', 180, 0.08, 0],
  ['assets/icon.png', 1024, 0.1, 0],
  ['assets/favicon.png', 48, 0.02, 0],
];

const b = await chromium.launch();
for (const [path, size, pad, radius] of out) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(html(size, pad, radius));
  await p.screenshot({ path, omitBackground: false });
  await p.close();
  console.log('wrote', path);
}
await b.close();
