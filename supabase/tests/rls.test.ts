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

describeDb('Rooted v2: pilot features stay per-parent', () => {
  let c: Client;
  const id: Record<string, string> = {};
  const asUser = async <T,>(uid: string | null, fn: () => Promise<T>): Promise<T> => {
    await c.query('begin');
    try {
      await c.query(`select set_config('request.jwt.claims', $1, true)`, [uid ? JSON.stringify({ sub: uid, role: 'authenticated' }) : '']);
      await c.query(`set local role ${uid ? 'authenticated' : 'anon'}`);
      const r = await fn();
      await c.query('commit');
      return r;
    } catch (e) {
      await c.query('rollback');
      throw e;
    }
  };
  const q = (uid: string | null, sql: string, params: unknown[] = []) => asUser(uid, async () => (await c.query(sql, params)).rows);

  beforeAll(async () => {
    c = new Client({ connectionString: url });
    await c.connect();
    await c.query('drop schema if exists public cascade; create schema public; drop schema if exists auth cascade; drop schema if exists extensions cascade;');
    await c.query(readFileSync(join(ROOT, 'tests/auth_stub.sql'), 'utf8'));
    await c.query(readFileSync(join(ROOT, 'migrations/20261110000000_rooted.sql'), 'utf8'));
    await c.query(readFileSync(join(ROOT, 'migrations/20261111000000_rooted_v2_enum.sql'), 'utf8'));
    await c.query(readFileSync(join(ROOT, 'migrations/20261111000001_rooted_v2.sql'), 'utf8'));
    id.a = (await c.query(`insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'a@example.com', '{"display_name":"A"}') returning id`)).rows[0].id;
    id.b = (await c.query(`insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'b@example.com', '{"display_name":"B"}') returning id`)).rows[0].id;
    id.kid = (await q(id.a, `insert into public.kids (name, grade) values ('Ava', 6) returning id`))[0].id;
  }, 60_000);
  afterAll(async () => {
    await c?.end();
  });

  it('wrong_moment is an outcome; arm and follow_up_used ride on the talk; prompt_stats shows only your own', async () => {
    await q(id.a, `insert into public.talks (kid_id, prompt_id, question, outcome, rating, arm, follow_up_used) values ($1, 'g-school-1', 'q', 'wrong_moment', 3, 'generic', false)`, [id.kid]);
    await q(id.a, `insert into public.talks (kid_id, prompt_id, question, outcome, rating, arm, follow_up_used) values ($1, 'g-school-1', 'q', 'good_talk', 8, 'event', true)`, [id.kid]);
    const mine = await q(id.a, `select prompt_id, arm, asked, landed, wrong_moment from public.prompt_stats order by arm`);
    expect(mine).toEqual([
      { prompt_id: 'g-school-1', arm: 'event', asked: 1, landed: 1, wrong_moment: 0 },
      { prompt_id: 'g-school-1', arm: 'generic', asked: 1, landed: 0, wrong_moment: 1 },
    ]);
    expect(await q(id.b, `select * from public.prompt_stats`)).toEqual([]);
  });

  it('impressions are unique per kid, prompt and day, and another parent cannot see or fake them', async () => {
    await q(id.a, `insert into public.impressions (kid_id, prompt_id, arm) values ($1, 'test-b1', 'event')`, [id.kid]);
    await expect(q(id.a, `insert into public.impressions (kid_id, prompt_id, arm) values ($1, 'test-b1', 'event')`, [id.kid])).rejects.toThrow(/duplicate key/);
    expect(await q(id.b, `select * from public.impressions`)).toEqual([]);
    await expect(q(id.b, `insert into public.impressions (kid_id, prompt_id, arm) values ($1, 'x', 'generic')`, [id.kid])).rejects.toThrow(/row-level security/);
  });

  it('nudge settings and push subscriptions are the parent’s own; the sender functions are not callable by parents', async () => {
    await q(id.a, `update public.parents set nudge_enabled = true, nudge_hour = 17, tz = 'America/Chicago' where id = $1`, [id.a]);
    await q(id.a, `insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/abc', 'k', 'a')`);
    expect(await q(id.b, `select * from public.push_subscriptions`)).toEqual([]);
    await expect(q(id.a, `select * from public.nudge_targets()`)).rejects.toThrow(/permission denied/);
    await expect(q(id.a, `select public.mark_nudged(array[$1::uuid])`, [id.a])).rejects.toThrow(/permission denied/);
    // The service role sees the due parent once their local hour matches.
    const hour = (await c.query(`select extract(hour from (now() at time zone 'America/Chicago'))::int as h`)).rows[0].h;
    await c.query(`update public.parents set nudge_hour = $1 where id = $2`, [hour, id.a]);
    const due = (await c.query(`select parent_id, kid_name, endpoint from public.nudge_targets()`)).rows;
    expect(due).toEqual([{ parent_id: id.a, kid_name: 'Ava', endpoint: 'https://push.example/abc' }]);
    await c.query(`select public.mark_nudged(array[$1::uuid])`, [id.a]);
    expect((await c.query(`select count(*)::int as n from public.nudge_targets()`)).rows[0].n).toBe(0);
  });

  it('pilot interest is one row per parent and invisible to others', async () => {
    await q(id.a, `insert into public.pilot_interest (note) values ('count me in')`);
    await expect(q(id.a, `insert into public.pilot_interest (note) values ('again')`)).rejects.toThrow(/duplicate key/);
    expect(await q(id.b, `select * from public.pilot_interest`)).toEqual([]);
    expect(await q(null, `select * from public.pilot_interest`)).toEqual([]);
  });
});
