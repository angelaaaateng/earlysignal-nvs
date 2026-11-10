// QR codes for the deck: live app and demo. Usage: node scripts/make-qr.mjs
import QRCode from 'qrcode';
import { mkdirSync } from 'node:fs';
mkdirSync('docs/qr', { recursive: true });
const targets = [
  ['docs/qr/rooted-live.png', 'https://earlysignal-nvs.vercel.app'],
  ['docs/qr/rooted-demo.png', 'https://angelaaaateng.github.io/earlysignal-nvs/'],
];
for (const [file, url] of targets) {
  await QRCode.toFile(file, url, { width: 1200, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#123a28', light: '#ffffff' } });
  await QRCode.toFile(file.replace('.png', '.svg'), url, { type: 'svg', margin: 2, errorCorrectionLevel: 'H', color: { dark: '#123a28', light: '#ffffff' } });
  console.log('wrote', file, '→', url);
}
