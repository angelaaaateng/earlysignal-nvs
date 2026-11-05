/**
 * Server-side rule tests. Run the real migration against a Postgres and hit
 * it as each role the way PostgREST does: SET ROLE authenticated plus the
 * request's JWT claims. No app code involved, so this proves the rules hold
 * for anyone who talks to the database directly.
 *
 *   npm run test:db        (needs TEST_DATABASE_URL, see scripts/db-test.sh)
 */
import { Client } from 'pg';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.env.TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;

const ROOT = join(__dirname, '..');
const NOTE = 'DB-PRIVATE-NOTE-91ab';

let db: Client;
const ids: Record<string, string> = {};

/** Run `fn` as the given auth user, the way PostgREST would. */
async function as<T>(uid: string | null, fn: () => Promise<T>, email?: string): Promise<T> {
  await db.query('begin');
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [uid ? JSON.stringify({ sub: uid, role: 'authenticated', email }) : '']);
    await db.query(`set local role ${uid ? 'authenticated' : 'anon'}`);
    const r = await fn();
    await db.query('commit');
    return r;
  } catch (e) {
    await db.query('rollback');
    throw e;
  }
}
const rows = async (uid: string | null, sql: string, params: unknown[] = []) => as(uid, async () => (await db.query(sql, params)).rows);
const call = async (uid: string | null, sql: string, params: unknown[] = []) => as(uid, async () => (await db.query(sql, params)).rows[0]);

