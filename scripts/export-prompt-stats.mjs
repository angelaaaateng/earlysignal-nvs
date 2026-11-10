// Team export: which library questions were shown, asked and landed, by arm, across the
// whole pilot. Needs the service role key (never ship it to the app):
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/export-prompt-stats.mjs > prompt-stats.csv
import { createClient } from '@supabase/supabase-js';
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://vpfwybfgiqiiimzayydj.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY (Supabase dashboard → Project settings → API). Do not commit it.');
  process.exit(1);
}
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const [{ data: talks }, { data: imps }] = await Promise.all([sb.from('talks').select('prompt_id, arm, outcome, rating, follow_up_used'), sb.from('impressions').select('prompt_id, arm, asked')]);
const rows = new Map();
const key = (p, a) => `${p}|${a ?? ''}`;
for (const i of imps ?? []) {
  const r = rows.get(key(i.prompt_id, i.arm)) ?? { prompt_id: i.prompt_id, arm: i.arm ?? '', shown: 0, asked: 0, landed: 0, not_tonight: 0, wrong_moment: 0, follow_ups: 0, ratings: [] };
  r.shown++;
  rows.set(key(i.prompt_id, i.arm), r);
}
for (const t of talks ?? []) {
  const r = rows.get(key(t.prompt_id, t.arm)) ?? { prompt_id: t.prompt_id, arm: t.arm ?? '', shown: 0, asked: 0, landed: 0, not_tonight: 0, wrong_moment: 0, follow_ups: 0, ratings: [] };
  r.asked++;
  if (t.outcome === 'good_talk' || t.outcome === 'really_talked') r.landed++;
  if (t.outcome === 'not_tonight') r.not_tonight++;
  if (t.outcome === 'wrong_moment') r.wrong_moment++;
  if (t.follow_up_used) r.follow_ups++;
  r.ratings.push(t.rating);
  rows.set(key(t.prompt_id, t.arm), r);
}
console.log('prompt_id,arm,shown,asked,ask_rate,landed,not_tonight,wrong_moment,follow_ups,avg_rating');
for (const r of [...rows.values()].sort((a, b) => b.asked - a.asked)) {
  const avg = r.ratings.length ? (r.ratings.reduce((a, b) => a + b, 0) / r.ratings.length).toFixed(1) : '';
  console.log([r.prompt_id, r.arm, r.shown, r.asked, r.shown ? (r.asked / r.shown).toFixed(2) : '', r.landed, r.not_tonight, r.wrong_moment, r.follow_ups, avg].join(','));
}
