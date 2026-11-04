// After `expo export -p web`: stamp the service worker with a unique build id
// and the list of every build file, so the installed app works fully offline
// (Expo Router loads each route's code lazily, so runtime caching alone would
// miss screens the user hasn't opened yet).
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { execSync } from 'node:child_process';

const dir = process.argv[2] ?? 'dist';
let sha = 'local';
try {
  sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {}
const id = `${sha}-${Date.now().toString(36)}`;

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(dir)
  .map((f) => '/' + relative(dir, f).split(sep).join('/'))
  .filter((f) => /^\/(_expo\/static\/|assets\/|icons\/)/.test(f) && !f.endsWith('.map'));

const file = join(dir, 'sw.js');
const src = readFileSync(file, 'utf8');
if (!src.includes('__BUILD_ID__') || !src.includes('__PRECACHE__')) throw new Error('sw.js placeholders missing');
writeFileSync(file, src.replace('__BUILD_ID__', id).replace("'__PRECACHE__'", JSON.stringify(files)));
console.log(`sw.js build id ${id}, precaching ${files.length} files`);
