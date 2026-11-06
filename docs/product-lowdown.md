# EarlySignal — product lowdown (5 Nov 2026)

Paste this into Claude Cowork as context. It describes what exists today, how it works, what is deliberately not built, and the open product questions.

## 1. One-paragraph pitch

EarlySignal is a calm, early-warning study-habits app for families with middle-school kids. The student does a 10-second daily check-in (mood/focus 1–5, optional private note), works through small "quests", and earns acorns and streaks. The parent gets a weekly summary of **only what the student chose to share**. A school or clinic admin (hidden in this build) would see a partner dashboard of **only families that opted in**. Private notes are never visible to anyone but the student. The app is for ages 13 and up; students confirm this at sign-up.

## 2. What is live right now

| | URL | Backend | Who it is for |
|---|---|---|---|
| Demo | https://angelaaaateng.github.io/earlysignal-nvs/ | Mock data on the device | Showing the product. Each role card opens an example account (Maya the student, her mom, Dr Patel the admin). Nothing leaves the browser. |
| Real app | https://earlysignal-nvs.vercel.app | Supabase (Postgres + Auth), project `earlysignal-nvs` on your account | Actual testing with real accounts. |

Both are installable as a phone app from Safari (Share → Add to Home Screen) or Chrome (Install). No app store. Works offline after first load.

Code: https://github.com/angelaaaateng/earlysignal-nvs (public, `main` branch). Every push to `main` redeploys both sites.

## 3. How people get in (as of 6 Nov)

| Role | How | Notes |
|---|---|---|
| Student (13+) | **Get started** → username, password, name, optional grade, tick “I’m 13 or older”. | Thirty seconds, no email. Signing in later is username + password. |
| Parent | **I’m a parent** → email + password → type the 6-letter code from the kid’s Me screen. | Optional. Sees only what the student shares. Can reset the kid’s password and unlink. |
| Admin | Hidden from the sign-in screen; invite-only at `/admin`. | Data model and dashboard exist; not part of this round. |

Earlier approaches (email codes, Google sign-in, parent-creates-child with COPPA consent, student PIN) were removed after the PM review: the market is US 13+, so no parental gate is required, and every email dependency was a point of failure for testers.

Known gap: no password reset without a linked parent. Shared tester logins are in `docs/TESTING.md`.

## 4. What the student can do (the core loop)

1. **Burrow (home)**: today's check-in prompt, current streak, acorn count, today's quest, Pip the fox.
2. **Check-in**: pick 1–5, optional private note. One per day. Earns acorns.
3. **Quests**: small multi-step habits (e.g. "set up a study spot"). Toggling steps earns acorns; finishing a quest earns a bonus.
4. **Sharing**: toggles for what the parent may see (weekly average, streak, quest progress, check-in count). Notes are never shareable. A live **"what my parent sees"** preview updates as you toggle.
5. **Account**: sign out.

## 5. What the parent can do

1. **Weekly summary** per child: only the shared fields, in plain, non-alarming language. Per-day scores never leave the database even when sharing is on.
2. **Send a cheer**: a one-tap encouragement the child sees in their Burrow.
3. **Help**: counselor / coach contacts and the crisis line, always visible.
4. **Account**: linked kids (and the username each signs in with), **Reset password**, **Unlink**, **Link another kid** (type a code), delete own account.
5. **Linking**: the parent types the 6-letter code from the student's Me screen. One code, one use, 7 days.

## 6. What the admin can do

Partner dashboard for a school/clinic: opted-in families only, aggregate signals (how many checked in this week, trend), "self-starters" list, and a **Suggest a coach** action that creates a referral the parent sees. No notes, no grades, no per-day scores. Families that haven't opted in are invisible, not greyed out.

## 7. The four rules, and where they are enforced

These are enforced in the **database** (row-level security + functions), not just the UI, and a test suite talks to Postgres as each role with no app code to prove it.

