# Rooted: live demo script for the Booth pitch

Verified against the build on `main` (commit `471c7ba`) on 10 Nov 2026. Every quoted string is what the app shows. The demo runs on **demo data**; Maya and Ava are a composite persona.

## What changed in the app for this demo

- The first "after a test" question in the library is now **"What question on {event} surprised you?"** (`src/domain/library.ts`, `test-a1`), with the tip "Works at dinner. Don’t ask what they got."
- The first question shown is always the best-ranked one; **Try another** rotates from there (`src/domain/suggest.ts`). Before, the first pick rotated by a hash and could be any of the three.
- The demo family’s math test is titled **"Tuesday’s math test"** and dated **yesterday**, whatever day you present (`src/data/seed.ts`). So Home always says "After Tuesday’s math test (yesterday)" and shows the line above first, on any day.
- Pilot mode is **off** in the demo, so Grow shows the product, not the experiment card.

## Flow, as the code runs it

1. Open the **demo site** (not the real-accounts site; only the demo build has the button): `https://angelaaaateng.github.io/earlysignal-nvs/`. Tap **Try the demo**. You are Maya Chen with two kids, Ava (grade 6) and Leo (grade 8).
2. Home shows "TONIGHT WITH AVA" and the question about yesterday’s math test, a tip, the context line, and "If they answer: …".
3. **I asked it** opens the check-in: five seeds, then "THE SECOND MOVE" once a real talk is picked, then an optional note that stays on the device, then **Save** returns Home with the week updated.
4. Week and Grow tabs are optional extras for the longer version.

---

## 1. The 30-second version (5 steps, ~76 words)

Opens on the sign-in screen at `https://angelaaaateng.github.io/earlysignal-nvs/`. Setup: demo data reset (see checklist), phone or laptop already on that page, browser chrome hidden if you can.

| # | Tap | Audience sees (exact) | Say | Sec |
|---|---|---|---|---|
| 1 | **Try the demo** | "Good evening" (or morning/afternoon, by the clock). Chips "Ava · Grade 6", "Leo · Grade 8". Card: "TONIGHT WITH AVA · 2 min" | "This is a prototype on demo data. It’s Tuesday night. Ava had a math test yesterday." | 0–6 |
| 2 | Nothing. Point at the card. | "What question on Tuesday’s math test surprised you?" / "Works at dinner. Don’t ask what they got." / "After Tuesday’s math test (yesterday) · School" | "Instead of ‘How was the test?’, Rooted suggests: ‘What question on Tuesday’s math test surprised you?’ And why it works: at dinner, and don’t ask what they got." | 6–15 |
| 3 | **Dinner**, then **I asked it** | "YOU ASKED AVA" / "Nice. That’s the whole job." / the question / "How did it go?" with "Not tonight · Wrong moment · A few words · Good talk · We really talked" | "Maya asks it in her own words. Then one tap: ‘I asked it’." | 15–20 |
| 4 | **We really talked** | "THE SECOND MOVE" / "What was that part like for you?" / "Repeat their last three words back, then wait. Don’t fix anything yet." | "One tap on how it went, and Rooted hands her the follow-up that keeps Ava talking." | 20–26 |
| 5 | **Save** | Back on Home. "2 talks this week" (the number follows the weekday; see checklist). Note under it: "Stays on this device" was on the previous screen. | "Nothing is collected from Ava, ever. Only Maya uses it. Bryan, how do we get this to Maya?" | 26–30 |

## 2. The 60-second version (5 steps, ~135 words)

| # | Tap | Audience sees (exact) | Say | Sec |
|---|---|---|---|---|
| 1 | **Try the demo** | "TONIGHT WITH AVA · 2 min" and the question card | "A quick note: this is a prototype on demo data, and Maya is a made-up parent. It’s Tuesday night. Rooted knows Ava had a math test yesterday because Maya added it on Sunday." | 0–10 |
| 2 | **Try another**, then **Try another** again (back to the first) | First: "What would you tell a friend taking Tuesday’s math test tomorrow?" Second: "What was the first question on Tuesday’s math test?" Third tap returns to "What question on Tuesday’s math test surprised you?" | "Instead of ‘How was the test?’, Rooted suggests ‘What question on Tuesday’s math test surprised you?’, and says why: at dinner, don’t ask what they got. ‘Try another’ gives the next one. Every question comes from a library our team wrote and reviewed." | 10–26 |
| 3 | **I asked it**, then **We really talked** | "Nice. That’s the whole job." / "THE SECOND MOVE" / "What was that part like for you?" / "A note for you (optional)" with "Stays on this device. Never uploaded, never shared." | "Maya asks it in her own words. Afterward, one tap on how it went. Rooted hands her the follow-up, and a note that never leaves her phone." | 26–40 |
| 4 | **Save**, then the **Week** tab | "The week" / "Tuesday’s math test · Ava · Test or quiz · 3 questions" / "Soccer game vs. Newton" / "Band concert" (plus Leo’s "Robotics showcase" and "Fall dance") | "Week is everything Maya typed in: a soccer game, a band concert. Each one gets three questions, some for before, some for after." | 40–50 |
| 5 | **Grow** tab | "2 talks this week" / "2 that really landed" / "SUNDAY CHECK-IN" / "Plan next week in two minutes." | "Grow is her two minutes on Sunday: what landed, and next week. Nothing from Ava, ever. Bryan, how do we reach Maya?" | 50–60 |

## 3. Speaker notes (30-second version)

[tap Try the demo] This is a prototype on demo data. It’s Tuesday night. Ava had a math test yesterday.

[point at the card] Instead of "How was the test?", Rooted suggests: "What question on Tuesday’s math test surprised you?" And why it works: at dinner, and don’t ask what they got.

