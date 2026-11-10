#!/usr/bin/env node
// The Rooted harness: every check the repo has, in order, with one table at the end.
// Usage: npm run harness            (typecheck, lint, unit, db rules, build, e2e)
//        npm run harness -- --quick (typecheck, lint, unit only)
//        npm run harness -- --live  (adds the live smoke test against Supabase)
import { spawnSync } from 'node:child_process';

const quick = process.argv.includes('--quick');
const live = process.argv.includes('--live');
const DB = process.env.TEST_DATABASE_URL ?? 'postgres://postgres@127.0.0.1:54329/es_test';

const steps = [
  ['Typecheck', 'npx', ['tsc', '--noEmit']],
  ['Lint', 'npx', ['expo', 'lint'], { CI: '1' }],
  ['Unit tests', 'npx', ['jest', '--ci']],
  ...(quick
    ? []
    : [
        ['Database rules', 'npm', ['run', 'test:db'], { TEST_DATABASE_URL: DB }],
        ['Web build', 'npm', ['run', 'build:web']],
        ['End-to-end', 'npx', ['playwright', 'test'], { CI: '1' }],
      ]),
  ...(live ? [['Live smoke', 'node', ['scripts/smoke/live.mjs']]] : []),
];

const results = [];
for (const [name, cmd, args, env] of steps) {
  const t0 = Date.now();
  process.stdout.write(`\n▶ ${name}\n`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...(env ?? {}) }, shell: process.platform === 'win32' });
  results.push({ step: name, ok: r.status === 0, seconds: Math.round((Date.now() - t0) / 1000) });
  if (r.status !== 0 && !process.argv.includes('--keep-going')) break;
}
console.log('\n' + results.map((r) => `${r.ok ? '✓' : '✗'} ${r.step.padEnd(16)} ${r.seconds}s`).join('\n'));
const failed = results.filter((r) => !r.ok);
if (failed.length || results.length < steps.length) {
  console.log(`\n${failed.length ? `Failed: ${failed.map((r) => r.step).join(', ')}` : 'Stopped early.'}`);
  process.exit(1);
}
console.log('\nAll green.');
