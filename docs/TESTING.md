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

## Option C: shared tester logins

All passwords are `Rooted2026!`. Sign in with **I already have an account**. Each tester has one kid and a few events this week; pick a different login per person so talks don't mix.

| Email | Parent | Kid |
|---|---|---|
| `rooted.demo.parent@gmail.com` | Maya Chen | Ava, grade 6 (math test, soccer game, band concert) |
| `rooted.tester1@gmail.com` | Dana Whitfield | Ella, grade 7 (history quiz, dance recital) |
| `rooted.tester2@gmail.com` | Marcus Reed | Jalen, grade 6 (basketball tryout, science project) |
| `rooted.tester3@gmail.com` | Priya Nair | Arjun, grade 8 (robotics showcase, fall dance) |

These are placeholder addresses, not real inboxes. Nothing is ever emailed.

## New this week (try these)

1. **Second move.** Tap **I asked it**, pick *Good talk*: a follow-up question and a listening tip appear. Pick *Wrong moment*: nothing is counted.
2. **Import the week.** Week → **Import** → paste a few lines like `Math test Thursday` and `Band concert Nov 20` → **Find events** → untick what you don't want → Add. Photo import needs the Claude key on the real app; calendar links work with any public .ics address.
3. **Repeats weekly.** Week → **Add** → tick *Repeats weekly*: eight weeks land at once.
4. **Reminder.** Family → **Reminder** on, pick a time. On the real app in Chrome or the installed app, allow notifications; a push arrives at that hour with your kid's name and the event.
5. **Pilot mode.** Family → **Pilot mode** alternates event and general questions by day; Grow shows the running tally.
6. **Founding-family pilot.** Grow → the lime card → **Count me in**.
7. **Forgot password.** Sign in → *Forgot your password?* (real app only; the demo has no email).

## What to look for

- The question is about *this week’s* event, before it and after it, and it names the event.
- Nothing scores the kid or the relationship. “Not tonight” is a valid answer and never counts against you.
- Notes never leave the device: write one, then open `/diagnostics`; it is not in any log line.
- Signed out, typed URLs like `/grow` land on sign-in. A second account sees none of the first account’s kids or talks.

## Not built yet

Full calendar OAuth sync, parent groups, the growing tree, badges, Stripe checkout, app-store builds, native push.