| Rule | Enforcement |
|---|---|
| Parents see only what the student shares | The summary function reads the sharing settings and adds only shared fields. There is no parent read policy on check-ins at all. Only the student can change sharing. |
| Admins see only opted-in families | Every admin policy and function is gated on same-org **and** family opt-in. The parent controls opt-in. |
| Private notes never shared | Exactly one policy on the notes table: the student's own rows. Nothing else can read it. |
| 13+ only | Sign-up refuses unless the student ticks “I’m 13 or older”; the time is stored. Anyone can delete their own account and everything cascades. |

Every write and every view of someone else's data is written to an audit log with the actor.

## 8. Engineering state (for the "is this real?" question)

- **Stack**: Expo SDK 58 / React Native / TypeScript, Expo Router. One codebase for web (PWA), iOS and Android. Supabase for auth + Postgres. Vercel + GitHub Pages hosting.
- **Design**: built from the Claude Design canvas; colors, fonts (Bricolage Grotesque, Nunito Sans), copy and Pip illustrations match it.
- **Tests, all green on the latest commit**: 28 unit, 20 database-rule tests on real Postgres, 44 end-to-end browser runs (iPhone 14, Pixel 7, desktop) covering every role flow, privacy leaks, offline launch, install metadata and security headers. CI runs all of it on every push.
- **Observability**: structured JSON logs with redaction (a note or a name can never reach a log), audit trail, error boundary, metrics, `/diagnostics` screen, optional HTTP log sink. Vendor-neutral; Sentry/Datadog would be a one-file sink.
- **Security**: CSP and the usual headers, RLS fail-closed (anonymous callers get nothing), security-definer functions with locked search paths, 10-minute single-use child tokens.
- **Docs**: README (architecture, rules, setup), `docs/walkthrough/` (screenshot + video walkthrough per role), `docs/claude-in-chrome-setup.md` (dashboard checklist).

## 9. What is NOT built (honest list)

- Password reset / email of any kind (needs a mail provider: Resend or Postmark, ~1 hour).
- Push notifications or reminders ("time to check in").
- Native app-store builds (EAS is configured but nothing has been submitted).
- Admin onboarding UI (invites are a SQL seed today).
- Multiple parents per family in the UI (schema supports it).
- Real identity verification for COPPA (methods are recorded, not verified).
- Any analytics / product telemetry beyond the audit log.
- Localization (English only; copy is Philippines-friendly but not translated).
- Content: only a handful of seeded quests; no quest authoring tool.

## 10. Open product questions to discuss

1. **Who is the buyer?** Parents (B2C, app-store), or schools/clinics (B2B, admin dashboard is the wedge)? The admin side is the most differentiated but the least finished.
2. **Is the daily check-in enough signal?** One 1–5 score a day is deliberately light. Do we need sleep, homework-done, or screen-time inputs before a counselor finds the dashboard useful?
3. **Sign-up abuse.** Anyone can create a student account with no email. Fine for a pilot; before a public launch, add a captcha and decide whether a school code should gate sign-up.
4. **Consent verification.** Simulated today. For a real pilot in a school, the school can be the verifier (signed form). Is that acceptable to the school, and does it change the admin role?
5. **Reminders vs calm.** The brand is "calm, early signals". Push reminders raise engagement but fight the brand. What is the streak-break experience?
6. **Pilot shape.** Suggested: one school, one grade, 4 weeks, parents on the real app, counselor on the dashboard. Success metric: % of students with ≥4 check-ins/week by week 3, and whether the counselor acts on a single signal.
7. **Monetization**: free for families, paid per-seat for schools/clinics? Or a Globe bundle angle (family plan add-on)?

## 11. Immediate to-dos (not product decisions)

- Add a captcha (Cloudflare Turnstile) in front of student sign-up before any public launch; today only Supabase’s API rate limit protects it.

- Reset the exposed Google OAuth client secret in Google Cloud (it is unused now but still live).
- In Vercel → Settings → Git → Ignored Build Step, set `[ "$VERCEL_GIT_COMMIT_REF" != "main" ]` so the GitHub Pages branch stops producing failed Vercel previews.
- Keep Supabase "Confirm email" OFF until a mail provider exists.
- Seed the first admin invite when a pilot school is chosen.
- One leftover QA parent account (`qa.parent.mw360ou0@gmail.com`, no children) is still in the live database; delete it from the Supabase dashboard or leave it.
