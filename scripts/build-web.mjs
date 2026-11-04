// Production web build: stamps the release id, exports, then stamps sw.js.
import { execSync } from 'node:child_process';

let release = 'local';
try {
  release = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {}
const env = { ...process.env, EXPO_PUBLIC_RELEASE: process.env.EXPO_PUBLIC_RELEASE ?? release, CI: '1' };
execSync('npx expo export -p web --output-dir dist', { stdio: 'inherit', env });
execSync('node scripts/postbuild-web.mjs dist', { stdio: 'inherit', env });
