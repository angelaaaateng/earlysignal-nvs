# The Rooted harness: how to brief an agent and know it is done

This is the contract between you (PM) and whoever builds, human or Claude. Paste the **brief template** into a new session; the agent follows `AGENTS.md`; the **definition of done** is machine-checked by `npm run harness`.

## 1. What runs, and what it proves

| Check | Command | Proves |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | The code compiles, including every screen and the backend seam. |
| Lint | `npx expo lint` | Hook rules, imports, Expo conventions. |
| Unit (26) | `npx jest` | Library rules (open questions, under 15 words, every event kind before and after), suggestion ranking, experiment arms, counting rules, import parsing, ownership checks, logger redaction. |
| Database rules (11) | `npm run test:db` | The real migrations on Postgres, hit as two parents and anonymous: isolation, cascades, audit, impressions, nudges, pilot interest. |
| End-to-end (46 runs) | `npm run test:e2e` | iPhone, Pixel and desktop Chrome against the production build: core loop, second move, import, repeat weekly, reminders, pilot mode, pilot offer, password reset entry, PWA install and offline, headers, zero console errors. |
| Live smoke | `npm run smoke:live` | The real Supabase project with throwaway accounts: sign-up, kid, event, talk, audit, a second parent sees nothing, anonymous sees nothing. |

`npm run harness` runs the first six in order and prints one table. CI (`.github/workflows/ci.yml`) runs the same on every push to `main`.

## 2. Brief template (paste into a new Claude Code session)

```
You are working on Rooted (github.com/angelaaaateng/earlysignal-nvs). Read AGENTS.md and docs/HARNESS.md first.

Goal: <one sentence: the parent outcome, not the feature>
Why now: <the risk from docs/roadmap.md it removes, or the pilot metric it moves>
Scope: <screens / tables / functions it touches; what it must NOT touch>
Design: <design-system components to use; copy rules; one primary action>
Data: <new columns or tables, with the RLS rule; what stays on the device>
Done when:
  - npm run harness is green (add unit, db and e2e tests for the new behaviour)
  - npm run smoke:live passes if the backend changed
  - docs/TESTING.md and README.md describe the feature in one paragraph each
  - a before/after screenshot is in the final message
Do not: invent questions outside src/domain/library.ts; add child data; add streaks or scores.
```

## 3. Definition of done (checklist the agent repeats back)

- [ ] Typecheck, lint, unit, database rules, build, e2e: all green locally (`npm run harness`).
- [ ] New behaviour has a unit test (domain), a database test (if a table or policy changed) and an e2e test (if a screen changed).
- [ ] Live smoke passes if `supabase/` changed, and the migration was applied to the project.
- [ ] `docs/TESTING.md` tells a tester how to try it in under five steps.
- [ ] README feature list and `docs/roadmap.md` status updated.
- [ ] Screenshots or a re-recorded walkthrough for visible changes.
- [ ] Nothing in the diff violates the seven rules in `AGENTS.md`.

## 4. Local setup (once)

```bash
npm install
npm run db:local start          # Postgres 16 on 127.0.0.1:54329 (scripts/db-local.sh)
npm run harness                 # ~4 minutes end to end
```

Real backend locally: copy the two public values from `vercel.json` into `.env` as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `EXPO_PUBLIC_FORCE_MOCK=1` forces the demo.

## 5. Live project settings that must stay as they are

- Supabase Auth → Email provider ON, **Confirm email OFF** (no mail provider; password reset uses Supabase's built-in mailer, which is rate-limited to a few per hour).
- Edge function secrets: `ANTHROPIC_API_KEY` (photo and text import through Claude). Add it in Supabase → Edge Functions → Secrets.
- Vault: `vapid_public`, `vapid_private`, `cron_secret` (web push). Rotate with `node -e "console.log(require('web-push').generateVAPIDKeys())"`, update Vault and `EXPO_PUBLIC_VAPID_PUBLIC_KEY` in `vercel.json`.
- pg_cron job `rooted-send-nudges` runs at :05 every hour and posts to the `send-nudges` function with the cron secret.
- Vercel: production branch `main`; `vercel.json` carries the public env.

## 6. Reading the pilot

`SUPABASE_SERVICE_ROLE_KEY=… npm run export:prompt-stats > prompt-stats.csv` gives shown / asked / landed per question and per arm across all families. The brief's primary comparison is `ask_rate` for `arm=event` vs `arm=generic`.
