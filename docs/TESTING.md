# EarlySignal: how to test it (5 minutes)

**Live app (real accounts):** https://earlysignal-nvs.vercel.app
**Demo with example data (nothing to create):** https://angelaaaateng.github.io/earlysignal-nvs/

Works in any browser. On a phone, add it to the home screen for the full-screen app feel: iPhone Safari → Share → *Add to Home Screen*; Android Chrome → *Install*.

## Option A: make your own account (recommended, 30 seconds)

1. Open https://earlysignal-nvs.vercel.app and tap **Get started**.
2. Pick a username and a password (8+ characters), tell Pip your name, tick **I’m 13 or older**, tap **Create my account**. No email is asked for or sent.
3. You land in your **Burrow**. Tap **Add your first quest**. Type an assignment (e.g. “Math worksheet 4.2”), pick a type and a due date. Watch Pip split it into steps, then **Add to my plan**.
4. Back on the Burrow, tap **Check in**, pick how heavy today feels, optionally write a private note, continue.
5. **Quests** tab: tick steps, try **Start a focus sprint**, or **+ Add** → *Study habits* to add a habit from the library.
6. **Me** tab: the sharing switches (what a parent may see) and **Add a parent**, which shows a 6-letter code.
7. To test the parent side: sign out, tap **I’m a parent** → *New here? Create an account*, use any email + password, then type the code. You now see the student’s weekly summary, built only from what they share. **Account** tab: reset the kid’s password, unlink.

## Option B: ready-made logins

| Role | How to sign in | Login |
|---|---|---|
| Student (Maya, grade 7, has quests and a check-in) | **I already have an account** | username `maya_demo` · password `Acorns2026!` |
| Parent (Ana, linked to Maya) | **I’m a parent** → Sign in | email `earlysignal.demo.parent@gmail.com` · password `Acorns2026!` |

These are shared, so others may change Maya’s quests or sharing switches. If the student password was reset by another tester, sign in as the parent and reset it again from **Account**.

## What to look for

- **Student controls sharing.** Flip a switch on *Me*, then look at the parent summary: it changes immediately. Per-day scores and private notes never appear anywhere but the student’s own screen.
- **Parent before linking sees nothing.** A fresh parent account has no kid until a code is typed.
- **Codes are single-use** and expire after 7 days.
- **Forgot password:** only a linked parent can reset it. There is no email, so no reset email.
- **Offline:** after the first load, airplane mode still opens the app.

## What is intentionally not there yet

Reminders or push notifications, any email, app-store builds, a school/clinic admin UI (hidden; the data model supports it), editing a quest after creation (remove and re-add instead).

## If something breaks

The `/diagnostics` route (e.g. https://earlysignal-nvs.vercel.app/diagnostics) shows the app version and a redacted event log you can copy and send.
