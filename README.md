# EarlySignal

Better study habits for kids. Calm, early signals for families.

One Expo (React Native) app with role-based sign-in: **student**, **parent** and **admin**. Student and parent run on iOS, Android and web. The admin partner dashboard is web-only: on a phone, an admin sees a "use a computer" screen.

Built from the *EarlySignal App Mockups* Claude Design canvas: same screens, colours (exact hex), fonts (Bricolage Grotesque + Nunito Sans) and copy. **All data is mock data for now** (`src/data/seed.ts`), generated relative to today. No backend has been chosen yet.

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

**Hosting:** any static host that serves `dist/` with a fallback to `index.html`. `vercel.json` is ready (build command, SPA rewrites, security and cache headers). Not deployed yet.

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

- **Unit (Jest, 28 tests):** the four access rules, the check-in and quest loop, COPPA, logger redaction.
- **End-to-end (Playwright, 44 runs):** against the production build, on iPhone 14, Pixel 7 and desktop profiles. Covers the full student loop, the parent summary and help, the COPPA flow, the admin dashboard, private notes never reaching parent, admin or logs, live sharing changes, role guards on typed URLs, persistence across reloads, PWA install metadata, offline launch, deep links, security headers, the audit log and zero console errors.
- **CI:** `.github/workflows/ci.yml` runs typecheck, lint, unit, e2e (with a report on failure) and an iOS + Android bundle build, on every PR and push to `main`.
- **Security headers:** CSP, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a Permissions-Policy that blocks camera, microphone and location. Hashed build files are cached for a year; HTML and the service worker are never cached.

## Layout

```
e2e/                   Playwright end-to-end specs
scripts/               web build, static server + headers, icons, walkthrough recorder
public/                PWA manifest, HTML template, service worker, icons
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
  data/                Mock seed, store, mock auth, on-device persistence (the backend seam)
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
