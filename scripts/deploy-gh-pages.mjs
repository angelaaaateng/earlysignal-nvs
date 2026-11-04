// Builds the web app for GitHub Pages and publishes it to the `gh-pages` branch.
//   npm run deploy:pages
// The site is served at https://<owner>.github.io/<repo>/. Set GH_PAGES_BASE=""
// when using a custom domain at the root.
import { execSync } from 'node:child_process';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sh = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const out = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();

const remote = out('git remote get-url origin');
const repo = remote.replace(/\.git$/, '').split('/').pop();
const base = process.env.GH_PAGES_BASE ?? `/${repo}`;
const sha = out('git rev-parse --short HEAD');

sh('node scripts/build-web.mjs', { env: { ...process.env, EXPO_BASE_URL: base } });

const tmp = mkdtempSync(join(tmpdir(), 'gh-pages-'));
cpSync('dist', tmp, { recursive: true });
const git = (c) => sh(`git ${c}`, { cwd: tmp });
git('init -q -b gh-pages');
git('add -A');
git(`-c user.name="${out('git config user.name') || 'EarlySignal deploy'}" -c user.email="${out('git config user.email') || 'deploy@localhost'}" commit -q -m "Deploy ${sha}"`);
// Force-push: gh-pages holds only the latest build output, never source.
sh(`git push -f "${remote}" HEAD:gh-pages`, { cwd: tmp });
rmSync(tmp, { recursive: true, force: true });
console.log(`Published ${sha} to gh-pages (base "${base}").`);
