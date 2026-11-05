# EarlySignal

Better study habits for kids. Calm, early signals for families.

One Expo (React Native) app with role-based sign-in: **student**, **parent** and **admin**. Student and parent run on iOS, Android and web. The admin partner dashboard is web-only: on a phone, an admin sees a "use a computer" screen.

Built from the *EarlySignal App Mockups* Claude Design canvas: same screens, colours (exact hex), fonts (Bricolage Grotesque + Nunito Sans) and copy.

Two backends, same screens: **demo data on the device** (the default, `src/data/seed.ts`) and **Supabase** (real accounts, Postgres with the four rules enforced in the database). Set `EXPO_PUBLIC_SUPABASE_URL` and `_PUBLISHABLE_KEY` to switch. The public GitHub Pages build runs on demo data.

## Run it

```bash
npm install
npm run web          # dev server; or npm run ios / npm run android (Expo Go)
npm run check        # typecheck + lint + unit tests
npm run build:web    # production web build → dist/ (the installable app)
npm run serve:web    # serve dist/ on :8080 with production headers
npm run test:e2e     # end-to-end on iPhone, Android and desktop profiles (needs build:web)
npm run walkthrough  # re-record the video + screenshot walkthrough (needs build:web)
```

On the sign-in screen, each card signs in a demo account: Maya (student, 11), Ana (Maya's mom), Ms. Patel (counselor at Lincoln Middle School). `/diagnostics` has a **Reset demo data** button.

**Walkthrough:** [docs/walkthrough/README.md](docs/walkthrough/README.md): a captioned video per point of view (student, parent, privacy rules live, admin), a combined 3-minute video, and a screenshot of every step.

## Use it as a phone app, without an app store

The web build is an installable web app (PWA). Once it's hosted on an HTTPS URL:

- **iPhone / iPad (Safari):** open the link → Share → **Add to Home Screen**.
- **Android (Chrome):** open the link → tap **Install** on the banner (or ⋮ → Install app).
- **Desktop Chrome / Edge:** the install icon in the address bar.

It then opens full screen with its own icon, keeps its data between launches, and works offline: the service worker precaches every screen at install. A new deploy is picked up on the next launch. The sign-in screen shows the right install hint for the browser.

Pieces: `public/manifest.json`, `public/index.html` (iOS home-screen tags, `viewport-fit=cover` for the notch), `public/sw.js` + `scripts/postbuild-web.mjs` (per-build cache name and precache list), icons generated from Pip by `npm run icons`.

**Live, two deployments:**
- **Demo (mock data):** https://angelaaaateng.github.io/earlysignal-nvs/ (GitHub Pages; redeploys on every push to `main`). The role cards open example accounts.
- **Real accounts (Supabase):** https://earlysignal-nvs.vercel.app (Vercel; `vercel.json` sets the Supabase URL and publishable key at build time). Parents sign up by email or Google; a parent's tap signs their child in; admins by invite.

## Observability and logging

`src/observability/` is vendor-neutral; adding Sentry, Datadog or OpenTelemetry means adding a sink.

- **Structured logs.** Every entry is JSON: time, level, category (`app`, `audit`, `metric`, `nav`, `error`), event, session id, release (git sha), platform, user id and role.
- **Redaction by default.** Values under keys like `note`, `text`, `draft`, `name`, `birth`, `message` are replaced with `[redacted]` before any sink sees them. A private note can't reach a log, and unit and e2e tests check this.
- **Audit trail.** Every write (`checkin.submit`, `sharing.update`, `student.account.create_with_consent`, `referral.suggest_coach`, …) is logged with who did it, the outcome and timing. So is every view of someone else's data (`parent.summary.view`, `admin.dashboard.view`).
- **Errors.** A root error boundary shows a calm "try again" screen and logs the crash. Uncaught errors and promise rejections are captured on web and native.
- **Metrics.** App-ready time, screen views, action latency.
- **Sinks.** Console (dev); in-memory ring buffer, kept on the device on web (redacted), shown at `/diagnostics`; and an HTTP batch sink, switched on by setting `EXPO_PUBLIC_LOG_ENDPOINT` (add its origin to `connect-src` in `scripts/headers.mjs`).
- **Server.** `scripts/serve.mjs` writes one JSON access-log line per request.

## Testing and CI

- **Unit (Jest, 28 tests):** the four access rules in the mock domain, the check-in and quest loop, COPPA, logger redaction.
- **Database (Jest + pg, 18 tests):** the real migration on Postgres, queried as each role with no app code: the four rules, account creation, audit log, consent withdrawal and deletion.
- **End-to-end (Playwright, 44 runs):** against the production build, on iPhone 14, Pixel 7 and desktop profiles. Covers the full student loop, the parent summary and help, the COPPA flow, the admin dashboard, private notes never reaching parent, admin or logs, live sharing changes, role guards on typed URLs, persistence across reloads, PWA install metadata, offline launch, deep links, security headers, the audit log and zero console errors.
- **CI:** `.github/workflows/ci.yml` runs typecheck, lint, unit, database rules (Postgres 17 service), e2e (with a report on failure) and an iOS + Android bundle build, on every PR and push to `main`.
- **Security headers:** CSP, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a Permissions-Policy that blocks camera, microphone and location. Hashed build files are cached for a year; HTML and the service worker are never cached.

## Backend (Supabase)

`supabase/migrations/20261105000000_schema.sql` is the whole backend: tables, row-level security, and the functions the app calls. `supabase/tests/rls.test.ts` runs that migration against a real Postgres and hits it **as each role, with no app code**, to prove the rules hold for anyone who talks to the database directly (18 tests, in CI on Postgres 17).

**How people sign in and get accounts**

| Who | Sign-in | Account comes from |
|---|---|---|
| Parent | Email + one-time code (no password) | Entering an email the first time. A trigger creates the parent row and their family. |
| Student | Nothing to type. The parent taps **Open [child]'s Burrow** on the Account tab; a 10-minute single-use token signs the child in on that device. | The parent, from the Account tab. Under 13 → consent recorded first, or `create_student()` refuses. |
| Admin | Email + one-time code | Invite only: an `admin_invites` row must exist for the email (see `supabase/seed`). |

**Where the four rules live in the database**

| Rule | Mechanism |
|---|---|
| Parents see only what the student shares | `parent_weekly_summary()` reads `sharing_settings` and adds only shared fields. Per-day scores never leave: no parent policy exists on `check_ins`. Only the student can update `sharing_settings` (RLS). |
| Admins see only families that opted in | `admin_can_see_family()` gates every admin policy and function: same org **and** `families.admin_opt_in`. The parent controls opt-in (`set_family_admin_opt_in`). |
| Private notes are never shared | `private_notes` has exactly one policy: the student's own rows. No parent or admin policy exists, and projections never read the table. |
| COPPA consent before any under-13 account | `create_student()` is the only path that inserts a student; under 13 it requires a matching, unused, unrevoked `parental_consents` row. `revoke_consent_and_delete_student()` deletes everything. |

Every write and every view of someone else's data lands in `audit_log` with the actor.

**Set up a project** (once you have a Supabase account):

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push                          # applies supabase/migrations
# optional pilot org + admin invite: edit the email, then run supabase/seed/seed_pilot.sql in the SQL editor
cp .env.example .env.local                     # fill in the URL and publishable key from Project Settings → API
```

In the dashboard: Auth → Providers → Email: keep "Confirm email" off (the app uses one-time codes), and change the Magic Link template to include `{{ .Token }}` so the email carries a code. Auth → URL configuration: add the site URL(s).

**Run the database tests locally** without Docker:

```bash
eval "$(npm run -s db:local)"    # starts a throwaway Postgres (needs postgresql installed) and exports TEST_DATABASE_URL
npm run test:db
```

## Layout

```
e2e/                   Playwright end-to-end specs
scripts/               web build, static server + headers, icons, walkthrough recorder
public/                PWA manifest, HTML template, service worker, icons
supabase/              migrations (the backend), RLS tests, CLI config, pilot seed
src/
  app/                 Expo Router screens (one file per canvas artboard)
    index.tsx          0  · Sign in (pick a role)
    student/           S1 Burrow · S2 check-in · S3 quests · S4 focus · S5 me (sharing) · preview
    parent/            P1 weekly summary · P2 help · account · add-child (COPPA flow)
    admin/             A1 partner dashboard (web)
    diagnostics.tsx    support screen: release, install state, redacted logs, reset
  domain/              Pure TypeScript. Data model, access rules, mutations. No React.
    types.ts           users, orgs, families, consents, check-ins, private notes, quests,
                       quest steps, acorns, sharing settings, cheers, referrals, help contacts
    access.ts          role checks, family membership, admin opt-in gate
    student.ts         the student's own view
    parent.ts          parent weekly summary projection
    admin.ts           admin dashboard projection
    coppa.ts           parental consent + the only student-account creation path
    mutations.ts       every write, each checked against the acting user
  data/                backend.ts (the seam), mockBackend.ts, supabaseBackend.ts, AppStore (session + loading)
  lib/supabase.ts      Supabase client (session persisted on device)
  observability/       Structured logger, redaction, sinks, global error capture
  pwa/                 Service worker registration, install prompt and banner
  ui/                  Theme tokens, Pip, icons, shared components
```

## The four rules, and where they're enforced

Screens never compute access. They render a projection the domain layer returns for the signed-in user, and every rule has tests in `src/domain/__tests__/rules.test.ts`.

| Rule | Enforced in | How |
|---|---|---|
| Parents see only what the student shares | `parent.ts › parentWeeklySummary` | Each field is added only if its sharing toggle is on. Mood is weekly averages only; per-day scores never leave the function. Only the student can change toggles (`mutations.ts › setSharing`). |
| Admins see only families that opted in | `access.ts › adminVisibleFamilies` | Every admin read and action goes through this gate (family `adminOptIn` AND same org). Inside opted-in families, the student's own sharing settings still apply. |
| Private notes are never shared | `types.ts`, `student.ts › ownNoteForToday` | Notes live in their own table. Only the student's own read touches it; parent and admin projections never do. Tests stringify both projections and check no note text appears. |
| COPPA consent before any under-13 account exists | `coppa.ts › createStudentAccount` | The only way to create a student. Under 13 needs a matching, unused, unrevoked consent from a parent in that family, recorded first. There is no create-then-backfill path. |

**When a backend is chosen, these rules must move server-side** (row-level security or API checks), with these same tests run against it. The client checks alone are not a security boundary.

## Where the build differs from the canvas

- **Parent mood chart shows weekly averages, not days.** The canvas parent screen has per-day bars ("Mon 2, Tue 3…"), but the student's sharing screen promises "the average, not each day's answer." The build keeps the promise and keeps the chart's look: 5 bars, one per week.
- **Upcoming tests are hidden from the parent by default**, matching the canvas's toggle state (4th switch off). So the "Watch" card doesn't mention the Friday quiz unless Maya turns it on.
- **Generated copy**: Win / Watch / Try-saying text, admin patterns and KPIs are computed from data, so they read close to the canvas but not word for word.
- **Not on the canvas, built in its style**: the install banner on sign-in; `/diagnostics`; the crash screen; parent Account and the add-a-child / consent flow; a "Sign out" link on the student Me screen; after-check-in states on the Burrow; a "pick a number" empty state on check-in (no pre-selected score); the student preview of the parent summary.
- **Admin sidebar**: Families, Follow-ups and Referrals work. Invite families and Reports show a "not designed yet" panel.
- **Out of scope for now**: Pip's hints are canned per step (no AI); the "Pip asks you first… unless you might be unsafe" escalation is not implemented and needs a clinically reviewed design; consent verification (card check etc.) is simulated.
