# EarlySignal — product one-pager

**Live:** https://earlysignal-nvs.vercel.app · **Demo:** https://angelaaaateng.github.io/earlysignal-nvs/ · **Code:** github.com/angelaaaateng/earlysignal-nvs · **Status:** working pilot build, 6 Nov 2026

## The problem

Middle schoolers (13–14) lose ground on study habits quietly. By the time a parent or counselor notices, it shows up as grades, not as the three weeks of heavy days that came first. Existing tools are either homework trackers built for adults, or surveillance apps that teens route around.

## The product

A calm, teen-owned study companion with a fox named Pip. Three things, nothing more:

1. **A 10-second daily check-in.** “How heavy is today?” on a 1–5 scale, plus an optional private note that nobody else can ever read.
2. **Quests.** The student types tonight’s homework; Pip splits it into 2–4 timed steps with hints that nudge rather than answer. Tests become “boss battles”. A small library of study habits fills an empty plan. Steps earn acorns, acorns grow the Burrow, check-ins build a streak.
3. **A weekly summary a parent can see, if the student allows it.** The student holds four switches: mood trend (weekly average only), quests finished, streak and level, upcoming tests. The parent sees exactly what is switched on, in plain language, with one calm line to try at dinner.

## Why it is different

- **Student-first by construction.** The student creates the account (username + password, no email) and owns the data. A parent is optional and joins only by typing a 6-letter code the student shows them.
- **Privacy is enforced in the database, not the UI.** Row-level security means a parent, a school, or a bug in a screen cannot read a private note or a per-day score. Twenty automated tests hit Postgres as each role to prove it.
- **Early signals, not raw data.** Trends and counts, never diaries. The parent gets “three heavy days this week”, not Tuesday’s note.
- **No app store, no install friction.** A progressive web app: open the link, add to home screen, works offline.

## Who it is for

- **Primary:** students 13+, first and foremost 7th–9th grade.
- **Secondary:** their parents, who want a signal before the report card without reading their kid’s diary.
- **Later:** school counselors and clinics. The data model and an admin dashboard exist (hidden in this build) for opted-in families only.

## What exists today

One Expo/React Native codebase (web now, iOS/Android via the same code). Supabase (Postgres + Auth) backend. 28 unit tests, 20 database-rule tests, 44 end-to-end browser tests across iPhone, Pixel and desktop, run in CI on every push. Structured, redacted audit logging. Video walkthrough and screenshots in `docs/walkthrough/`.

## Open questions for the pilot

1. Is one 1–5 score a day enough signal, or do sleep and “homework done?” need to join it?
2. Reminders raise check-in rates but fight the calm brand. What is the right nudge?
3. Buyer: parents (B2C) or schools (B2B, counselor dashboard as the wedge)?
4. Proposed pilot: one grade, one school, four weeks. Success = 60% of students with 4+ check-ins a week by week 3, and at least one parent conversation that happened because of a summary.

## Not in this build

Push notifications and email of any kind, app-store listings, password reset without a linked parent, admin onboarding UI, quest editing (remove and re-add), localization.
