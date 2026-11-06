// Live smoke test against the real Supabase project, public API only.
// Usage: node scripts/smoke/live-v2.mjs  (creates throwaway accounts and deletes them)
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://vpfwybfgiqiiimzayydj.supabase.co';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_pifu58uviprpJYi3Frd0Rw_bvj_Ar2Q';
const KEEP = process.argv.includes('--keep');
const tag = Math.random().toString(36).slice(2, 8);
const out = {};
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
const client = () => createClient(URL, KEY, { auth: { persistSession: false } });

// Student signs up alone.
const st = client();
const uname = `smoke_${tag}`;
const pw = 'Acorns2026!';
const su = must(await st.rpc('sign_up_student', { p_username: uname, p_password: pw, p_display_name: 'Smoke Fox', p_grade: 7, p_age_attested: true }), 'sign_up_student');
out.signUp = 'ok';
const dup = await st.rpc('sign_up_student', { p_username: uname, p_password: pw, p_display_name: 'X', p_grade: null, p_age_attested: true });
out.duplicateUsernameRejected = !!dup.error;
const under = await st.rpc('sign_up_student', { p_username: `u_${tag}`, p_password: pw, p_display_name: 'X', p_grade: null, p_age_attested: false });
out.under13Rejected = !!under.error;
must(await st.auth.signInWithPassword({ email: su.email, password: pw }), 'student sign-in');
const bad = await client().auth.signInWithPassword({ email: su.email, password: 'wrong-password' });
out.wrongPasswordRejected = !!bad.error;

// Quest + check-in.
const qid = must(await st.rpc('create_quest', { p_title: 'Math worksheet 4.2', p_kind: 'quest', p_due_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), p_acorns: 10, p_teacher: null, p_when: null, p_reward: null, p_steps: [{ label: 'First 3 problems', minutes: 10 }, { label: 'The rest', minutes: 15 }] }), 'create_quest');
out.questCreated = !!qid;
must(await st.rpc('submit_check_in', { p_score: 3, p_note: 'private note never shared' }), 'check-in');
const code = must(await st.rpc('create_parent_link_code'), 'link code');
out.linkCode = code.code.length === 6;

// Parent signs up, links, reads summary, resets password.
const pa = client();
const pemail = `smoke.parent.${tag}@gmail.com`;
const ps = must(await pa.auth.signUp({ email: pemail, password: pw, options: { data: { display_name: 'Smoke Parent' } } }), 'parent signUp');
if (!ps.session) throw new Error('parent sign-up returned no session (Confirm email is ON?)');
const before = await pa.rpc('parent_weekly_summary', { p_student_id: su.studentId });
out.parentBlockedBeforeLink = !!before.error;
const sid = must(await pa.rpc('redeem_parent_link_code', { p_code: code.code.toLowerCase() }), 'redeem');
out.linked = sid === su.studentId;
const again = await pa.rpc('redeem_parent_link_code', { p_code: code.code });
out.codeSingleUse = !!again.error;
const kids = must(await pa.from('family_students').select('user_id, users(display_name, username)'), 'kids');
out.parentSeesKid = kids.some((k) => k.user_id === su.studentId);
const sum = must(await pa.rpc('parent_weekly_summary', { p_student_id: su.studentId }), 'summary');
out.summaryHasNoNote = !JSON.stringify(sum).includes('private note');
const notes = await pa.from('private_notes').select('*');
out.parentCannotReadNotes = (notes.data ?? []).length === 0;
const newPw = 'NewAcorns2026!';
must(await pa.rpc('reset_child_password', { p_student_id: su.studentId, p_new_password: newPw }), 'reset');
must(await client().auth.signInWithPassword({ email: su.email, password: newPw }), 'student sign-in with new password');
out.passwordResetWorks = true;
const anonQuest = await client().rpc('create_quest', { p_title: 'x', p_kind: 'quest', p_due_date: '2026-01-01', p_acorns: 1, p_teacher: null, p_when: null, p_reward: null, p_steps: [{ label: 'a', minutes: 1 }] });
out.anonBlocked = !!anonQuest.error;

if (!KEEP) {
  must(await pa.rpc('delete_my_account'), 'parent delete');
  const st2 = client();
  must(await st2.auth.signInWithPassword({ email: su.email, password: newPw }), 'student re-sign-in');
  must(await st2.rpc('delete_my_account'), 'student delete');
  out.cleanedUp = true;
} else {
  out.kept = { studentUsername: uname, studentPassword: newPw, parentEmail: pemail, parentPassword: pw };
}
console.log(JSON.stringify(out, null, 2));
const failed = Object.entries(out).filter(([k, v]) => v === false);
if (failed.length) { console.error('FAILED:', failed.map(([k]) => k).join(', ')); process.exit(1); }
