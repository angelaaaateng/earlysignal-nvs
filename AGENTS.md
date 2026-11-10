# Rooted — working agreement for agents and people

Rooted is a parent-only app: one question worth asking your kid tonight, tied to their week. Kids never use it. Read `docs/HARNESS.md` before changing anything; it is the definition of done.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. Before writing code that touches an Expo, EAS or React Native API: read the `expo` major in `package.json`, then fetch `https://docs.expo.dev/versions/v<major>.0.0/` or `https://docs.expo.dev/llms.txt`. Never answer from memory.

## Commands

```bash
npx expo install <package>   # never npm/yarn add for Expo packages
npm run harness              # typecheck, lint, unit, db rules, build, e2e — run before saying "done"
npm run harness:quick        # typecheck, lint, unit (while iterating)
npm run smoke:live           # the real Supabase project, throwaway accounts
npm run walkthrough          # re-record docs/walkthrough after UI changes
npm run db:local start       # local Postgres on :54329 for the rule tests
```

## Where things live

- `src/app/` routes only (Expo Router). Components, hooks and logic live outside it.
- `src/domain/` pure TypeScript shared by the demo and the real backend: the question library, suggestion ranking, counting rules, import parsing. Unit-tested.
- `src/data/` the backend seam. `backend.ts` is the interface; `mockBackend.ts` (demo) and `supabaseBackend.ts` (real) implement it. Screens never import either.
- `src/ui/` the design system in code: `theme.ts` tokens, `Kit.tsx` components, `Screen.tsx` layout (phone vs desktop).
- `supabase/migrations/` the whole backend. `supabase/functions/` edge functions. `supabase/tests/` rule tests that hit Postgres as each parent.
- `docs/` product brief, evidence brief, roadmap, tester guide, walkthrough, harness.

## Rules that do not bend

1. **Parent-only.** No child account, no child data beyond first name, grade, interests and the events the parent types.
2. **Notes never leave the device.** Anything a parent writes about what their kid said stays in `src/data/notes.ts` storage. Never a column, never a log line.
3. **Count, never grade.** No streaks to break, no scores on the relationship, no comparisons between families. "Not tonight" and "Wrong moment" never count against anyone.
4. **Reviewed library.** Every question a parent can see is a hand-written entry in `src/domain/library.ts`. AI may phrase or extract; it never invents a question.
5. **Every table carries `parent_id`** with row-level security `parent_id = auth.uid()`, and `supabase/tests/rls.test.ts` proves a second parent sees nothing.
6. **Design system first.** Tokens from `src/ui/theme.ts`, components from `src/ui/Kit.tsx`. One primary action per screen. Sentence case. No emoji in the UI.
7. **Nothing is done until `npm run harness` is green** and, for anything touching the backend, `npm run smoke:live` too.

## Secrets

Never paste a secret into chat, a commit, or a migration. Public by design: the Supabase URL, the publishable key, the VAPID public key. Private: `ANTHROPIC_API_KEY` (edge function secret), VAPID private key and `cron_secret` (Supabase Vault), the service role key (local env only, for `export:prompt-stats`).
