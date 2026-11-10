// Creates (or refreshes) shared tester parents on the live app, each with a kid and a week of events.
import { createClient } from '@supabase/supabase-js';
const URL = 'https://vpfwybfgiqiiimzayydj.supabase.co';
const KEY = 'sb_publishable_pifu58uviprpJYi3Frd0Rw_bvj_Ar2Q';
const PW = 'Rooted2026!';
const must = (r, w) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data; };
const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const TESTERS = [
  { email: 'rooted.demo.parent@gmail.com', name: 'Maya Chen', kid: { name: 'Ava', grade: 6, interests: ['Soccer', 'Art'] }, events: [['Math test', 'test', 1], ['Soccer game vs. Newton', 'game', 3], ['Band concert', 'performance', 9]] },
  { email: 'rooted.tester1@gmail.com', name: 'Dana Whitfield', kid: { name: 'Ella', grade: 7, interests: ['Dance', 'Reading'] }, events: [['History quiz', 'test', 2], ['Dance recital', 'performance', 5]] },
  { email: 'rooted.tester2@gmail.com', name: 'Marcus Reed', kid: { name: 'Jalen', grade: 6, interests: ['Basketball', 'Gaming'] }, events: [['Basketball tryout', 'tryout', 1], ['Science project due', 'project', 4]] },
  { email: 'rooted.tester3@gmail.com', name: 'Priya Nair', kid: { name: 'Arjun', grade: 8, interests: ['Robotics', 'Music'] }, events: [['Robotics showcase', 'presentation', 2], ['Fall dance', 'social', 6]] },
];
const out = [];
for (const t of TESTERS) {
  const c = createClient(URL, KEY, { auth: { persistSession: false } });
  let s = await c.auth.signInWithPassword({ email: t.email, password: PW });
  if (s.error) s = must(await c.auth.signUp({ email: t.email, password: PW, options: { data: { display_name: t.name } } }), t.email);
  let kids = must(await c.from('kids').select('id, name'), 'kids');
  if (kids.length === 0) kids = [must(await c.from('kids').insert({ name: t.kid.name, grade: t.kid.grade, interests: t.kid.interests }).select('id, name').single(), 'kid')];
  const have = must(await c.from('events').select('id').gte('date', d(0)), 'events');
  if (have.length === 0) must(await c.from('events').insert(t.events.map(([title, kind, n]) => ({ kid_id: kids[0].id, title, kind, date: d(n) }))), 'insert events');
  out.push({ email: t.email, password: PW, parent: t.name, kid: `${kids[0].name} (grade ${t.kid.grade})` });
}
console.table(out);
