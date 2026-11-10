// Records the product walkthrough: one captioned video per point of view, a
// screenshot of every step, and docs/walkthrough/README.md that ties them together.
//
//   npm run build:web && npm run walkthrough
//
// The app runs inside a phone (or desktop) frame on a 1600×900 stage, with the
// caption for each step beside it. Taps show a ripple so viewers can follow.
import { chromium, devices } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 4174;
const BASE = `http://localhost:${PORT}`;
const OUT = 'docs/walkthrough';
const SHOTS = join(OUT, 'screens');
const TMP = join(OUT, '.tmp');
const DWELL = Number(process.env.DWELL ?? 2600);

// ---------------------------------------------------------------- setup ---
if (!existsSync('dist/index.html')) throw new Error('Run `npm run build:web` first.');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });
mkdirSync(TMP, { recursive: true });

const server = spawn('node', ['scripts/serve.mjs', 'dist', String(PORT)], { env: { ...process.env, ALLOW_FRAMING: '1' }, stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(BASE)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 200));
}

const fontFile = (needle) => {
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
  const hit = walk('dist/assets').find((f) => f.includes(needle) && f.endsWith('.ttf'));
  return hit ? `${BASE}/${hit.slice('dist/'.length)}` : '';
};
const FONTS = `
@font-face{font-family:Bric;font-weight:800;src:url(${fontFile('PlusJakartaSans_800ExtraBold')})}
@font-face{font-family:Nun;font-weight:400;src:url(${fontFile('PlusJakartaSans_400Regular')})}
@font-face{font-family:Nun;font-weight:800;src:url(${fontFile('PlusJakartaSans_700Bold')})}`;

const stage = (layout, role, accent) => `<!doctype html><html><head><style>${FONTS}
*{box-sizing:border-box} body{margin:0;width:1600px;height:900px;background:#123a28;overflow:hidden;font-family:Nun,sans-serif;color:#f6f4f0}
#app{position:absolute;overflow:hidden;background:#f6f4f0}
#app iframe{border:0;display:block}
.phone #app{left:150px;top:28px;width:390px;height:844px;border-radius:44px;box-shadow:0 0 0 10px #0b2419,0 0 0 11px #1d4d37,0 30px 90px rgba(0,0,0,.55)}
.phone #cap{position:absolute;left:640px;top:0;width:860px;height:900px;display:flex;flex-direction:column;justify-content:center;gap:18px}
.desk #app{left:160px;top:150px;width:1280px;height:730px;border-radius:14px;box-shadow:0 0 0 1px #5A3A24,0 24px 80px rgba(0,0,0,.5)}
.desk #cap{position:absolute;left:160px;top:22px;width:1280px;height:120px;display:flex;flex-direction:column;justify-content:center;gap:6px}
.desk #title{font-size:34px} .desk #text{font-size:19px;max-width:1280px}
#chip{align-self:flex-start;font-weight:800;font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:#1f1a16;background:${accent};padding:7px 14px;border-radius:999px}
.desk #chip{display:none}
#step{font-weight:800;font-size:16px;letter-spacing:.12em;text-transform:uppercase;color:#c5ef6a}
#title{font-family:Bric,sans-serif;font-weight:800;font-size:52px;line-height:1.05;margin:0}
#text{font-size:24px;line-height:1.45;color:#bfd9c9;margin:0;max-width:820px}
#cap>*{transition:opacity .25s} .fade>*{opacity:0}
.tap{position:absolute;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(197,239,106,.45);border:3px solid #c5ef6a;pointer-events:none;animation:tap .6s ease-out forwards;z-index:9}
@keyframes tap{from{transform:scale(.4);opacity:1}to{transform:scale(1.4);opacity:0}}
</style></head><body class="${layout}">
<div id="app"><iframe allow="clipboard-read; clipboard-write" src="${BASE}/" width="${layout === 'phone' ? 390 : 1280}" height="${layout === 'phone' ? 844 : 730}"></iframe></div>
<div id="cap"><div id="chip">${role}</div><div id="step"></div><h1 id="title"></h1><p id="text"></p></div>
</body></html>`;

// --------------------------------------------------------------- engine ---
const browser = await chromium.launch();
const doc = []; // for README.md
const videos = [];

