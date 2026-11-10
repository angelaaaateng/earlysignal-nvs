// Live smoke test against the real Supabase project, public API only.
// Usage: node scripts/smoke/live.mjs [--keep]   (creates a throwaway parent; --keep leaves it)
import { createClient } from '@supabase/supabase-js';
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://vpfwybfgiqiiimzayydj.supabase.co';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_pifu58uviprpJYi3Frd0Rw_bvj_Ar2Q';
const KEEP = process.argv.includes('--keep');
const tag = Math.random().toString(36).slice(2, 8);
const out = {};
const must = (r, w) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data; };
const client = () => createClient(URL, KEY, { auth: { persistSession: false } });
const today = new Date().toISOString().slice(0, 10);

const a = client();
const email = KEEP ? 'rooted.demo.parent@gmail.com' : `rooted.smoke.${tag}@gmail.com`;
const pw = 'Rooted2026!';
let s = await a.auth.signInWithPassword({ email, password: pw });
if (s.error) { s = must(await a.auth.signUp({ email, password: pw, options: { data: { display_name: KEEP ? 'Maya Chen' : 'Smoke Parent' } } }), 'signUp'); out.signUp = 'ok'; }
if (!s.session) throw new Error('no session: is Confirm email ON?');
const me = must(await a.from('parents').select('*').single(), 'parent row');
out.parentRow = me.display_name;
const kids = must(await a.from('kids').select('id').limit(1), 'kids');
let kidId = kids[0]?.id;
if (!kidId) kidId = must(await a.from('kids').insert({ name: 'Ava', grade: 6, interests: ['Soccer', 'Art'] }).select('id').single(), 'kid').id;
const ev = must(await a.from('events').insert({ kid_id: kidId, title: 'Math test', kind: 'test', date: today }).select('id').single(), 'event');
const talk = must(await a.from('talks').insert({ kid_id: kidId, event_id: ev.id, prompt_id: 'test-b1', question: 'What part of Math test feels most ready?', moment: 'car', outcome: 'good_talk', rating: 8 }).select('id').single(), 'talk');
out.kidEventTalk = !!talk.id;
out.audited = (must(await a.from('audit_log').select('event').eq('event', 'talk.log'), 'audit')).length >= 1;

// Another parent sees nothing and cannot write into this family.
const b = client();
must(await b.auth.signUp({ email: `rooted.smoke.b.${tag}@gmail.com`, password: pw, options: { data: { display_name: 'Other' } } }), 'signUp b');
out.otherSeesNoKids = (must(await b.from('kids').select('*'), 'b kids')).length === 0;
out.otherSeesNoTalks = (must(await b.from('talks').select('*'), 'b talks')).length === 0;
const sneaky = await b.from('events').insert({ kid_id: kidId, title: 'Sneaky', kind: 'other', date: today });
out.otherCannotAttachEvent = !!sneaky.error;
const anon = await client().from('kids').select('*');
out.anonSeesNothing = !anon.error && anon.data.length === 0;
const wrong = await client().auth.signInWithPassword({ email, password: 'wrong-password' });
out.wrongPasswordRejected = !!wrong.error;
must(await b.rpc('delete_my_account'), 'delete b');
out.otherDeleted = true;

if (KEEP) {
  // Fill in a demo week for the shared tester.
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  await a.from('events').delete().eq('id', ev.id);
  const have = must(await a.from('events').select('title'), 'ev');
  if (have.length === 0) must(await a.from('events').insert([
    { kid_id: kidId, title: 'Math test', kind: 'test', date: d(1) },
    { kid_id: kidId, title: 'Soccer game vs. Newton', kind: 'game', date: d(3) },
    { kid_id: kidId, title: 'Band concert', kind: 'performance', date: d(9) },
  ]), 'events');
  out.kept = { email, password: pw };
} else {
  must(await a.rpc('delete_my_account'), 'delete a');
  out.cleanedUp = true;
}
console.log(JSON.stringify(out, null, 2));
const failed = Object.entries(out).filter(([, v]) => v === false);
if (failed.length) { console.error('FAILED:', failed.map(([k]) => k).join(', ')); process.exit(1); }
