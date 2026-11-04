# EarlySignal

Better study habits for kids. Calm, early signals for families.

One Expo (React Native) app with role-based sign-in: **student**, **parent** and **admin**. Student and parent run on iOS, Android and web. The admin partner dashboard is web-only: on a phone, an admin sees a "use a computer" screen.

Built from the *EarlySignal App Mockups* Claude Design canvas: same screens, colours (exact hex), fonts (Bricolage Grotesque + Nunito Sans) and copy. **All data is mock data for now** (`src/data/seed.ts`), generated relative to today. No backend has been chosen yet.

## Run it

```bash
npm install
npm run web        # or: npm run ios / npm run android (Expo Go works, no native modules beyond the SDK)
npm test           # access-rule and loop tests
npm run typecheck && npm run lint
```

On the sign-in screen, each card signs in a demo account: Maya (student, 11), Ana (Maya's mom), Ms. Patel (counselor at Lincoln Middle School).

## Layout

```
src/
  app/                 Expo Router screens (one file per canvas artboard)
    index.tsx          0  · Sign in (pick a role)
    student/           S1 Burrow · S2 check-in · S3 quests · S4 focus · S5 me (sharing) · preview
    parent/            P1 weekly summary · P2 help · account · add-child (COPPA flow)
    admin/             A1 partner dashboard (web)
  domain/              Pure TypeScript. Data model, access rules, mutations. No React.
    types.ts           users, orgs, families, consents, check-ins, private notes, quests,
                       quest steps, acorns, sharing settings, cheers, referrals, help contacts
    access.ts          role checks, family membership, admin opt-in gate
    student.ts         the student's own view
    parent.ts          parent weekly summary projection
    admin.ts           admin dashboard projection
    coppa.ts           parental consent + the only student-account creation path
    mutations.ts       every write, each checked against the acting user
  data/                Mock seed + in-memory store and mock auth (the backend seam)
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
- **Not on the canvas, built in its style**: parent Account and the add-a-child / consent flow; a "Sign out" link on the student Me screen; after-check-in states on the Burrow; a "pick a number" empty state on check-in (no pre-selected score); the student preview of the parent summary.
- **Admin sidebar**: Families, Follow-ups and Referrals work. Invite families and Reports show a "not designed yet" panel.
- **Out of scope for now**: Pip's hints are canned per step (no AI); the "Pip asks you first… unless you might be unsafe" escalation is not implemented and needs a clinically reviewed design; consent verification (card check etc.) is simulated.
