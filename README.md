# Rooted

**Know what to ask your kid, and when.** Rooted is a parent-only app for parents of middle and high schoolers. On Sunday you add what’s on your kid’s week (a math test, a tryout, a dance). At pickup you get one question worth asking about it, with a tip on how to ask. One tap says how it went. Kids never use the app and have no account.

Built for Chicago Booth New Venture Strategy (Nov 2026). Product brief: `docs/product-brief.md`. Design system: https://claude.ai/artifact/PJ8CZsmtkn22WKNqRqnSCk.

## Try it

| | URL | Data |
|---|---|---|
| **Demo** | https://angelaaaateng.github.io/earlysignal-nvs/ | Example family on your device (Maya, with Ava in 6th grade and Leo in 8th). Tap **Try the demo**. |
| **Real app** | https://earlysignal-nvs.vercel.app | Your own account (Supabase). Tester login in `docs/TESTING.md`. |

Both install as a phone app from Safari (Share → Add to Home Screen) or Chrome (Install) and work offline after the first load. Video and screenshots: `docs/walkthrough/`.

## The core loop (MVP, brief §10)

1. **Sunday check-in** (Grow tab): see the week that was, add next week’s events.
2. **During the week** (Home): tonight’s starter is about the nearest event, before or after it. “Try another” rotates within the reviewed library. Three questions per event live on the Week tab.
3. **After the talk** (I asked it): four seeds from “Not tonight” to “We really talked”, where you were, and an optional note that **stays on the device**.
4. **Next week**: questions this kid rated “Not tonight” sink; ones that landed rise; anything asked in the last ten days is skipped.

## Pilot features (shipped 10 Nov)

- **Second move.** After a talk that landed, one follow-up question and a listening tip for its topic. "Wrong moment" is a fifth outcome and never counts against anyone.
- **Smart-timing nudge.** Family → Reminder: pick pickup, after school, dinner or bedtime. A web push with the kid's name and the event, never the question. `send-nudges` edge function, hourly `pg_cron`, VAPID keys in Vault.
- **Import the week.** Paste a newsletter (local parser), snap a photo (Claude Opus 5.5 through the `extract-events` edge function), or paste a calendar link (ICS). Approve every row. "Repeats weekly" on the event form adds eight weeks.
- **The experiment.** Pilot mode alternates event-specific and generic starters per family per day. Every starter shown is an impression; every talk carries its arm. `prompt_stats` view and `npm run export:prompt-stats`.
- **Forgot password** via Supabase's recovery email and `/reset-password`.
- **Founding-family pilot** offer on Grow with interest capture (`EXPO_PUBLIC_CHECKOUT_URL` turns it into a checkout link).
- **Desktop layout:** sidebar and two columns above 1180px, stacked below, single column with the floating tab bar on phones.

## Product principles, enforced in code

| Principle | Where |
|---|---|
| Parent-only; no child data | There is no child account type anywhere. `kids` holds a first name, grade, interests and activities. |
| Share effort, never content | Notes are written to the device only (`src/data/notes.ts`); the database never sees them (`e2e/core-loop.spec.ts` proves a note never reaches the audit log). |
| Invite, never grade | No streaks, scores or comparisons. `src/domain/stats.ts` counts talks and weeks-with-a-talk; “Not tonight” never counts against anyone. |
| Reviewed library, not generation | Every question is a hand-written entry in `src/domain/library.ts` (27 event prompts across 9 event kinds, before and after, plus 14 generic). The app only chooses among them (`src/domain/suggest.ts`). |
| One parent cannot see another | Row-level security on every table; `supabase/tests/rls.test.ts` proves it on a real Postgres. |

## Stack

Expo SDK 58 / React Native / TypeScript, Expo Router (`src/app`), one codebase for web (PWA), iOS and Android. Supabase (Postgres + Auth) behind a backend seam (`src/data/backend.ts`) with an on-device mock for the demo. Fonts: Plus Jakarta Sans and Geist Mono. Tokens from the design system in `src/ui/theme.ts`.

```bash
npm install
npx expo start --web            # dev, demo data
npm run build:web && npm run serve:web   # production web build on :8080
npm run check                   # typecheck, lint, unit, database rules
npm run test:e2e                # Playwright against the production build
npm run walkthrough             # re-record docs/walkthrough
```

Real backend: set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (both public by design; `vercel.json` sets them for the Vercel deploy). `EXPO_PUBLIC_FORCE_MOCK=1` forces the demo.

## Backend (Supabase)

`supabase/migrations/` is the whole backend: `parents`, `kids`, `events`, `talks`, `week_reviews`, `audit_log`, and from v2 `push_subscriptions`, `impressions`, `pilot_interest`, the `prompt_stats` view and the nudge functions. Edge functions: `extract-events` (Claude) and `send-nudges` (web push). Every row carries `parent_id` (defaulted to `auth.uid()`), and every policy is `parent_id = auth.uid()`. A trigger creates the parent row on sign-up; `delete_my_account()` removes everything. Sign-in is email + password; Supabase “Confirm email” stays OFF (no mail provider yet).

Database rule tests (`npm run test:db`, 11 tests on Postgres 17 in CI) run the migration and hit it as two parents and anonymous: isolation, cascade deletes, audit, anon gets nothing.

## Testing and CI

- **Unit (Jest, 26 tests):** library rules (open questions, under 15 words, every kind covered before and after), suggestion ranking and experiment arms, counting rules, import parsing, ownership checks in writes, logger redaction.
- **Database (11 tests):** see above, plus the v2 tables (impressions, push subscriptions, pilot interest, nudge targets).
- **End-to-end (Playwright, 46 runs):** iPhone 14, Pixel 7 and desktop Chrome against the production build: the core loop, second move, import, repeat weekly, reminders and pilot mode, the pilot offer, password reset entry, the week, Sunday check-in, a new parent from zero, PWA install metadata, offline launch, security headers, audit log, zero console errors.
- **CI:** `.github/workflows/ci.yml` on every push to `main`: typecheck, lint, unit, database rules, e2e, iOS + Android bundle.
- **Live smoke:** `node scripts/smoke/live.mjs` runs the loop against the real project with throwaway accounts and checks a second parent sees nothing.

## Observability

`src/observability/`: structured JSON logs with redaction (keys like `note`, `name`, `question` content never reach a sink), audit events for every write, error boundary, metrics, `/diagnostics` screen, optional HTTP sink via `EXPO_PUBLIC_LOG_ENDPOINT`.

## Working on it

`AGENTS.md` is the working agreement; `docs/HARNESS.md` is the brief template and definition of done; `npm run harness` is the gate. `docs/roadmap.md` has Now / Next / Later.

## Not in this build

Full OAuth calendar sync (ICS links work), AI phrasing of questions, the growing family tree, badges, community prompts, parent groups, topic packs, co-parent sharing, Stripe checkout (the offer captures interest and opens a link if configured), app-store builds, native push.
