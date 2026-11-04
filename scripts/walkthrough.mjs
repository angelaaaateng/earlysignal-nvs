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
@font-face{font-family:Bric;font-weight:800;src:url(${fontFile('BricolageGrotesque_800ExtraBold')})}
@font-face{font-family:Nun;font-weight:400;src:url(${fontFile('NunitoSans_400Regular')})}
@font-face{font-family:Nun;font-weight:800;src:url(${fontFile('NunitoSans_800ExtraBold')})}`;

const stage = (layout, role, accent) => `<!doctype html><html><head><style>${FONTS}
*{box-sizing:border-box} body{margin:0;width:1600px;height:900px;background:#2A1B12;overflow:hidden;font-family:Nun,sans-serif;color:#FBF1E4}
#app{position:absolute;overflow:hidden;background:#3A2416}
#app iframe{border:0;display:block}
.phone #app{left:150px;top:28px;width:390px;height:844px;border-radius:44px;box-shadow:0 0 0 10px #140b06,0 0 0 11px #5A3A24,0 30px 90px rgba(0,0,0,.55)}
.phone #cap{position:absolute;left:640px;top:0;width:860px;height:900px;display:flex;flex-direction:column;justify-content:center;gap:18px}
.desk #app{left:160px;top:150px;width:1280px;height:730px;border-radius:14px;box-shadow:0 0 0 1px #5A3A24,0 24px 80px rgba(0,0,0,.5)}
.desk #cap{position:absolute;left:160px;top:22px;width:1280px;height:120px;display:flex;flex-direction:column;justify-content:center;gap:6px}
.desk #title{font-size:34px} .desk #text{font-size:19px;max-width:1280px}
#chip{align-self:flex-start;font-weight:800;font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:#2E1B10;background:${accent};padding:7px 14px;border-radius:999px}
.desk #chip{display:none}
#step{font-weight:800;font-size:16px;letter-spacing:.12em;text-transform:uppercase;color:#E8B23A}
#title{font-family:Bric,sans-serif;font-weight:800;font-size:52px;line-height:1.05;margin:0}
#text{font-size:24px;line-height:1.45;color:#E2CDB8;margin:0;max-width:820px}
#cap>*{transition:opacity .25s} .fade>*{opacity:0}
.tap{position:absolute;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(232,178,58,.45);border:3px solid #E8B23A;pointer-events:none;animation:tap .6s ease-out forwards;z-index:9}
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
  await app.getByText('Who’s signing in?').waitFor();
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
console.log('Recording student…');
await tour({
  slug: '1-student', role: 'Student · Maya, 11', layout: 'phone', accent: '#E8B23A', ua: IPHONE_UA,
  steps: [
    { title: 'Install it from Safari or Chrome', text: 'No app store. On iPhone: Share → Add to Home Screen. On Android or desktop Chrome: tap Install. It opens full screen, with its own icon, and works offline.' },
    { title: 'Pick who’s signing in', text: 'One app, three roles. Each role only reaches its own screens, even by typed URL.', do: async ({ t }) => t('Who’s signing in?').scrollIntoViewIfNeeded() },
    { title: 'The Burrow', text: 'Maya’s home: 124 acorns, a 9-day streak, Burrow level 3 and 36 acorns to the garden room. Tonight’s quests sit underneath.', do: async ({ t, tap }) => tap(t('I’m a student')) },
    { title: 'Daily check-in', text: 'One tap: how heavy is today? Nothing is pre-selected, so Pip never suggests an answer.', do: async ({ t, tap }) => tap(t('Check in', { exact: true })) },
    { title: 'Pip reacts to each answer', text: 'The sky over the Burrow changes from sunny to stormy, and Pip’s reply and the next step change with it.', dwell: 900,
      do: async ({ r, tap, wait }) => { for (const n of ['1, Light', '2, Okay', '3, Medium', '5, A lot', '4, Heavy']) { await tap(r('radio', { name: n })); await wait(1100); } } },
    { title: 'A private note, only for Pip', text: 'Optional. Notes are stored apart from everything else and never reach a parent, the school or the logs.',
      do: async ({ app, type }) => type(app.getByLabel(/Anything on your mind/).filter({ visible: true }).first(), 'big science thing tomorrow') },
    { title: 'Pip makes the night smaller', text: 'Because today feels heavy, the science lab is split into 3 short steps. The boss battle on Friday shows prep progress. +5 acorns for checking in.',
      do: async ({ r, tap }) => tap(r('button', { name: 'Make it smaller' })) },
    { title: 'Focus sprint', text: 'A real countdown for the next step, capped at 25 minutes. Pip studies along.', do: async ({ r, tap }) => tap(r('button', { name: /focus sprint/ })) },
    { title: 'Pause, and hints that aren’t answers', text: 'Pause takes a breath. “Get a hint” nudges without giving the answer away.',
      do: async ({ r, tap, wait }) => { await tap(r('button', { name: 'Pause' })); await wait(1300); await tap(r('button', { name: 'Resume' })); await wait(600); await tap(r('button', { name: 'Get a hint' })); } },
    { title: 'Step done, rewards land', text: 'Back in the Burrow: 129 acorns, a 10-day streak, and the lab moves to step 3 of 3.', do: async ({ r, tap }) => tap(r('button', { name: 'I finished this step' })) },
    { title: 'Finish the quest', text: 'Ticking the last step completes the quest and pays its 15 acorns. Un-ticking takes them back.',
      do: async ({ r, tap, wait }) => { await tap(r('tab', { name: 'Quests' })); await wait(900); await tap(r('checkbox', { name: /Answer the 2 conclusion/ })); await wait(900); await tap(r('tab', { name: 'Burrow' })); } },
    { title: 'Maya controls what Mom sees', text: 'Four switches, owned by the student. Mood is shared as a weekly average, never each day’s answer. Notes, messages and location are always private.',
      do: async ({ r, tap }) => tap(r('tab', { name: 'Me' })) },
    { title: 'Turn a switch on', text: 'Maya decides to share upcoming tests. It applies to Mom’s summary immediately.', do: async ({ r, tap }) => tap(r('switch', { name: 'Upcoming tests' })) },
    { title: 'Preview exactly what Mom sees', text: 'The same summary her parent receives, built from the same rules. No surprises.', do: async ({ t, tap }) => tap(t(/Friday summary →/)) },
  ],
});

console.log('Recording parent…');
await tour({
  slug: '2-parent', role: 'Parent · Ana, Maya’s mom', layout: 'phone', accent: '#DCEBD2', ua: IPHONE_UA,
  steps: [
    { title: 'Maya’s week', text: 'Check-ins, quests finished and the streak, if Maya shares them. Mood shows as weekly averages for five weeks.', do: async ({ t, tap }) => tap(t('I’m a parent')) },
    { title: 'Win, watch, and what to say', text: 'Plain-language highlights built only from what’s shared, plus one calm line to try at dinner.',
      do: async ({ t }) => t('Try saying tonight').scrollIntoViewIfNeeded() },
    { title: 'Send a cheer', text: 'One tap. Pip delivers it in the Burrow.', do: async ({ r, tap }) => tap(r('button', { name: 'Send a cheer' })) },
    { title: 'Get human help', text: 'For anything bigger than study habits: the school counselor first, then vetted coaches and a partner clinic.', do: async ({ r, tap }) => tap(r('link', { name: 'Get help' })) },
    { title: 'A message, drafted for you', text: 'Pick who to contact and EarlySignal drafts the first message. Copy it into email or text.',
      do: async ({ r, tap, wait }) => { await tap(r('radio', { name: /Executive-function coach/ })); await wait(1000); await tap(r('button', { name: 'Copy message' })); } },
    { title: 'Crisis line, always visible', text: 'If a child may be in danger: call or text 988 (U.S.).', do: async ({ t }) => t(/call or text/).scrollIntoViewIfNeeded() },
    { title: 'Account and consent records', text: 'Each child’s account shows the parental consent on file.', do: async ({ r, tap }) => tap(r('tab', { name: 'Account' })) },
    { title: 'Add a child', text: 'Parents create student accounts. The birth date is used only to check whether consent is needed.',
      do: async ({ r, tap, type, app }) => {
        await tap(r('button', { name: 'Set up a child’s account' }));
        const f = (l) => app.getByLabel(l).filter({ visible: true }).first();
        await type(f('First name'), 'Leo'); await type(f('Last name'), 'Santos'); await type(f('Birth date'), '2017-02-10');
      } },
    { title: 'Under 13: consent comes first', text: 'COPPA. A plain-language notice of what’s collected, what stays private and the parent’s rights. No account exists yet.',
      do: async ({ r, tap }) => tap(r('button', { name: 'Continue' })) },
    { title: 'Verify and agree', text: 'Choose a verification method and confirm you’re the parent or guardian. (Verification is simulated in this mock build.)',
      do: async ({ r, tap, wait }) => { await tap(r('radio', { name: /Signed form/ })); await wait(600); await tap(r('checkbox')); } },
    { title: 'Only then is the account created', text: 'The consent record is written first, then Leo’s account, linked to it. It can’t happen the other way round.',
      do: async ({ r, tap }) => tap(r('button', { name: 'Give consent and create account' })) },
    { title: 'Both children, both consents on file', text: 'Leo now appears with his consent record.', do: async ({ r, tap }) => tap(r('button', { name: 'Back to Account' })) },
  ],
});

console.log('Recording privacy rules…');
await tour({
  slug: '3-privacy', role: 'The rules, live', layout: 'phone', accent: '#F9DCC8', ua: IPHONE_UA,
  steps: [
    { title: 'Maya writes a private note', text: 'A hard day, and a note she doesn’t want anyone else to read.',
      do: async ({ t, r, tap, type, app }) => {
        await tap(t('I’m a student')); await tap(t('Check in', { exact: true })); await tap(r('radio', { name: '5, A lot' }));
        await type(app.getByLabel(/Anything on your mind/).filter({ visible: true }).first(), 'please don’t tell mom about the quiz');
      } },
    { title: 'And stops sharing her mood', text: 'She turns off “Weekly mood trend” and “Quests finished”.',
      do: async ({ r, tap, wait }) => { await tap(r('button', { name: 'Pick one thing' })); await wait(700); await tap(r('tab', { name: 'Me' })); await wait(700); await tap(r('switch', { name: 'Weekly mood trend' })); await wait(500); await tap(r('switch', { name: 'Quests finished' })); } },
    { title: 'Mom’s view respects it', text: 'Mood and check-ins read “private”. The note is nowhere: it was never part of what a parent can receive.',
      do: async ({ r, t, tap, wait }) => { await tap(r('button', { name: 'Sign out' })); await wait(800); await tap(t('I’m a parent')); } },
    { title: 'The school sees even less', text: 'The counselor only sees families who opted in, and only the signals each student shares. Never notes, messages or grades.',
      do: async ({ r, t, tap, wait }) => { await tap(r('tab', { name: 'Account' })); await wait(600); await tap(r('button', { name: 'Sign out' })); await wait(800); await tap(t('School or clinic admin')); await wait(900); await tap(r('button', { name: 'All families' })); } },
    { title: 'Every view and change is audited', text: 'Diagnostics shows the redacted event log: sign-ins, sharing changes, who viewed whose summary. The note text is redacted before it’s logged.',
      do: async ({ go }) => go('/diagnostics') },
  ],
});

console.log('Recording admin…');
await tour({
  slug: '4-admin', role: 'Admin', layout: 'desk', accent: '#E8B23A', ua: DESK_UA,
  steps: [
    { title: 'Partner dashboard (web) · Ms. Patel, school counselor', text: 'Families enrolled, weekly self-starters, who needs follow-up and open referrals. Only opted-in families count.', do: async ({ t, tap }) => tap(t('School or clinic admin')) },
    { title: 'Patterns, not raw data', text: 'Stress 4+ for 3 weeks, check-ins that stopped, quest steps missed before tests. Conclusions only, from what each student shares.' },
    { title: 'All families', text: 'Every opted-in family, flagged first. Families that didn’t opt in never appear.', do: async ({ r, tap }) => tap(r('button', { name: 'All families' })) },
    { title: 'See what a family shares', text: '“View” lists the signals this student shares. Nothing more.', do: async ({ r, tap }) => tap(r('button', { name: 'View' })) },
    { title: 'Suggest an EF coach', text: 'A referral is created and joins the queue on the right.',
      do: async ({ r, tap, wait }) => { await tap(r('button', { name: 'Needs follow-up (3)' })); await wait(700); await tap(r('button', { name: 'Suggest coach' })); } },
    { title: 'Reach out', text: 'Mark a family as contacted.', do: async ({ r, tap }) => tap(r('button', { name: 'Reach out' })) },
    { title: 'Referrals', text: 'Every open referral and its status.', do: async ({ r, tap }) => tap(r('link', { name: 'Referrals' })) },
    { title: 'Observability built in', text: 'Diagnostics: release, session, install state and the redacted audit log. In production the same events stream to your log platform.', do: async ({ go }) => go('/diagnostics') },
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
const title = { '1-student': 'Student', '2-parent': 'Parent', '3-privacy': 'The privacy rules, live', '4-admin': 'Admin (web)' };
let md = `# EarlySignal walkthrough\n\nRecorded from the production web build with mock data. Regenerate with \`npm run build:web && npm run walkthrough\`.\n\n`;
md += `**Full video:** [0-full-walkthrough.mp4](0-full-walkthrough.mp4)\n\n| Point of view | Video |\n|---|---|\n`;
for (const s of doc) md += `| ${title[s.slug]} | [${s.slug}.mp4](${s.slug}.mp4) |\n`;
for (const s of doc) {
  md += `\n## ${title[s.slug]}\n\n_${s.role}_ · [video](${s.slug}.mp4)\n\n`;
  s.steps.forEach((st, i) => {
    md += `### ${i + 1}. ${st.title}\n\n${st.text}\n\n<img src="screens/${st.file}" alt="${st.title}" width="${s.slug === '4-admin' ? 720 : 300}">\n\n`;
  });
}
writeFileSync(join(OUT, 'README.md'), md);
console.log('Done →', OUT);
