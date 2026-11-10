# Rooted: how to test it (5 minutes)

**Real app:** https://earlysignal-nvs.vercel.app · **Demo (nothing to create):** https://angelaaaateng.github.io/earlysignal-nvs/

Works in any browser. On a phone, add it to the home screen for the app feel: iPhone Safari → Share → *Add to Home Screen*; Android Chrome → *Install*.

## Option A: the demo (30 seconds)

Open the demo link and tap **Try the demo**. You are Maya, with Ava (grade 6) and Leo (grade 8). Ava has a math test tomorrow, so tonight’s starter is about it.

1. **Home.** Read tonight’s starter and the tip. Tap **Try another**. Tap a moment (Car ride). Tap **I asked it**.
2. **How did it go?** Pick a seed, add a note, **Save**. Back home, the week has one more talk.
3. Tap **Leo** to switch kids: the starter follows his robotics showcase.
4. **Week tab.** Tap **Math test** to see three questions. Tap **Add** to put something new on the week; it gets questions immediately.
5. **Grow tab.** The Sunday check-in: counts, what worked, your notes. Tap **Nothing new** or **Add next week’s events**.
6. **Family tab.** What Rooted knows about each kid, and nothing more.

Everything in the demo stays on your device. `/diagnostics` has a **Reset demo data** button.

## Option B: your own account on the real app

Open https://earlysignal-nvs.vercel.app → **Create an account** (name, email, password 8+). No confirmation email is sent. Then: **Add your kid** → their week → tonight’s starter. Delete the account any time from the Family tab.

## Option C: shared tester login

| | |
|---|---|
| Email | `rooted.demo.parent@gmail.com` |
| Password | `Rooted2026!` |

Maya, with Ava in 6th grade and three events this week. Shared with other testers, so expect their talks and events too.

## What to look for

- The question is about *this week’s* event, before it and after it, and it names the event.
- Nothing scores the kid or the relationship. “Not tonight” is a valid answer and never counts against you.
- Notes never leave the device: write one, then open `/diagnostics`; it is not in any log line.
- Signed out, typed URLs like `/grow` land on sign-in. A second account sees none of the first account’s kids or talks.

## Not built yet

Notifications, calendar sync, parent groups, the growing tree, badges, payments, app-store builds, password reset.