async function newAuthUser(email: string, meta: Record<string, unknown> = {}) {
  const r = await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), $1, $2) returning id`,
    [email, JSON.stringify(meta)],
  );
  return r.rows[0].id as string;
}

describeDb('Supabase schema: rules enforced in the database', () => {
  beforeAll(async () => {
    db = new Client({ connectionString: url });
    await db.connect();
    await db.query('drop schema if exists public cascade; create schema public; drop schema if exists auth cascade; drop schema if exists extensions cascade;');
    await db.query(readFileSync(join(ROOT, 'tests/auth_stub.sql'), 'utf8'));
    await db.query(readFileSync(join(ROOT, 'migrations/20261105000000_schema.sql'), 'utf8'));

    // Org + admin invite + admin.
    ids.org = (await db.query(`insert into public.orgs (name, kind) values ('Lincoln Middle School', 'school') returning id`)).rows[0].id;
    await db.query(`insert into public.admin_invites (email, org_id, display_name) values ('patel@lincoln.example', $1, 'Ms. Patel')`, [ids.org]);
    ids.admin = await newAuthUser('patel@lincoln.example');
    // Two parents: Ana (Maya's mom) and a stranger.
    ids.mom = await newAuthUser('ana@example.com', { display_name: 'Ana Santos', relationship: 'Mom' });
    ids.stranger = await newAuthUser('other@example.com', { display_name: 'Other Parent' });
    ids.family = (await db.query(`select family_id from public.family_parents where user_id = $1`, [ids.mom])).rows[0].family_id;
    ids.strangerFamily = (await db.query(`select family_id from public.family_parents where user_id = $1`, [ids.stranger])).rows[0].family_id;
    await db.query(`update public.families set org_id = $1, admin_opt_in = true where id in ($2, $3)`, [ids.org, ids.family, ids.strangerFamily]);
  }, 60_000);

  afterAll(async () => {
    await db?.end();
  });

  describe('Accounts', () => {
    it('a new email sign-up becomes a parent with their own family; an invited email becomes an admin', async () => {
      const mom = await db.query(`select role, display_name from public.users where id = $1`, [ids.mom]);
      expect(mom.rows[0]).toEqual({ role: 'parent', display_name: 'Ana Santos' });
      const admin = await db.query(`select role, org_id from public.users where id = $1`, [ids.admin]);
      expect(admin.rows[0]).toEqual({ role: 'admin', org_id: ids.org });
      expect(ids.family).toBeTruthy();
    });

    it('COPPA: an under-13 student cannot be created without consent, and the failure creates nothing', async () => {
      const before = (await db.query('select count(*)::int as n from auth.users')).rows[0].n;
      await expect(
        call(ids.mom, `select public.create_student($1, 'Maya', 'Santos', (current_date - interval '11 years')::date, 6::smallint, '1234')`, [ids.family]),
      ).rejects.toThrow(/CONSENT_REQUIRED/);
      const after = (await db.query('select count(*)::int as n from auth.users')).rows[0].n;
      expect(after).toBe(before);
    });

    it('COPPA: consent must be agreed, then the student is created and linked to it; consent is single-use', async () => {
      const birth = '2015-03-14';
      await expect(
        call(ids.mom, `select public.record_parental_consent($1, 'Maya', $2, 'card_check', '2026-11-v1', false)`, [ids.family, birth]),
      ).rejects.toThrow(/CONSENT_REQUIRED/);
      const { record_parental_consent: consentId } = await call(
        ids.mom, `select public.record_parental_consent($1, 'Maya', $2, 'card_check', '2026-11-v1', true)`, [ids.family, birth],
      );
      // A stranger can't use someone else's consent or family.
      await expect(
        call(ids.stranger, `select public.create_student($1, 'Maya', 'Santos', $2, 6::smallint, '1234', $3)`, [ids.family, birth, consentId]),
      ).rejects.toThrow(/ACCESS_DENIED/);
      const { create_student: sid } = await call(
        ids.mom, `select public.create_student($1, 'Maya', 'Santos', $2, 6::smallint, '1234', $3)`, [ids.family, birth, consentId],
      );
      ids.maya = sid;
      const c = await db.query(`select student_id from public.parental_consents where id = $1`, [consentId]);
      expect(c.rows[0].student_id).toBe(sid);
      await expect(
        call(ids.mom, `select public.create_student($1, 'Leo', 'Santos', $2, 4::smallint, '1234', $3)`, [ids.family, birth, consentId]),
      ).rejects.toThrow(/CONSENT_REQUIRED/);
      // The student's auth email is synthetic and undeliverable.
      const au = await db.query(`select email from auth.users where id = $1`, [sid]);
      expect(au.rows[0].email).toMatch(/@students\.earlysignal\.invalid$/);
    });

    it('13 and over needs no consent', async () => {
      const { create_student: sid } = await call(
        ids.mom, `select public.create_student($1, 'Ines', 'Santos', '2010-01-01', 10::smallint, '5678')`, [ids.family],
      );
      expect(sid).toBeTruthy();
      ids.ines = sid;
    });

    it('student sign-in lookup works by family code + first name, and PIN is stored hashed', async () => {
      const code = (await db.query(`select join_code from public.families where id = $1`, [ids.family])).rows[0].join_code;
      const r = await call(null, `select public.student_login_email($1, 'maya') as email`, [code]);
      expect(r.email).toMatch(/@students\.earlysignal\.invalid$/);
      const pw = (await db.query(`select encrypted_password from auth.users where id = $1`, [ids.maya])).rows[0].encrypted_password;
      expect(pw).not.toBe('1234');
      expect((await db.query(`select extensions.crypt('1234', $1) = $1 as ok`, [pw])).rows[0].ok).toBe(true);
      expect((await call(null, `select public.student_login_email('NOPE', 'maya') as email`)).email).toBeNull();
    });

    it('only the student (not a parent, not an admin) can read or write student-only tables', async () => {
      await expect(rows(ids.mom, `insert into public.check_ins (student_id, date, score) values ($1, current_date, 3)`, [ids.maya])).rejects.toThrow();
      await expect(rows(ids.mom, `update public.users set role = 'admin' where id = $1 returning id`, [ids.mom])).rejects.toThrow();
    });
  });

  describe('Check-ins, notes and quests', () => {
    it('student submits a check-in with a private note; +5 acorns once per day', async () => {
      await call(ids.maya, `select public.submit_check_in(4::smallint, $1)`, [NOTE]);
      await call(ids.maya, `select public.submit_check_in(3::smallint, $1)`, [NOTE]);
      const ci = await rows(ids.maya, `select score from public.check_ins where student_id = $1`, [ids.maya]);
      expect(ci).toEqual([{ score: 3 }]);
      const ac = await rows(ids.maya, `select coalesce(sum(amount), 0)::int as n from public.acorns where student_id = $1`, [ids.maya]);
      expect(ac[0].n).toBe(5);
      const note = await rows(ids.maya, `select text from public.private_notes where student_id = $1`, [ids.maya]);
      expect(note).toEqual([{ text: NOTE }]);
    });

    it('a parent cannot submit on the child’s behalf, and a student cannot touch another student’s quest', async () => {
      await expect(call(ids.mom, `select public.submit_check_in(2::smallint, '')`)).rejects.toThrow(/ACCESS_DENIED/);
      const q = await db.query(
        `insert into public.quests (student_id, title, due_date, acorns) values ($1, 'Ines homework', current_date, 5) returning id`, [ids.ines],
      );
      const st = await db.query(`insert into public.quest_steps (quest_id, "order", label, minutes) values ($1, 0, 'do it', 10) returning id`, [q.rows[0].id]);
      await expect(call(ids.maya, `select public.toggle_quest_step($1)`, [st.rows[0].id])).rejects.toThrow(/ACCESS_DENIED/);
      await call(ids.ines, `select public.toggle_quest_step($1)`, [st.rows[0].id]);
      const ac = await rows(ids.ines, `select coalesce(sum(amount), 0)::int as n from public.acorns where student_id = $1`, [ids.ines]);
      expect(ac[0].n).toBe(5);
    });
  });

  describe('Rule: private notes are never shared', () => {
    it('no parent, admin, stranger or anonymous query can read the notes table', async () => {
      for (const who of [ids.mom, ids.admin, ids.stranger, ids.ines]) {
        expect(await rows(who, `select * from public.private_notes`)).toEqual([]);
      }
      await expect(rows(null, `select * from public.private_notes`)).rejects.toThrow();
    });

    it('no projection or audit row contains the note text', async () => {
      const s = await call(ids.mom, `select public.parent_weekly_summary($1) as s`, [ids.maya]);
      expect(JSON.stringify(s)).not.toContain(NOTE);
      const a = await rows(ids.admin, `select * from public.admin_family_rows()`);
      expect(JSON.stringify(a)).not.toContain(NOTE);
      const log = await db.query(`select data::text as d from public.audit_log`);
      expect(log.rows.map((r) => r.d).join('\n')).not.toContain(NOTE);
    });
  });

  describe('Rule: parents see only what the student shares', () => {
    it('the summary carries weekly averages and never a per-day score or check-in row', async () => {
      const { s } = await call(ids.mom, `select public.parent_weekly_summary($1) as s`, [ids.maya]);
      expect(s.moodWeeks).toHaveLength(5);
      expect(s.checkIns.done).toBe(1);
      expect(JSON.stringify(s)).not.toMatch(/"score"/);
      expect(s.upcomingTests).toBeUndefined(); // default off
      expect(await rows(ids.mom, `select * from public.check_ins`)).toEqual([]);
    });

    it('turning a toggle off removes the field immediately; only the student can flip toggles', async () => {
      await expect(rows(ids.mom, `update public.sharing_settings set mood_trend = false where student_id = $1 returning *`, [ids.maya])).resolves.toEqual([]);
      await rows(ids.maya, `update public.sharing_settings set mood_trend = false, quests_finished = false where student_id = $1`, [ids.maya]);
      const { s } = await call(ids.mom, `select public.parent_weekly_summary($1) as s`, [ids.maya]);
      expect(s.moodWeeks).toBeUndefined();
      expect(s.checkIns).toBeUndefined();
      expect(s.questsFinished).toBeUndefined();
      expect(s.streak).toBe(1);
      expect(s.hidden).toEqual(expect.arrayContaining(['moodTrend', 'questsFinished', 'upcomingTests']));
    });

    it('a stranger cannot read the summary, send a cheer or see the family', async () => {
      await expect(call(ids.stranger, `select public.parent_weekly_summary($1)`, [ids.maya])).rejects.toThrow(/ACCESS_DENIED/);
      await expect(call(ids.stranger, `select public.send_cheer($1)`, [ids.maya])).rejects.toThrow(/ACCESS_DENIED/);
      expect(await rows(ids.stranger, `select id from public.users where id = $1`, [ids.maya])).toEqual([]);
      expect(await rows(ids.stranger, `select id from public.families where id = $1`, [ids.family])).toEqual([]);
      await call(ids.mom, `select public.send_cheer($1)`, [ids.maya]);
      expect(await rows(ids.maya, `select count(*)::int as n from public.cheers where student_id = $1`, [ids.maya])).toEqual([{ n: 1 }]);
    });
  });

  describe('Rule: admins see only families that opted in', () => {
    it('sees opted-in families only, as conclusions, and never rows from the other org', async () => {
      const r = await rows(ids.admin, `select * from public.admin_family_rows()`);
      const names = r.map((x) => x.name);
      expect(names).toContain('M. Santos');
      await db.query(`update public.families set admin_opt_in = false where id = $1`, [ids.strangerFamily]);
      await call(ids.mom, `select public.set_family_admin_opt_in($1, false)`, [ids.family]);
      expect(await rows(ids.admin, `select * from public.admin_family_rows()`)).toEqual([]);
      expect(await rows(ids.admin, `select id from public.users where role = 'student'`)).toEqual([]);
      await expect(call(ids.admin, `select public.admin_suggest_coach($1)`, [ids.maya])).rejects.toThrow(/ACCESS_DENIED/);
    });

    it('a parent, not an admin, controls the opt-in; after opting back in the admin can act', async () => {
      await expect(call(ids.admin, `select public.set_family_admin_opt_in($1, true)`, [ids.family])).rejects.toThrow(/ACCESS_DENIED/);
      await call(ids.mom, `select public.set_family_admin_opt_in($1, true)`, [ids.family]);
      const { admin_suggest_coach: rid } = await call(ids.admin, `select public.admin_suggest_coach($1)`, [ids.maya]);
      expect(rid).toBeTruthy();
      const r = await rows(ids.admin, `select * from public.admin_family_rows() where student_id = $1`, [ids.maya]);
      expect(r[0].coach_suggested).toBe(true);
      expect(r[0].shares).toEqual(['streak and level']);
      expect(await rows(ids.mom, `select target from public.referrals where student_id = $1`, [ids.maya])).toEqual([{ target: 'ef_coach' }]);
    });

    it('non-admins cannot call admin projections', async () => {
      await expect(rows(ids.mom, `select * from public.admin_family_rows()`)).rejects.toThrow(/ACCESS_DENIED/);
      expect(await rows(ids.mom, `select * from public.admin_self_starters()`)).toEqual([]);
    });
  });

  describe('Audit and deletion', () => {
    it('every sensitive action is in the audit log with its actor', async () => {
      const ev = (await db.query(`select event, actor_id from public.audit_log order by id`)).rows;
      const events = ev.map((e) => e.event);
      for (const e of ['consent.record', 'student.account.create', 'checkin.submit', 'cheer.send', 'parent.summary.view', 'admin.dashboard.view', 'referral.suggest_coach', 'family.admin_opt_in']) {
        expect(events).toContain(e);
      }
      expect(ev.find((e) => e.event === 'checkin.submit')?.actor_id).toBe(ids.maya);
      // A user sees only entries about themself.
      const mine = await rows(ids.maya, `select event from public.audit_log`);
      expect(mine.every((m) => ['checkin.submit', 'student.account.create', 'cheer.send', 'parent.summary.view', 'referral.suggest_coach', 'quest.step.toggle'].includes(m.event))).toBe(true);
      await expect(rows(ids.maya, `insert into public.audit_log (event) values ('fake')`)).rejects.toThrow();
    });

    it('a parent can withdraw consent, which deletes the child’s data everywhere', async () => {
      await expect(call(ids.stranger, `select public.revoke_consent_and_delete_student($1)`, [ids.maya])).rejects.toThrow(/ACCESS_DENIED/);
      await call(ids.mom, `select public.revoke_consent_and_delete_student($1)`, [ids.maya]);
      expect((await db.query(`select count(*)::int as n from auth.users where id = $1`, [ids.maya])).rows[0].n).toBe(0);
      expect((await db.query(`select count(*)::int as n from public.private_notes where student_id = $1`, [ids.maya])).rows[0].n).toBe(0);
      expect((await db.query(`select count(*)::int as n from public.check_ins where student_id = $1`, [ids.maya])).rows[0].n).toBe(0);
      const c = (await db.query(`select revoked_at, student_id from public.parental_consents where child_first_name = 'Maya'`)).rows[0];
      expect(c.revoked_at).not.toBeNull();
      expect(c.student_id).toBeNull();
    });
  });
});

describeDb('Anonymous callers', () => {
  it('cannot read a summary, a streak or admin rows, and cannot write', async () => {
    await expect(call(null, `select public.parent_weekly_summary($1)`, [ids.ines])).rejects.toThrow();
    await expect(call(null, `select public.current_streak($1)`, [ids.ines])).rejects.toThrow();
    await expect(rows(null, `select * from public.admin_family_rows()`)).rejects.toThrow();
    await expect(call(null, `select public.submit_check_in(3::smallint, '')`)).rejects.toThrow();
    await expect(call(null, `select public.create_student($1, 'X', 'Y', '2010-01-01', 5::smallint, '1234')`, [ids.family])).rejects.toThrow();
  });
});