[tap Dinner, then I asked it] Maya asks it in her own words. Then one tap: "I asked it."

[tap We really talked] One tap on how it went, and Rooted hands her the follow-up that keeps Ava talking.

[tap Save] Nothing is collected from Ava, ever. Only Maya uses it. Bryan, how do we get this to Maya?

## 4. Pre-demo checklist

**The night before**
- Use the **demo site**, `https://angelaaaateng.github.io/earlysignal-nvs/`. The real-accounts site (`earlysignal-nvs.vercel.app`) has no "Try the demo" button.
- On the phone: open the site, add it to the home screen (Safari: Share → Add to Home Screen; Chrome: Install). Launched from the icon there is no address bar, so the old "earlysignal" name in the URL never shows.
- Open it once from the icon so the service worker caches everything. It then works with no wifi.
- Decide the device: phone mirrored to the screen is the strongest; a laptop at full width shows the two-column desktop layout, which also looks fine.

**Five minutes before**
- Open `…/earlysignal-nvs/diagnostics` → **Reset demo data** → you land on sign-in. This removes anything typed in rehearsal, including any note (notes appear on Grow as "Your note · Ava").
- Confirm the sign-in screen shows **Try the demo** and the headline "Know what to ask your kid, and when."
- Tap Try the demo once, confirm the card reads "What question on Tuesday’s math test surprised you?", then go back: `…/diagnostics` → Reset demo data again, so the first tap on stage is fresh.
- Screen brightness up, auto-lock off, notifications off (Do Not Disturb).
- Clock: nothing to set. The greeting follows the real time ("Good morning" before noon, "Good afternoon" until 5 pm, "Good evening" after). Before 5 pm the chips question reads "Where are you two today?"; the card always says "TONIGHT WITH AVA". The "talks this week" count after Save is 2 on Tuesday to Sunday, 1 on a Monday.

**If there is no wifi**
- The demo site runs from the device after the first load, including Try the demo, the question, I asked it, Save, Week and Grow. Everything is on the device.
- Photo import and calendar links are the only things that need the network, and they are not in the script.

**If there is no Claude API key**
- Nothing in the demo uses it. The key only powers photo import on the real-accounts site, where it is currently not set. Pasted-text import works without it.

## 5. What could embarrass us

| Risk | Where | Fix or workaround |
|---|---|---|
| Two kids. The pitch introduces Ava only; Home shows "Ava · Grade 6" and "Leo · Grade 8", and Week lists Leo’s "Robotics showcase" and "Fall dance". | `src/data/seed.ts` (kids, events) | Either say "and her son Leo" once, or remove Leo from the seed. Removing him also drops three example talks and the two-kid Week view. |
| "Tuesday’s math test" is dated yesterday, so on the Week tab it sits under yesterday’s day name. On a Wednesday pitch that reads "Tuesday · yesterday" (perfect); on any other day the heading says a different weekday. | `src/data/seed.ts` | Keep Week out of the 30-second version. For the 60-second version, pitch on a Wednesday, or don’t read the day heading aloud. |
| The week card says "No streaks to protect. Every talk counts." It uses a word you want to avoid saying. | `src/app/home.tsx` line 73 and `src/app/grow.tsx` | Don’t read it. It is on brand (counts, not streaks); change the copy to "Nothing to protect. Every talk counts." if it bothers you. |
| The note field placeholder reads "What Ava said, or what to ask next time". If someone types a note during rehearsal it shows on Grow as "Your note · Ava", which can look like the app stores what a kid said. It is device-only, but that is hard to prove on stage. | `src/app/log.tsx` line 71, `src/app/grow.tsx` | Never type a note on stage. Reset demo data before. Say "a note that never leaves her phone" and move on. |
| "TONIGHT WITH AVA" at a morning pitch. | `src/app/home.tsx` line 126 | The script says "It’s Tuesday night". If you present in the morning, say "Tonight, Maya will see this" instead. |
| First paint is a blank cream screen for about a second while fonts load. | `src/app/_layout.tsx` | Open the app before you start talking. |
| The address bar shows "earlysignal-nvs" (the old project name). | GitHub Pages / Vercel project names | Launch from the home-screen icon, or present in a browser with the address bar hidden. A custom domain is a later fix. |
| Grow shows a lime "Founding-family pilot" card and the pilot screen shows "$59". | `src/app/grow.tsx`, `src/app/pilot.tsx` | Fine if Bryan’s pricing matches; otherwise don’t open the pilot screen. |
| `/diagnostics` shows a technical log and a "Reset demo data" button. | `src/app/diagnostics.tsx` | Never navigate there on stage; reset beforehand. |
| Tapping **I asked it** without choosing a moment is fine; **Save** stays disabled until a seed is picked. | `src/app/log.tsx` | Always tap a seed before Save. |

## 6. Likely investor questions

**Is the AI live or scripted?** The questions are not generated on the fly. They come from a library of 41 questions our team wrote and reviewed, and the app chooses among them by the event, whether it is before or after, and what landed with this kid before. Claude is used in one place today: reading a photo or pasted text of a schedule into events, and that key is not switched on in this build.

**Where does the schedule come from?** The parent types it in on Sunday, pastes a newsletter, or pastes a calendar link. Photo import exists and needs the Claude key. In the demo, the events were seeded.

**What data do you store?** On the real app: the parent’s account, a kid’s first name, grade and interests, the events the parent types, and each talk: the question, how it went, where it happened. The parent’s notes stay on the device and are never uploaded. Nothing comes from the kid, and the app never contacts the kid. In the demo, all of it lives in the browser on that device.