async function tour({ slug, role, layout, accent, ua, steps }) {
  const size = { width: 1600, height: 900 };
  const ctx = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 2,
    userAgent: ua,
    recordVideo: { dir: TMP, size },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await ctx.newPage();
  await page.setContent(stage(layout, role, accent));
  const app = page.frameLocator('iframe');
  await app.getByText('Small talks. Deep roots.').waitFor();
  await page.evaluate(() => document.fonts.ready);

  const t = (s, o) => app.getByText(s, o).filter({ visible: true }).first();
  const r = (role, o) => app.getByRole(role, o).filter({ visible: true }).first();
  const tap = async (loc) => {
    await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox();
    if (b) {
      await page.evaluate(({ x, y }) => {
        const d = document.createElement('div');
        d.className = 'tap';
        d.style.left = `${x}px`;
        d.style.top = `${y}px`;
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 700);
      }, { x: b.x + b.width / 2, y: b.y + b.height / 2 });
      await page.waitForTimeout(280);
    }
    await loc.click();
  };
  const type = async (loc, s) => {
    await tap(loc);
    await loc.pressSequentially(s, { delay: 45 });
  };
  const go = async (path) => {
    await page.evaluate((u) => (document.querySelector('iframe').src = u), `${BASE}${path}`);
    await page.waitForTimeout(1200);
  };
  const h = { app, t, r, tap, type, go, page, wait: (ms) => page.waitForTimeout(ms) };

  const section = { slug, role, steps: [] };
  doc.push(section);
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    await page.evaluate(({ n, total, title, text }) => {
      const cap = document.getElementById('cap');
      cap.classList.add('fade');
      setTimeout(() => {
        document.getElementById('step').textContent = `Step ${n} of ${total}`;
        document.getElementById('title').textContent = title;
        document.getElementById('text').textContent = text;
        cap.classList.remove('fade');
      }, 260);
    }, { n: i + 1, total: steps.length, title: s.title, text: s.text });
    await page.waitForTimeout(700);
    if (s.do) await s.do(h);
    await page.waitForTimeout(s.dwell ?? DWELL);
    const file = `${slug}-${String(i + 1).padStart(2, '0')}.png`;
    await page.locator('#app').screenshot({ path: join(SHOTS, file) });
    section.steps.push({ ...s, file });
    console.log(`  ${slug} ${i + 1}/${steps.length} ${s.title}`);
  }
  await page.waitForTimeout(800);
  const vid = page.video();
  await ctx.close();
  const webm = await vid.path();
  const mp4 = join(OUT, `${slug}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-preset', 'veryfast', '-movflags', '+faststart', '-r', '25', mp4]);
  videos.push(mp4);
}

const IPHONE_UA = devices['iPhone 14'].userAgent;
const DESK_UA = devices['Desktop Chrome'].userAgent;

// ---------------------------------------------------------------- tours ---
console.log('Recording the parent…');
await tour({
  slug: '1-parent', role: 'Parent · Maya', layout: 'phone', accent: '#c5ef6a', ua: IPHONE_UA,
  steps: [
    { title: 'Install it from Safari or Chrome', text: 'No app store. iPhone: Share → Add to Home Screen. Android or desktop Chrome: Install. It opens full screen and works offline.' },
    { title: 'Parents only', text: 'Kids never use Rooted and have no account. The parent signs in with email and password; the demo opens an example family.', do: async ({ r, tap }) => tap(r('button', { name: 'Try the demo' })) },
    { title: 'Tonight’s starter', text: 'Ava has a math test tomorrow, so tonight’s question is about the test: “What part of Math test feels most ready?”, with a tip on how to ask it in the car.', do: async ({ t }) => t(/Tonight with Ava|Another one for Ava/).scrollIntoViewIfNeeded() },
    { title: 'Try another', text: 'Every question comes from a library a person on the team reviewed. Rooted picks among them; nothing is generated on the fly.', do: async ({ r, tap }) => tap(r('button', { name: 'Try another' })) },
    { title: 'Where are you two tonight?', text: 'Car ride, dinner, bedtime, a walk. The moment is logged with the talk so the team learns where questions land.', do: async ({ r, tap }) => tap(r('button', { name: 'Car ride' })) },
    { title: 'I asked it', text: 'One tap at pickup. Then the phone goes away.', do: async ({ r, tap }) => tap(r('button', { name: 'I asked it' })) },
    { title: 'How did it go?', text: 'Four seeds, from “Not tonight” to “We really talked”. “Not tonight” is a valid answer; nothing is scored.', do: async ({ r, tap }) => tap(r('radio', { name: 'Good talk' })) },
    { title: 'A note for you', text: 'What Ava said, or what to ask next time. Notes stay on this device. They are never uploaded.',
      do: async ({ app, type }) => type(app.getByLabel('A note for you (optional)').filter({ visible: true }).first(), 'She wants to redo the fractions page. Ask Thursday.') },
    { title: 'The week updates', text: 'Back home: one more talk this week. Counts, not streaks. The design system calls this “invite, never grade”.', do: async ({ r, tap }) => tap(r('button', { name: 'Save', exact: true })) },
    { title: 'Two kids', text: 'Leo is in 8th grade. Switch kids and the starter follows: his robotics showcase is this week.', do: async ({ r, tap }) => tap(r('button', { name: /Leo, Grade 8/ })) },
  ],
});

console.log('Recording the week…');
await tour({
  slug: '2-week', role: 'Sunday planning', layout: 'phone', accent: '#ddf2e3', ua: IPHONE_UA,
  steps: [
    { title: 'The week', text: 'Everything the parent entered: a math test, a soccer game, a showcase, a dance. Two weeks at a glance.', do: async ({ r, t, tap, wait }) => { await tap(r('button', { name: 'Try the demo' })); await wait(900); await tap(r('tab', { name: 'Week' })); } },
    { title: 'Three questions per event', text: 'Tap an event: three questions for before it happens, and three different ones for after.', do: async ({ t, tap }) => tap(t('Math test').first()) },
    { title: 'Add to the week', text: 'What is it, what kind, and when. That’s the whole Sunday check-in.', do: async ({ r, tap, type, app, wait }) => { await tap(r('button', { name: 'Add', exact: true })); await wait(600); await type(app.getByLabel('What is it?').filter({ visible: true }).first(), 'Spelling bee'); await tap(r('button', { name: 'Presentation' })); } },
    { title: 'On the calendar', text: 'The new event has its questions immediately, and tonight’s starter will pick it up.', do: async ({ r, tap }) => tap(r('button', { name: 'Add', exact: true })) },
    { title: 'Grow: what happened this week', text: 'Talks this month, weeks with a talk, the topic that landed best. Never a score on the relationship, never a comparison with other families.', do: async ({ r, tap }) => tap(r('tab', { name: 'Grow' })) },
    { title: 'Which questions worked', text: 'Family feedback becomes the team’s signal: this is what we would learn from the pilot.', do: async ({ t }) => t('Questions that worked').scrollIntoViewIfNeeded() },
    { title: 'Your notes', text: 'Recent talks with the parent’s own notes, read from this device only.', do: async ({ t }) => t('Recent talks').scrollIntoViewIfNeeded() },
    { title: 'Family: what Rooted knows', text: 'A first name, a grade, interests and the events you type. Nothing from the kid, ever. Delete everything in one tap.', do: async ({ r, tap }) => tap(r('tab', { name: 'Family' })) },
  ],
});

console.log('Recording a new parent…');
await tour({
  slug: '3-new-parent', role: 'New parent · Jordan', layout: 'phone', accent: '#f3e8dd', ua: IPHONE_UA,
  steps: [
    { title: 'Create an account', text: 'Email and password. Thirty seconds. No app store, no invitation, nothing sent to the kid.',
      do: async ({ r, tap, type, app }) => {
        await tap(r('button', { name: 'Create my own account' }));
        const f = (l) => app.getByLabel(l).filter({ visible: true }).first();
        await type(f('Your name'), 'Jordan Lee'); await type(f('Email'), 'jordan@example.com'); await type(f('Password'), 'Acorns2026!');
      } },
    { title: 'Two minutes to set up', text: 'Tell us about your kid, then what’s on their week.', do: async ({ r, tap }) => tap(r('button', { name: 'Create account' })) },
    { title: 'Step 1: the kid', text: 'First name, grade, a few interests. Starters use the name.',
      do: async ({ r, tap, type, app, wait }) => { await tap(r('button', { name: 'Add your kid' })); await wait(600); await type(app.getByLabel('First name').filter({ visible: true }).first(), 'Sam'); await tap(r('button', { name: 'Grade 7' })); await tap(r('button', { name: 'Robotics' })); await tap(r('button', { name: 'Soccer', exact: true })); } },
    { title: 'Step 2: the week', text: 'A soccer tryout on Thursday.', do: async ({ r, tap, type, app, wait }) => { await tap(r('button', { name: 'Next: their week' })); await wait(600); await type(app.getByLabel('What is it?').filter({ visible: true }).first(), 'Soccer tryout'); await tap(r('button', { name: 'Tryout or audition' })); } },
    { title: 'Tonight with Sam', text: 'The first starter is about the tryout: “What are you hoping the coach notices?” Ready for the car ride home.', do: async ({ r, tap }) => tap(r('button', { name: 'Add and finish' })) },
  ],
});

console.log('Recording the pilot features…');
await tour({
  slug: '4-pilot', role: 'Pilot features', layout: 'phone', accent: '#effad6', ua: IPHONE_UA,
  steps: [
    { title: 'If they answer', text: 'Every starter now carries its second move: what to ask once the kid actually says something.', do: async ({ r, tap, t }) => { await tap(r('button', { name: 'Try the demo' })); await t(/If they answer/).scrollIntoViewIfNeeded(); } },
    { title: 'The second move', text: 'After a talk that landed: one follow-up and a listening tip. “Wrong moment” is a new outcome that never counts against you.',
      do: async ({ r, tap, wait }) => { await tap(r('button', { name: 'I asked it' })); await wait(600); await tap(r('radio', { name: 'Good talk' })); } },
    { title: 'Import the week', text: 'Paste the newsletter. Rooted finds the dated lines; you untick what you don’t want.',
      do: async ({ r, tap, type, app, wait }) => { await tap(r('button', { name: 'Skip for now' })); await wait(600); await tap(r('tab', { name: 'Week' })); await wait(600); await tap(r('button', { name: 'Import' })); await wait(500); await type(app.getByLabel('Newsletter, syllabus or a few lines').filter({ visible: true }).first(), 'Spelling bee Nov 20\nPicture day 11/25'); await tap(r('button', { name: 'Find events' })); } },
    { title: 'Approve, then they land', text: 'Two found. Photos go through Claude on the real app; calendar links work anywhere.', do: async ({ r, tap }) => tap(r('button', { name: /Add 2 to Ava/ })) },
    { title: 'A reminder at pickup', text: 'Family → Reminder. A push at your hour with the kid’s name and the event. Never the question.',
      do: async ({ r, tap, wait }) => { await tap(r('tab', { name: 'Family' })); await wait(600); await tap(r('switch', { name: 'Daily reminder' })); await wait(400); await tap(r('button', { name: 'Pickup · 3 pm' })); } },
    { title: 'The experiment, in the open', text: 'Pilot mode alternates event questions with general ones. Grow shows the running tally: this is the pilot’s primary comparison.', do: async ({ r, tap }) => tap(r('tab', { name: 'Grow' })) },
    { title: 'Founding-family pilot', text: 'A real offer, counted against everyone who sees it. Four weeks for $59.', do: async ({ r, tap }) => tap(r('link', { name: /Founding-family pilot/ })) },
  ],
});

await browser.close();
server.kill();

// Combined video.
const list = join(TMP, 'list.txt');
writeFileSync(list, videos.map((v) => `file '${join(process.cwd(), v)}'`).join('\n'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', join(OUT, '0-full-walkthrough.mp4')]);
rmSync(TMP, { recursive: true, force: true });

// README.md
const title = { '1-parent': 'The core loop', '2-week': 'Sunday planning and Grow', '3-new-parent': 'A new parent, from zero', '4-pilot': 'Pilot features' };
let md = `# Rooted walkthrough\n\nRecorded from the production web build with demo data. Regenerate with \`npm run build:web && npm run walkthrough\`.\n\n`;
md += `**Full video:** [0-full-walkthrough.mp4](0-full-walkthrough.mp4)\n\n| Point of view | Video |\n|---|---|\n`;
for (const s of doc) md += `| ${title[s.slug]} | [${s.slug}.mp4](${s.slug}.mp4) |\n`;
for (const s of doc) {
  md += `\n## ${title[s.slug]}\n\n_${s.role}_ · [video](${s.slug}.mp4)\n\n`;
  s.steps.forEach((st, i) => {
    md += `### ${i + 1}. ${st.title}\n\n${st.text}\n\n<img src="screens/${st.file}" alt="${st.title}" width="${300}">\n\n`;
  });
}
writeFileSync(join(OUT, 'README.md'), md);
console.log('Done →', OUT);
