# Seeding a Supabase project

The demo data in `src/data/seed.ts` is for the mock backend. A real project
starts empty: parents sign up, create their children, and a school admin is
invited. For a pilot, run `seed_pilot.sql` once in the SQL editor (or
`supabase db execute -f supabase/seed/seed_pilot.sql`): it creates one org
and an admin invite. Change the email first.
