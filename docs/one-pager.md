# Rooted — product one-pager

**Live:** https://earlysignal-nvs.vercel.app · **Demo:** https://angelaaaateng.github.io/earlysignal-nvs/ · **Code:** github.com/angelaaaateng/earlysignal-nvs · **Status:** working MVP for the pilot, 10 Nov 2026

## One line

Rooted tells busy parents what to ask their middle schooler, and when, then turns those conversations into a habit. The kid never uses the app. **[Team]**

## The problem

Around grades 6 to 8, kids share less at home and parents default to “How was school?”, which gets “Fine.” Parents who feel uncomfortable raising a topic raise it far less often (Gallup/Walton 2024: 33% vs 61% among parents worried about social media). **[Research]** Monitoring apps answer “where is my kid?”, not “how is my kid?”. **[Team]**

## The bet

A question about *this week’s* math test is worth the effort of entering the test on Sunday, where a generic tip would go unread. A four-week randomized text program changed how parents rated communication (MyTeen, JAMA Netw Open 2019); coaching on one topic made teens report talking about that topic more (Ford et al., 2019). Neither tested calendar-based prompts. The pilot does. **[Research] / [Assumption]**

## What the MVP does (features 1–7 of the brief)

1. **Kid profile:** first name, grade, interests, activities.
2. **Schedule input:** tests, tryouts, games, performances, projects, presentations, dances, trips.
3. **Questions from the schedule:** three per event, different before and after, drawn from a library a person on the team wrote and reviewed. The app chooses; it does not generate.
4. **Parent chooses and asks in person.** “Try another” rotates the pick. A tip names a real moment: in the car, while cooking.
5. **One tap afterwards:** “Not tonight”, “A few words”, “Good talk”, “We really talked” (stored as the brief’s 1–10 rating). Plus where you were.
6. **Feedback shapes the next pick:** questions this kid rated “Not tonight” sink, ones that landed rise, nothing repeats within ten days.
7. **Sunday check-in:** the week that was (talks, weeks with a talk, top topic, which questions worked), then add next week.

**Principles, enforced in code:** parent-only, no child data; notes stay on the device and never reach the server; counts not streaks, no scores, no comparisons; one `primary` action per screen; every question open-ended and under 15 words.

## What exists

One Expo/React Native codebase (web now, iOS/Android from the same code), installable from Safari or Chrome, offline-capable. Supabase backend with row-level security so one parent can never see another’s family. 16 unit, 7 database-rule and 32 browser tests in CI. Design system applied: Plus Jakarta Sans, speech-bubble cards, moss/canopy/spark palette.

## Pilot (brief §10, evidence brief §76)

30 Boston-area parents of 6th graders, four weeks. Within each family, alternate event-specific and generic prompts on comparable moments; compare parent-confirmed asks over delivered prompts. Report week-four use among all 30, not just those still rating. Success: 2+ questions used per week, 50%+ active in week 4, rising ratings read alongside retention, and a real paid offer at the end.

## Open questions

1. Will parents enter the schedule by hand, or is calendar sync a prerequisite? 2. Is the four-seed check-in enough signal, or does the 1–10 slider earn its friction? 3. Do parents want a social layer at all? 4. $9.99 or $12.99 a month, free tier of three questions a week: what do interviews say?

## Not in this build

Smart-timing notifications, response tips after the first answer, the growing family tree, badges, community prompts, school groups, calendar sync, topic packs, co-parent sharing, payments, app-store listing.
