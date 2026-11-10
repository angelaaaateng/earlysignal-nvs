// Desktop screenshots of the demo build for docs. Usage: node scripts/serve.mjs dist 4175 & node scripts/smoke/desktop-shot.mjs
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:4175/'); await p.getByText('Small talks. Deep roots.').first().waitFor(); await p.waitForTimeout(800);
await p.screenshot({ path: 'docs/walkthrough/screens/desktop-signin.png' });
await p.getByRole('button', { name: 'Try the demo' }).click();
await p.getByText(/^Good (morning|afternoon|evening)$/).waitFor();
await p.waitForTimeout(600);
await p.screenshot({ path: 'docs/walkthrough/screens/desktop-home.png' });
await p.getByRole('tab', { name: 'Grow' }).click();
await p.getByText('Sunday check-in').nth(1).waitFor();
await p.waitForTimeout(400);
await p.screenshot({ path: 'docs/walkthrough/screens/desktop-grow.png' });
await b.close();
console.log('ok');
