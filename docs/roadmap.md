# Rooted — product roadmap and feature strategy

**For:** the Rooted team (Chicago Booth NVS) · **From:** CPO view · **Date:** 10 Nov 2026 · **Status:** proposal, every item labelled Now / Next / Later

## Recommendation

Spend the next 12 weeks on one thing: **make the Sunday-to-pickup loop stick for 30 real families**, then earn the right to build the social layer. The MVP already proves the loop *works*; the pilot has to prove parents *come back*. Everything in **Now** removes a reason to stop (entering the schedule, forgetting at pickup, not knowing what to say after the first answer). Everything in **Next** turns a habit into something parents love and pay for. Everything in **Later** is the moat.

What I would cut from the brief's MLP for now: badges and levels (risk of guilt, no evidence they help parents), community prompts before there is a community, and any AI that writes questions from scratch (safety and trust cost, no demand signal yet).

## Where we are

Shipped: parent accounts, kid profiles, schedule input, three reviewed questions per event (before/after), tonight's starter, four-seed check-in with device-only notes, Sunday check-in, ranking that learns from outcomes, PWA on phone and a desktop layout, Supabase with per-parent isolation, 57 automated tests, live at earlysignal-nvs.vercel.app.

Biggest product risks, in order: (1) schedule entry is a chore, (2) the parent forgets at pickup, (3) the question lands but the parent lectures, (4) nothing to show for the effort after week two, (5) willingness to pay is untested.

## Now (pilot, weeks 1–12)

| Feature | Risk it removes | Design notes | Measure |
|---|---|---|---|
| **Smart-timing nudge** (one per day, parent-set window: pickup, dinner, bedtime) | Forgetting | Web push + native push. Quiet by default; the nudge *is* the question, so the parent never opens the app to see it. Learns the hour "I asked it" gets tapped. | Nudge → "I asked it" within 3 hours |
| **Second move** (after the kid answers) | Lecturing | One follow-up per starter ("What was that like for you?") plus the listening tip from the evidence brief. "Wrong moment" as an outcome, so a kid choosing privacy is not a failed talk. | Share of talks rated Good or better |
| **Photo-to-schedule** | Schedule entry | Snap the syllabus, team schedule or school newsletter; Claude extracts events for approval. Also: recurring activities (soccer Tue/Thu) become events automatically. | Events per family per week; Sunday completion rate |
| **Calendar import (ICS)** | Schedule entry | Paste a Google/Apple/school calendar link; events appear for approval. Full OAuth sync is Next. | Same |
| **In-app experiment** | Our own bet | Within each family, alternate event-specific and generic prompts on comparable moments (evidence brief §83). Log delivered vs confirmed-asked. | Event-specific vs generic ask rate |
| **Password reset + email verification** | Lockouts | Resend, transactional only. Unblocks magic links later. | Support tickets |
| **Founding-family pilot checkout** ($59) | Payment unknown | Stripe Checkout on web; a real paid offer, not a survey. | Accept / offered |
| **Feedback loop to the team** | Library quality | Weekly export: which prompts were shown, asked, rated; which were skipped with "Try another". The team edits the library from data. | Prompt skip rate |

## Next (MLP, Q2 2027): will parents love it and pay?

- **Growing family tree.** One tree per kid, grown by talks, never shrunk. The monthly "Your November with Ava" card is shareable as an image that contains counts only, never content. This is the emotional payoff the brief wants from Habitica without the guilt.
- **Response tips as a mode.** Tap "They answered" and Rooted coaches the next 30 seconds: reflect, ask one more, stop. Based on the listening and interest-validation studies.
- **Voice notes** (on-device transcription, device-only storage) for the car.
- **Depth levels.** Light questions first; deeper topics unlock per kid after a few good talks. Topic packs (friends, phones, stress, grades, body, money), each expert-reviewed.
- **Personalized phrasing with AI, inside guardrails.** Claude rewrites a *reviewed* question to the kid's interests and grade; the template, not the model, decides what gets asked. Every variant is logged and reviewable. Opt-in, labelled.
- **Co-parent sharing.** Both parents see events and effort; notes stay per device unless explicitly shared.
- **Full calendar sync** (Google, Apple, Outlook) and school portals via ICS (Canvas, Schoology, PowerSchool).
- **Native apps** (EAS, App Store and Play), home-screen widget with tonight's starter, Siri/Google shortcut "Ask Rooted".
- **Evening theme** (the design system's dark mode) for bedtime check-ins.
- **Premium** at $12.99/month or $99/year, 14-day trial, free tier of three questions a week. RevenueCat on native, Stripe on web.
- **Lifecycle messaging.** Sunday reminder, a gentle note after a quiet fortnight ("Pick up whenever you're ready"), the "very disappointed" survey at day 30.

## Later (V2): the moat

- **School and grade groups.** Invite link per grade; kudos on effort, shared challenges ("Exam week"). Community prompts ("worked for Lexington 6th-grade parents this week") released only above a k-anonymity threshold.
- **Data network effect, for real.** Per-grade, per-moment, per-topic success rates across families feed the ranking. Needs thousands of talks before it beats the hand-tuned rules.
- **Employer and school edition.** Seats, SSO, an admin console that shows aggregate engagement and nothing about any family. The lower-income path from the brief.
- **Families apart.** Prompts timed to a video call across time zones; the overseas-worker segment from the deck appendix.
- **Spanish**, then Tagalog.
- **Question-library CMS.** Versioned, reviewed, A/B-able; the team's real product surface.

## Platform and trust work that runs underneath (ongoing)

- Analytics: PostHog or Amplitude with the brief's metrics (north star: share of talks rated 7+; questions used per week; Sunday completion; week-4 and day-30 active).
- Observability: Sentry for crashes, the existing redacted audit log, uptime check.
- Security: rate limiting and a captcha on sign-up, Apple and Google sign-in, optional 2FA, continued RLS tests on every change, a published privacy page and data export.
- Safety: on-device keyword check in notes surfaces crisis resources (988) without uploading anything; a review queue for any AI-phrased variant.
- Accessibility: WCAG AA, dynamic type, screen-reader labels (already in place), reduced motion.

## Sequencing logic

1. Weeks 1–4: interviews run while we ship nudges, the second move and photo-to-schedule. These three change the two numbers the pilot lives or dies on.
2. Weeks 4–12: the paid pilot with the built-in experiment. Ship the tree and the monthly card mid-pilot so week-4 retention has something to hold on to.
3. Decision at week 12 (from the evidence brief): if parents use event-specific and generic prompts equally, question the schedule's value before building sync; if event-specific wins only among families who log regularly, make logging easier before expanding the library; if parents use it but decline to pay, report engagement and payment separately.

## What I would not build

A teen app or any child account. Location or message monitoring. Leaderboards between parents. An AI that invents questions without a reviewed template. Streak-break notifications. Recording the child.
