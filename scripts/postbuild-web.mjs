// After `expo export -p web`: stamp the service worker with a unique build id
// and the list of every build file, so the installed app works fully offline
// (Expo Router loads each route's code lazily, so runtime caching alone would
// miss screens the user hasn't opened yet).
import { copyFileSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { execSync } from 'node:child_process';

const dir = process.argv[2] ?? 'dist';
/** e.g. '/earlysignal-nvs' for GitHub Pages; '' at the site root. */
const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
let sha = 'local';
try {
  sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {}
const id = `${sha}-${Date.now().toString(36)}`;

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(dir)
  .map((f) => '/' + relative(dir, f).split(sep).join('/'))
  .filter((f) => /^\/(_expo\/static\/|assets\/|icons\/)/.test(f) && !f.endsWith('.map'))
  .map((f) => base + f);

const file = join(dir, 'sw.js');
const src = readFileSync(file, 'utf8');
for (const ph of ["'__BUILD_ID__'", "'__BASE__'", "'__PRECACHE__'"]) if (!src.includes(ph)) throw new Error(`sw.js placeholder ${ph} missing`);
// Replace the quoted placeholders only (the bare names also appear in a comment).
writeFileSync(
  file,
  src
    .replaceAll("'__BUILD_ID__'", JSON.stringify(id))
    .replaceAll("'__BASE__'", JSON.stringify(base))
    .replaceAll("'__PRECACHE__'", JSON.stringify(files)),
);
console.log(`sw.js build id ${id}, precaching ${files.length} files`);

if (base) {
  // index.html and the manifest use root paths; point them at the sub-path.
  const html = join(dir, 'index.html');
  writeFileSync(html, readFileSync(html, 'utf8').replace(/(href|src)="\/(?!\/)/g, `$1="${base}/`).replace(new RegExp(`${base}${base}/`, 'g'), `${base}/`));
  const mf = join(dir, 'manifest.json');
  const m = JSON.parse(readFileSync(mf, 'utf8'));
  const fix = (u) => (u.startsWith('/') && !u.startsWith(base + '/') ? base + u : u);
  m.id = fix(m.id); m.start_url = `${base}/`; m.scope = `${base}/`;
  m.icons = m.icons.map((i) => ({ ...i, src: fix(i.src) }));
  m.shortcuts = (m.shortcuts ?? []).map((s) => ({ ...s, url: fix(s.url), icons: (s.icons ?? []).map((i) => ({ ...i, src: fix(i.src) })) }));
  writeFileSync(mf, JSON.stringify(m, null, 2));
  console.log(`rewrote index.html + manifest.json for base ${base}`);
}
// Static hosts without rewrites (GitHub Pages): deep links fall back to the app shell.
copyFileSync(join(dir, 'index.html'), join(dir, '404.html'));
// Expo output has _-prefixed folders; stop Jekyll from dropping them.
writeFileSync(join(dir, '.nojekyll'), '');
