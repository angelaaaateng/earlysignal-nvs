/**
 * Server-side rule tests: the real migration on a Postgres, hit as each
 * parent the way PostgREST does (SET ROLE authenticated + JWT claims). No app
 * code involved, so this proves one parent can never see another's family.
 *
 *   npm run test:db        (needs TEST_DATABASE_URL, see scripts/db-local.sh)
 */
import { Client } from 'pg';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.env.TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;
const ROOT = join(__dirname, '..');

let db: Client;
const ids: Record<string, string> = {};

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query('begin');
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [uid ? JSON.stringify({ sub: uid, role: 'authenticated' }) : '']);
    await db.query(`set local role ${uid ? 'authenticated' : 'anon'}`);
    const r = await fn();
    await db.query('commit');
    return r;
  } catch (e) {
    await db.query('rollback');
    throw e;
  }
}
const rows = (uid: string | null, sql: string, params: unknown[] = []) => as(uid, async () => (await db.query(sql, params)).rows);
const one = async (uid: string | null, sql: string, params: unknown[] = []) => (await rows(uid, sql, params))[0];

async function newAuthUser(email: string, meta: Record<string, unknown> = {}) {
  const r = await db.query(`insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), $1, $2) returning id`, [email, JSON.stringify(meta)]);
  return r.rows[0].id as string;
}

describeDb('Rooted schema: rules enforced in the database', () => {
  beforeAll(async () => {
    db = new Client({ connectionString: url });
    await db.connect();
    await db.query('drop schema if exists public cascade; create schema public; drop schema if exists auth cascade; drop schema if exists extensions cascade;');
    await db.query(readFileSync(join(ROOT, 'tests/auth_stub.sql'), 'utf8'));
    await db.query(readFileSync(join(ROOT, 'migrations/20261110000000_rooted.sql'), 'utf8'));
    ids.maya = await newAuthUser('maya@example.com', { display_name: 'Maya Chen' });
    ids.other = await newAuthUser('other@example.com', { display_name: 'Other Parent' });
  }, 60_000);
  afterAll(async () => {
    await db?.end();
  });

  it('a sign-up becomes a parent row named from the metadata, and is audited', async () => {
    const p = await db.query(`select display_name from public.parents where id = $1`, [ids.maya]);
    expect(p.rows[0].display_name).toBe('Maya Chen');
    const a = await db.query(`select count(*)::int as n from public.audit_log where actor_id = $1 and event = 'account.create'`, [ids.maya]);
    expect(a.rows[0].n).toBe(1);
  });

  it('a parent adds a kid, an event and a talk; parent_id is filled in by the database', async () => {
    const kid = await one(ids.maya, `insert into public.kids (name, grade, interests) values ('Ava', 6, '{Soccer,Art}') returning id, parent_id`);
    expect(kid.parent_id).toBe(ids.maya);
    ids.ava = kid.id;
    const ev = await one(ids.maya, `insert into public.events (kid_id, title, kind, date) values ($1, 'Math test', 'test', current_date + 1) returning id`, [ids.ava]);
    ids.mathTest = ev.id;
    const talk = await one(ids.maya, `insert into public.talks (kid_id, event_id, prompt_id, question, moment, outcome, rating) values ($1, $2, 'test-b1', 'What part of Math test feels most ready?', 'car', 'good_talk', 8) returning id`, [ids.ava, ids.mathTest]);
    expect(talk.id).toBeTruthy();
    const audit = await rows(ids.maya, `select event from public.audit_log where event = 'talk.log'`);
    expect(audit.length).toBe(1);
  });

  it('another parent sees nothing of that family', async () => {
    expect(await rows(ids.other, `select * from public.kids`)).toEqual([]);
    expect(await rows(ids.other, `select * from public.events`)).toEqual([]);
    expect(await rows(ids.other, `select * from public.talks`)).toEqual([]);
    expect(await rows(ids.other, `select * from public.parents`)).toHaveLength(1); // only themselves
    expect(await rows(ids.other, `select * from public.audit_log where actor_id = $1`, [ids.maya])).toEqual([]);
  });

  it('another parent cannot attach an event or a talk to someone else’s kid, nor write rows as them', async () => {
    await expect(rows(ids.other, `insert into public.events (kid_id, title, kind, date) values ($1, 'Sneaky', 'other', current_date)`, [ids.ava])).rejects.toThrow(/row-level security/);
    await expect(rows(ids.other, `insert into public.talks (kid_id, prompt_id, question, outcome, rating) values ($1, 'g-school-1', 'x', 'good_talk', 8)`, [ids.ava])).rejects.toThrow(/row-level security/);
    await expect(rows(ids.other, `insert into public.kids (parent_id, name, grade) values ($1, 'Impostor', 7)`, [ids.maya])).rejects.toThrow(/row-level security/);
    // Updates and deletes on Maya's rows silently touch nothing.
    await rows(ids.other, `update public.kids set name = 'Hacked' where id = $1`, [ids.ava]);
    await rows(ids.other, `delete from public.events where id = $1`, [ids.mathTest]);
    expect((await one(ids.maya, `select name from public.kids where id = $1`, [ids.ava])).name).toBe('Ava');
    expect(await rows(ids.maya, `select id from public.events where id = $1`, [ids.mathTest])).toHaveLength(1);
  });

  it('anonymous callers get nothing and can call nothing', async () => {
    expect(await rows(null, `select * from public.kids`)).toEqual([]);
    expect(await rows(null, `select * from public.talks`)).toEqual([]);
    await expect(rows(null, `select public.delete_my_account()`)).rejects.toThrow(/permission denied|not signed in/);
    await expect(rows(ids.maya, `select public.log_event('x')`)).rejects.toThrow(/permission denied/);
  });

  it('the week review is one row per parent per week', async () => {
    await rows(ids.maya, `insert into public.week_reviews (week_start) values (date_trunc('week', current_date)::date)`);
    await expect(rows(ids.maya, `insert into public.week_reviews (week_start) values (date_trunc('week', current_date)::date)`)).rejects.toThrow(/duplicate key/);
    expect(await rows(ids.other, `select * from public.week_reviews`)).toEqual([]);
  });

  it('deleting a kid removes their events and talks; deleting the account removes everything', async () => {
    const kid2 = await one(ids.maya, `insert into public.kids (name, grade) values ('Leo', 8) returning id`);
    await rows(ids.maya, `insert into public.events (kid_id, title, kind, date) values ($1, 'Showcase', 'presentation', current_date + 2)`, [kid2.id]);
    await rows(ids.maya, `delete from public.kids where id = $1`, [kid2.id]);
    expect(await rows(ids.maya, `select * from public.events where kid_id = $1`, [kid2.id])).toEqual([]);

    await rows(ids.maya, `select public.delete_my_account()`);
    expect((await db.query(`select count(*)::int as n from public.parents where id = $1`, [ids.maya])).rows[0].n).toBe(0);
    expect((await db.query(`select count(*)::int as n from public.kids`)).rows[0].n).toBe(0);
    expect((await db.query(`select count(*)::int as n from public.talks`)).rows[0].n).toBe(0);
    expect((await db.query(`select count(*)::int as n from auth.users where id = $1`, [ids.maya])).rows[0].n).toBe(0);
  });
});
