// Creates (or refreshes) the shared tester accounts for the live app.
import { createClient } from '@supabase/supabase-js';
const URL = 'https://vpfwybfgiqiiimzayydj.supabase.co';
const KEY = 'sb_publishable_pifu58uviprpJYi3Frd0Rw_bvj_Ar2Q';
const PW = 'Acorns2026!';
const client = () => createClient(URL, KEY, { auth: { persistSession: false } });
const must = (r, w) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data; };

// Remove the throwaway accounts from the smoke run.
for (const [email, pw] of [['smoke.parent.bi94d7@gmail.com', 'Acorns2026!'], ['smoke_bi94d7@students.earlysignal.invalid', 'NewAcorns2026!']]) {
  const c = client();
  const r = await c.auth.signInWithPassword({ email, password: pw });
  if (!r.error) await c.rpc('delete_my_account');
}

const st = client();
let s = await st.auth.signInWithPassword({ email: 'maya_demo@students.earlysignal.invalid', password: PW });
if (s.error) {
  must(await st.rpc('sign_up_student', { p_username: 'maya_demo', p_password: PW, p_display_name: 'Maya', p_grade: 7, p_age_attested: true }), 'student');
  s = must(await st.auth.signInWithPassword({ email: 'maya_demo@students.earlysignal.invalid', password: PW }), 'student sign-in');
  const due = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
  must(await st.rpc('create_quest', { p_title: 'Science lab write-up', p_kind: 'quest', p_due_date: due(1), p_acorns: 15, p_teacher: 'Ms. Ortiz', p_when: null, p_reward: null, p_steps: [{ label: 'Jot 3 bullet points', minutes: 5, hint: 'Messy is fine.' }, { label: 'Turn them into a draft', minutes: 15 }, { label: 'Read it out loud once and fix', minutes: 7 }] }), 'q1');
  must(await st.rpc('create_quest', { p_title: 'Read ch. 6, Hatchet', p_kind: 'quest', p_due_date: due(1), p_acorns: 10, p_teacher: null, p_when: 'before bed', p_reward: null, p_steps: [{ label: 'Read the first half', minutes: 12 }, { label: 'Read the rest', minutes: 12 }, { label: 'Write 2 sentences: what happened?', minutes: 4 }] }), 'q2');
  must(await st.rpc('create_quest', { p_title: 'Science quiz: Cells', p_kind: 'boss', p_due_date: due(4), p_acorns: 30, p_teacher: null, p_when: null, p_reward: 'rare item waiting', p_steps: [{ label: 'Review notes', minutes: 10 }, { label: 'Flashcards', minutes: 15 }, { label: 'Self-quiz', minutes: 10 }, { label: 'Redo what you missed', minutes: 10 }] }), 'q3');
  must(await st.rpc('submit_check_in', { p_score: 3, p_note: 'first day with Pip' }), 'checkin');
}
const code = must(await st.rpc('create_parent_link_code'), 'code');

const pa = client();
let p = await pa.auth.signInWithPassword({ email: 'earlysignal.demo.parent@gmail.com', password: PW });
if (p.error) {
  p = must(await pa.auth.signUp({ email: 'earlysignal.demo.parent@gmail.com', password: PW, options: { data: { display_name: 'Ana Santos' } } }), 'parent');
}
const kids = must(await pa.from('family_students').select('user_id'), 'kids');
if (kids.length === 0) must(await pa.rpc('redeem_parent_link_code', { p_code: code.code }), 'link');
const check = must(await pa.from('family_students').select('user_id, users(display_name, username)'), 'check');
console.log(JSON.stringify({ student: 'maya_demo', parent: 'earlysignal.demo.parent@gmail.com', password: PW, linked: check.map((k) => k.users?.username) }));
