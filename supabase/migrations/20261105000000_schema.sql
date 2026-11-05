-- EarlySignal schema. Applied to the hosted Supabase project by the CLI
-- (`supabase db push`) or the dashboard, and to a plain Postgres by the
-- RLS test harness (which stubs the `auth` schema first).
--
-- Design:
-- * Roles live in public.users, not in the JWT, so revoking a role or opting
--   a family out of the admin dashboard takes effect on the next request.
-- * Private notes live in their own table that has NO parent or admin policy,
--   so even a future bug in another policy cannot expose them.
-- * Every write that touches another person's data goes through a function
--   that checks the caller. Direct table writes are limited to a user's own rows.
-- * COPPA: create_student() refuses an under-13 account unless a matching,
--   unused, unrevoked consent already exists. There is no other way to create
--   a student.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- types ---
create type public.user_role as enum ('student', 'parent', 'admin');
create type public.org_kind as enum ('school', 'clinic');
create type public.consent_method as enum ('card_check', 'signed_form', 'video_call');
create type public.quest_kind as enum ('quest', 'boss');
create type public.referral_target as enum ('counselor', 'ef_coach', 'clinic');
create type public.referral_status as enum ('requested', 'waitlist', 'booked', 'scheduled', 'closed');
create type public.acorn_reason as enum ('check_in', 'quest', 'bonus');

-- --------------------------------------------------------------- tables ---
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind public.org_kind not null,
  created_at timestamptz not null default now()
);

-- One row per auth user. Students under 13 have an auth user too (created by
-- create_student with a synthetic email), but no email anyone can mail.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  display_name text not null,
  birth_date date,
  grade smallint check (grade between 1 and 12),
  org_id uuid references public.orgs (id),
  created_at timestamptz not null default now(),
  constraint admin_has_org check (role <> 'admin' or org_id is not null),
  constraint student_has_birth_date check (role <> 'student' or birth_date is not null)
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs (id),
  admin_opt_in boolean not null default false,
  -- Short code a student types to sign in (with their PIN). Rotatable.
  join_code text not null unique default upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8)),
  enrolled_at timestamptz not null default now()
);

create table public.family_parents (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  relationship text,
  primary key (family_id, user_id)
);

create table public.family_students (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  primary key (family_id, user_id),
  unique (user_id) -- a student belongs to one family
);

create table public.parental_consents (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users (id),
  family_id uuid not null references public.families (id),
  child_first_name text not null,
  child_birth_date date not null,
  method public.consent_method not null,
  notice_version text not null,
  granted_at timestamptz not null default now(),
  student_id uuid references public.users (id),
  revoked_at timestamptz
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  score smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

-- Deliberately separate. Only the student's own policies touch this table.
create table public.private_notes (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null unique references public.check_ins (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  text text not null check (length(text) <= 2000),
  created_at timestamptz not null default now()
);

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  kind public.quest_kind not null default 'quest',
  due_date date not null,
  teacher text,
  acorns smallint not null default 5 check (acorns between 0 and 500),
  "when" text,
  reward text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.quest_steps (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests (id) on delete cascade,
  "order" smallint not null,
  label text not null,
  minutes smallint not null check (minutes between 1 and 180),
  hint text,
  done_at timestamptz,
  unique (quest_id, "order")
);

create table public.acorns (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  amount smallint not null,
  reason public.acorn_reason not null,
  ref_id uuid,
  at timestamptz not null default now()
);

-- Owned and edited by the student only. Missing row = nothing shared.
create table public.sharing_settings (
  student_id uuid primary key references public.users (id) on delete cascade,
  mood_trend boolean not null default true,
  quests_finished boolean not null default true,
  streak_and_level boolean not null default true,
  upcoming_tests boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.cheers (
  id uuid primary key default gen_random_uuid(),
  from_parent_id uuid not null references public.users (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  org_id uuid not null references public.orgs (id),
  target public.referral_target not null,
  target_label text not null,
  status public.referral_status not null default 'requested',
  "when" text,
  created_at timestamptz not null default now()
);

create table public.help_contacts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  sub text not null,
  tag text not null check (tag in ('Free', 'Paid', 'Referral')),
  draft text not null
);

-- Who did what to whose data. Append-only; written by the functions below.
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  event text not null,
  subject_id uuid,
  data jsonb
);

-- Invite-only admin accounts: an org owner adds an email here first.
create table public.admin_invites (
  email text primary key,
  org_id uuid not null references public.orgs (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index on public.check_ins (student_id, date desc);
create index on public.quests (student_id, due_date);
create index on public.quest_steps (quest_id);
create index on public.acorns (student_id);
create index on public.referrals (org_id, status);
create index on public.audit_log (actor_id, at desc);

-- -------------------------------------------------------- role helpers ---
-- All stable, security definer, with a pinned search_path, so policies can
-- call them without recursing into RLS.
-- Fails closed: an unauthenticated caller, or one with no account row, is refused.
create or replace function public.my_role() returns public.user_role
language plpgsql stable security definer set search_path = '' as $$
declare r public.user_role;
begin
  if auth.uid() is null then raise exception 'ACCESS_DENIED: sign in first'; end if;
  select role into r from public.users where id = auth.uid();
  if r is null then raise exception 'ACCESS_DENIED: no account'; end if;
  return r;
end $$;

create or replace function public.require_user() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'ACCESS_DENIED: sign in first'; end if;
  return u;
end $$;

create or replace function public.is_parent_of(student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_students fs
    join public.family_parents fp on fp.family_id = fs.family_id
    where fs.user_id = student and fp.user_id = auth.uid()
  )
$$;

-- Is `parent` one of the parents in the calling student's family?
create or replace function public.is_parent_in_family_of_student(parent uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_parents fp join public.family_students fs on fs.family_id = fp.family_id
                 where fp.user_id = parent and fs.user_id = auth.uid())
$$;

create or replace function public.is_parent_in_family(fam uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_parents fp where fp.family_id = fam and fp.user_id = auth.uid())
$$;

-- Rule: admins see only families that opted in, in their own org.
create or replace function public.admin_can_see_family(fam uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.families f
    join public.users a on a.id = auth.uid()
    where f.id = fam and a.role = 'admin' and f.org_id = a.org_id and f.admin_opt_in
  )
$$;

create or replace function public.admin_can_see_student(student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_students fs
    where fs.user_id = student and public.admin_can_see_family(fs.family_id)
  )
$$;

create or replace function public.family_of(student uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select family_id from public.family_students where user_id = student
$$;

create or replace function public.sharing_of(student uuid) returns public.sharing_settings
language sql stable security definer set search_path = '' as $$
  select * from public.sharing_settings where student_id = student
$$;

create or replace function public.log_event(ev text, subject uuid, d jsonb default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, event, subject_id, data) values (auth.uid(), ev, subject, d)
$$;

-- ------------------------------------------------------------------ RLS ---
alter table public.orgs enable row level security;
alter table public.users enable row level security;
alter table public.families enable row level security;
alter table public.family_parents enable row level security;
alter table public.family_students enable row level security;
alter table public.parental_consents enable row level security;
alter table public.check_ins enable row level security;
alter table public.private_notes enable row level security;
alter table public.quests enable row level security;
alter table public.quest_steps enable row level security;
alter table public.acorns enable row level security;
alter table public.sharing_settings enable row level security;
alter table public.cheers enable row level security;
alter table public.referrals enable row level security;
alter table public.help_contacts enable row level security;
alter table public.audit_log enable row level security;
alter table public.admin_invites enable row level security;

-- orgs: anyone signed in can read names (shown in copy); nobody writes via API.
create policy orgs_read on public.orgs for select to authenticated using (true);

-- users: self, your family, your opted-in families (admin).
create policy users_self on public.users for select to authenticated
  using (id = auth.uid());
create policy users_family on public.users for select to authenticated
  using (public.is_parent_of(id) or public.is_parent_in_family_of_student(id));
create policy users_admin on public.users for select to authenticated
  using (public.admin_can_see_student(id));
create policy users_update_self on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = public.my_role());

-- families
create policy families_member on public.families for select to authenticated
  using (public.is_parent_in_family(id) or id = public.family_of(auth.uid()));
create policy families_admin on public.families for select to authenticated
  using (public.admin_can_see_family(id));
-- Parents may change opt-in and rotate the join code; nothing else.
create policy families_parent_update on public.families for update to authenticated
  using (public.is_parent_in_family(id)) with check (public.is_parent_in_family(id));

create policy family_parents_member on public.family_parents for select to authenticated
  using (user_id = auth.uid() or family_id = public.family_of(auth.uid()) or public.is_parent_in_family(family_id));
create policy family_students_member on public.family_students for select to authenticated
  using (user_id = auth.uid() or public.is_parent_in_family(family_id) or public.admin_can_see_family(family_id));

-- consents: parents in the family only. Never students, never admins.
create policy consents_parent on public.parental_consents for select to authenticated
  using (public.is_parent_in_family(family_id));

-- check_ins: student reads/writes own; parent and admin get aggregates via
-- functions only (no row-level read), so a per-day score never leaves the DB.
create policy check_ins_self on public.check_ins for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

-- private_notes: THE STUDENT ONLY. No other policy exists, by design.
create policy private_notes_self on public.private_notes for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

-- quests + steps: student owns; parent sees titles only if upcoming_tests is
-- shared (boss) or quests_finished (completion counts via function); admin via functions.
create policy quests_self on public.quests for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy quests_parent_tests on public.quests for select to authenticated
  using (kind = 'boss' and public.is_parent_of(student_id) and (public.sharing_of(student_id)).upcoming_tests);
create policy quest_steps_self on public.quest_steps for all to authenticated
  using (exists (select 1 from public.quests q where q.id = quest_id and q.student_id = auth.uid()))
  with check (exists (select 1 from public.quests q where q.id = quest_id and q.student_id = auth.uid()));

create policy acorns_self on public.acorns for select to authenticated using (student_id = auth.uid());

create policy sharing_self on public.sharing_settings for select to authenticated using (student_id = auth.uid());
create policy sharing_self_update on public.sharing_settings for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy sharing_parent_read on public.sharing_settings for select to authenticated using (public.is_parent_of(student_id));

create policy cheers_student on public.cheers for select to authenticated using (student_id = auth.uid());
create policy cheers_parent on public.cheers for select to authenticated using (from_parent_id = auth.uid());

create policy referrals_family on public.referrals for select to authenticated
  using (public.is_parent_of(student_id) or student_id = auth.uid());
create policy referrals_admin on public.referrals for select to authenticated
  using (public.admin_can_see_family(family_id) and org_id = (select org_id from public.users where id = auth.uid()));

create policy help_contacts_parent on public.help_contacts for select to authenticated
  using (public.is_parent_in_family(family_id));

-- audit_log: a user may read entries about themself; nobody writes directly.
create policy audit_self on public.audit_log for select to authenticated
  using (actor_id = auth.uid() or subject_id = auth.uid());

create policy admin_invites_self on public.admin_invites for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.audit_log, public.acorns, public.referrals, public.cheers,
  public.parental_consents, public.admin_invites, public.orgs, public.family_parents, public.family_students from authenticated;
grant usage on all sequences in schema public to authenticated;

-- ------------------------------------------------------ account creation ---
-- New auth user -> public.users row, from app_metadata the server set
-- (create_student / sign-up metadata). Parents default; admins only via invite.
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  app jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  inv public.admin_invites;
begin
  -- Students are inserted by create_student(), which writes public.users itself.
  if app ->> 'role' = 'student' then return new; end if;

  select * into inv from public.admin_invites where lower(email) = lower(new.email) and accepted_at is null;
  if found then
    insert into public.users (id, role, display_name, org_id) values (new.id, 'admin', inv.display_name, inv.org_id);
    update public.admin_invites set accepted_at = now() where email = inv.email;
    return new;
  end if;

  insert into public.users (id, role, display_name)
  values (new.id, 'parent', coalesce(nullif(meta ->> 'display_name', ''), split_part(coalesce(new.email, 'Parent'), '@', 1)));
  -- A new parent gets a family of their own.
  insert into public.family_parents (family_id, user_id, relationship)
  values (public.insert_family(), new.id, nullif(meta ->> 'relationship', ''));
  return new;
end $$;

create or replace function public.insert_family() returns uuid
language sql security definer set search_path = '' as $$
  insert into public.families default values returning id
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- ---------------------------------------------------------------- COPPA ---
create or replace function public.record_parental_consent(
  p_family_id uuid, p_child_first_name text, p_child_birth_date date,
  p_method public.consent_method, p_notice_version text, p_agreed boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  if public.my_role() <> 'parent' then raise exception 'ACCESS_DENIED: parents only'; end if;
  if not exists (select 1 from public.family_parents where family_id = p_family_id and user_id = auth.uid()) then
    raise exception 'ACCESS_DENIED: not your family';
  end if;
  if not p_agreed then raise exception 'CONSENT_REQUIRED: the parent must agree to the notice'; end if;
  if length(trim(p_child_first_name)) = 0 then raise exception 'INVALID: first name required'; end if;
  insert into public.parental_consents (parent_id, family_id, child_first_name, child_birth_date, method, notice_version)
  values (auth.uid(), p_family_id, trim(p_child_first_name), p_child_birth_date, p_method, p_notice_version)
  returning id into cid;
  perform public.log_event('consent.record', cid, jsonb_build_object('familyId', p_family_id, 'method', p_method));
  return cid;
end $$;

-- The only way a student account comes into existence. Returns the student id.
-- `p_pin` is the child's sign-in PIN (4-6 digits); the family join code is the username.
create or replace function public.create_student(
  p_family_id uuid, p_first_name text, p_last_name text, p_birth_date date,
  p_grade smallint, p_pin text, p_consent_id uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := gen_random_uuid();
  fam public.families;
  c public.parental_consents;
  under13 boolean := p_birth_date > (current_date - interval '13 years');
begin
  if public.my_role() <> 'parent' then raise exception 'ACCESS_DENIED: parents only'; end if;
  select * into fam from public.families f
    where f.id = p_family_id and exists (select 1 from public.family_parents fp where fp.family_id = f.id and fp.user_id = auth.uid());
  if not found then raise exception 'ACCESS_DENIED: not your family'; end if;
  if p_pin !~ '^[0-9]{4,6}$' then raise exception 'INVALID: PIN must be 4-6 digits'; end if;

  if under13 then
    select * into c from public.parental_consents where id = p_consent_id;
    if not found or c.revoked_at is not null or c.student_id is not null or c.family_id <> fam.id
       or c.child_birth_date <> p_birth_date
       or not exists (select 1 from public.family_parents fp where fp.family_id = fam.id and fp.user_id = c.parent_id) then
      raise exception 'CONSENT_REQUIRED: verifiable parental consent is required before creating an account for a child under 13';
    end if;
  end if;

  -- Auth user with a synthetic, undeliverable email: students never get mail.
  -- The auth service expects empty strings, not NULLs, in its token columns.
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change,
                          email_change_token_current, phone_change, phone_change_token, reauthentication_token,
                          is_sso_user, is_anonymous)
  values (sid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          lower(fam.join_code) || '+' || sid::text || '@students.earlysignal.invalid',
          extensions.crypt(p_pin, extensions.gen_salt('bf')), now(),
          jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'student', 'family_id', fam.id),
          jsonb_build_object('display_name', trim(p_first_name)), now(), now(),
          '', '', '', '', '', '', '', '', false, false);
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
  values (gen_random_uuid(), sid, sid::text, 'email',
          jsonb_build_object('sub', sid::text, 'email', lower(fam.join_code) || '+' || sid::text || '@students.earlysignal.invalid', 'email_verified', true),
          now(), now(), now());
  insert into public.users (id, role, display_name, birth_date, grade)
  values (sid, 'student', trim(p_first_name || ' ' || p_last_name), p_birth_date, p_grade);
  insert into public.family_students (family_id, user_id) values (fam.id, sid);
  insert into public.sharing_settings (student_id) values (sid);
  if under13 then update public.parental_consents set student_id = sid where id = c.id; end if;
  perform public.log_event('student.account.create', sid, jsonb_build_object('familyId', fam.id, 'under13', under13, 'consentId', p_consent_id));
  return sid;
end $$;

-- Student sign-in: the app looks up the synthetic email for (join code, student
-- first name) and signs in with the PIN as password. Anyone may call this; it
-- reveals only whether a (code, name) pair exists, which the family already knows.
create or replace function public.student_login_email(p_join_code text, p_first_name text) returns text
language sql stable security definer set search_path = '' as $$
  select au.email from auth.users au
  join public.users u on u.id = au.id
  join public.family_students fs on fs.user_id = u.id
  join public.families f on f.id = fs.family_id
  where upper(f.join_code) = upper(trim(p_join_code))
    and lower(split_part(u.display_name, ' ', 1)) = lower(trim(p_first_name))
    and u.role = 'student'
  limit 1
$$;
grant execute on function public.student_login_email(text, text) to anon, authenticated;

-- --------------------------------------------------------------- writes ---
create or replace function public.submit_check_in(p_score smallint, p_note text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare cid uuid; existed boolean;
begin
  if public.my_role() <> 'student' then raise exception 'ACCESS_DENIED: students only'; end if;
  if p_score not between 1 and 5 then raise exception 'INVALID: score 1-5'; end if;
  select id into cid from public.check_ins where student_id = auth.uid() and date = current_date;
  existed := found;
  if existed then
    update public.check_ins set score = p_score where id = cid;
  else
    insert into public.check_ins (student_id, date, score) values (auth.uid(), current_date, p_score) returning id into cid;
    insert into public.acorns (student_id, amount, reason, ref_id) values (auth.uid(), 5, 'check_in', cid);
  end if;
  delete from public.private_notes where check_in_id = cid;
  if length(trim(coalesce(p_note, ''))) > 0 then
    insert into public.private_notes (check_in_id, student_id, text) values (cid, auth.uid(), trim(p_note));
  end if;
  -- The note's presence is logged; its text never is.
  perform public.log_event('checkin.submit', auth.uid(), jsonb_build_object('score', p_score, 'hasNote', length(trim(coalesce(p_note, ''))) > 0, 'update', existed));
  return cid;
end $$;

create or replace function public.toggle_quest_step(p_step_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare q public.quests; s public.quest_steps; all_done boolean;
begin
  select st.* into s from public.quest_steps st where st.id = p_step_id;
  if not found then raise exception 'ACCESS_DENIED: not your quest'; end if;
  select * into q from public.quests where id = s.quest_id and student_id = auth.uid();
  if not found then raise exception 'ACCESS_DENIED: not your quest'; end if;
  update public.quest_steps set done_at = case when done_at is null then now() end where id = p_step_id;
  select bool_and(done_at is not null) into all_done from public.quest_steps where quest_id = q.id;
  if all_done and q.completed_at is null then
    update public.quests set completed_at = now() where id = q.id;
    insert into public.acorns (student_id, amount, reason, ref_id) values (auth.uid(), q.acorns, 'quest', q.id);
  elsif not all_done and q.completed_at is not null then
    update public.quests set completed_at = null where id = q.id;
    delete from public.acorns where reason = 'quest' and ref_id = q.id;
  end if;
  perform public.log_event('quest.step.toggle', auth.uid(), jsonb_build_object('stepId', p_step_id));
end $$;

create or replace function public.send_cheer(p_student_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  if public.my_role() <> 'parent' or not public.is_parent_of(p_student_id) then raise exception 'ACCESS_DENIED: not this student''s parent'; end if;
  insert into public.cheers (from_parent_id, student_id) values (auth.uid(), p_student_id) returning id into cid;
  perform public.log_event('cheer.send', p_student_id, null);
  return cid;
end $$;

create or replace function public.admin_suggest_coach(p_student_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid; fam uuid; org uuid;
begin
  if public.my_role() <> 'admin' or not public.admin_can_see_student(p_student_id) then raise exception 'ACCESS_DENIED: family has not opted in'; end if;
  fam := public.family_of(p_student_id);
  select org_id into org from public.users where id = auth.uid();
  insert into public.referrals (family_id, student_id, org_id, target, target_label)
  values (fam, p_student_id, org, 'ef_coach', 'EF coach') returning id into rid;
  perform public.log_event('referral.suggest_coach', p_student_id, jsonb_build_object('referralId', rid));
  return rid;
end $$;

create or replace function public.set_family_admin_opt_in(p_family_id uuid, p_opt_in boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.family_parents where family_id = p_family_id and user_id = auth.uid()) then
    raise exception 'ACCESS_DENIED: not your family';
  end if;
  update public.families set admin_opt_in = p_opt_in where id = p_family_id;
  perform public.log_event('family.admin_opt_in', p_family_id, jsonb_build_object('optIn', p_opt_in));
end $$;

-- COPPA: a parent can withdraw consent. The student account is disabled and
-- its data deleted (cascade from public.users; auth row removed too).
create or replace function public.revoke_consent_and_delete_student(p_student_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.my_role() <> 'parent' or not public.is_parent_of(p_student_id) then raise exception 'ACCESS_DENIED: not this student''s parent'; end if;
  update public.parental_consents set revoked_at = now(), student_id = null where student_id = p_student_id;
  perform public.log_event('student.account.delete', p_student_id, null);
  delete from public.users where id = p_student_id;
  delete from auth.users where id = p_student_id;
end $$;

-- --------------------------------------------------------- projections ---
-- Parent weekly summary. Returns only shared fields; per-day scores never
-- appear (weekly averages only). Mirrors src/domain/parent.ts.
create or replace function public.parent_weekly_summary(p_student_id uuid, p_today date default current_date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  sh public.sharing_settings; out jsonb; mon date; fri date; w jsonb; cur numeric; base numeric; run int := 0;
begin
  perform public.require_user();
  if not (public.is_parent_of(p_student_id) or auth.uid() = p_student_id) then raise exception 'ACCESS_DENIED'; end if;
  sh := public.sharing_of(p_student_id);
  mon := p_today - ((extract(isodow from p_today)::int) - 1);
  fri := mon + 4;
  out := jsonb_build_object('studentId', p_student_id,
    'studentName', (select split_part(display_name, ' ', 1) from public.users where id = p_student_id),
    'weekStart', mon, 'weekEnd', fri,
    'hidden', (select coalesce(jsonb_agg(k), '[]'::jsonb) from (values ('moodTrend', coalesce(sh.mood_trend, false)), ('questsFinished', coalesce(sh.quests_finished, false)),
                ('streakAndLevel', coalesce(sh.streak_and_level, false)), ('upcomingTests', coalesce(sh.upcoming_tests, false))) v(k, on_) where not on_));

  if coalesce(sh.mood_trend, false) then
    out := out || jsonb_build_object(
      'checkIns', jsonb_build_object('done', (select count(distinct date) from public.check_ins where student_id = p_student_id and date between mon and fri),
                                     'of', least(5, greatest(1, (p_today - mon) + 1))),
      'moodWeeks', (select jsonb_agg(jsonb_build_object('weekStart', ws, 'avg', (select round(avg(score)::numeric, 1) from public.check_ins where student_id = p_student_id and date between ws and ws + 6), 'current', ws = mon) order by ws)
                    from generate_series(mon - 28, mon, '7 days'::interval) g0(ws0), lateral (select ws0::date as ws) g));
    -- Consecutive heavy weeks (avg >= 3.5), counted back from the current week.
    run := 0;
    for w in select jsonb_build_object('ws', ws) from generate_series(mon, mon - 28, '-7 days'::interval) g0(ws0), lateral (select ws0::date as ws) g loop
      cur := (select avg(score) from public.check_ins where student_id = p_student_id and date between (w ->> 'ws')::date and (w ->> 'ws')::date + 6);
      exit when cur is null or cur < 3.5;
      run := run + 1;
    end loop;
    cur := (select avg(score) from public.check_ins where student_id = p_student_id and date between mon and mon + 6);
    base := (select avg(score) from public.check_ins where student_id = p_student_id and date between mon - 28 and mon - 1);
    if run >= 3 then
      out := out || jsonb_build_object('watch', format('School has felt heavy for %s weeks in a row. Worth a calm check-in, or a word with someone who can help.', run), 'heavier', true);
    elsif cur is not null and base is not null and cur - base >= 0.5 then
      out := out || jsonb_build_object('watch', 'School felt heavier than usual this week. Not a pattern yet.', 'heavier', true);
    end if;
  end if;

  if coalesce(sh.quests_finished, false) then
    out := out || jsonb_build_object('questsFinished', (select count(*) from public.quests where student_id = p_student_id and completed_at::date between mon and mon + 6),
      'questsEarly', (select count(*) from public.quests where student_id = p_student_id and completed_at::date between mon and mon + 6 and completed_at::date < due_date));
  end if;

  if coalesce(sh.streak_and_level, false) then
    out := out || jsonb_build_object('streak', public.current_streak(p_student_id, p_today),
      'acorns', (select coalesce(sum(amount), 0) from public.acorns where student_id = p_student_id));
  end if;

  if coalesce(sh.upcoming_tests, false) then
    out := out || jsonb_build_object('upcomingTests', (select coalesce(jsonb_agg(jsonb_build_object('title', title, 'dueDate', due_date) order by due_date), '[]'::jsonb)
      from public.quests where student_id = p_student_id and kind = 'boss' and completed_at is null and due_date between p_today and p_today + 14));
  end if;
  perform public.log_event('parent.summary.view', p_student_id, null);
  return out;
end $$;

create or replace function public.current_streak(p_student_id uuid, p_today date default current_date) returns int
language plpgsql stable security definer set search_path = '' as $$
declare d date; n int := 0;
begin
  perform public.require_user();
  if not (auth.uid() = p_student_id or public.is_parent_of(p_student_id) or public.admin_can_see_student(p_student_id)) then raise exception 'ACCESS_DENIED'; end if;
  d := case when exists (select 1 from public.check_ins where student_id = p_student_id and date = p_today) then p_today else p_today - 1 end;
  while exists (select 1 from public.check_ins where student_id = p_student_id and date = d) loop
    n := n + 1; d := d - 1;
  end loop;
  return n;
end $$;

-- Admin: one row per visible student with a derived pattern. Conclusions only.
create or replace function public.admin_family_rows(p_today date default current_date)
returns table (student_id uuid, family_id uuid, name text, grade smallint, pattern text, status text, flag boolean, action text, shares text[], coach_suggested boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if public.my_role() <> 'admin' then raise exception 'ACCESS_DENIED: admins only'; end if;
  perform public.log_event('admin.dashboard.view', (select org_id from public.users where id = auth.uid()), null);
  return query
  with vis as (
    select fs.user_id as sid, fs.family_id as fid from public.family_students fs where public.admin_can_see_family(fs.family_id)
  ), base as (
    select v.sid, v.fid, u.display_name, u.grade, public.sharing_of(v.sid) as sh,
      (select max(date) from public.check_ins c where c.student_id = v.sid) as last_ci,
      (select count(*) from public.check_ins c where c.student_id = v.sid and c.date > p_today - 21) as recent_n,
      (select count(*) from public.check_ins c where c.student_id = v.sid and c.date > p_today - 21 and c.score >= 4) as recent_heavy,
      (select avg(score) from public.check_ins c where c.student_id = v.sid and c.date >= p_today - 28 and c.date < p_today - 14) as avg_before,
      (select avg(score) from public.check_ins c where c.student_id = v.sid and c.date >= p_today - 14 and c.date < p_today) as avg_after,
      exists (select 1 from public.referrals r where r.student_id = v.sid and r.target = 'ef_coach' and r.status = 'booked') as has_coach,
      exists (select 1 from public.referrals r where r.student_id = v.sid and r.target = 'ef_coach' and r.status <> 'closed') as coach_any,
      (select count(*) from public.quests q where q.student_id = v.sid and q.kind = 'boss' and q.due_date < p_today and q.due_date >= p_today - 42) as past_boss,
      (select count(*) from public.quests q where q.student_id = v.sid and q.kind = 'boss' and q.due_date < p_today and q.due_date >= p_today - 42
         and exists (select 1 from public.quest_steps s where s.quest_id = q.id and (s.done_at is null or s.done_at::date > q.due_date))) as missed_boss,
      public.current_streak(v.sid, p_today) as streak
    from vis v join public.users u on u.id = v.sid
  ), patt as (
    select b.*,
      case
        when b.sh is null or not ((b.sh).mood_trend or (b.sh).quests_finished or (b.sh).streak_and_level or (b.sh).upcoming_tests) then 'Shares no signals'
        when (b.sh).mood_trend and b.last_ci is not null and p_today - b.last_ci >= 7 then format('Check-ins stopped %s days ago', p_today - b.last_ci)
        when (b.sh).mood_trend and b.recent_n >= 8 and b.recent_heavy::numeric / b.recent_n >= 0.6 then 'Stress 4+ on most days for 3 weeks'
        when (b.sh).upcoming_tests and (b.sh).quests_finished and b.past_boss >= 2 and b.missed_boss = b.past_boss then 'Missed quest steps before every test'
        when (b.sh).mood_trend and b.has_coach and b.avg_before is not null and b.avg_after is not null and b.avg_before - b.avg_after >= 0.5 then 'Stress easing since coach started'
        when (b.sh).streak_and_level and b.streak >= 3 then format('Steady; %s-day streak', b.streak)
        else 'Steady' end as pattern
    from base b
  ), classed as (
    select p.*,
      case when p.pattern = 'Shares no signals' then 'Private'
           when p.pattern like 'Check-ins stopped%' or p.pattern like 'Stress 4+%' or p.pattern like 'Missed quest%' then 'Needs follow-up'
           when p.pattern like 'Stress easing%' then 'Improving' else 'On track' end as status,
      case when p.pattern like 'Missed quest%' then 'Suggest coach'
           when p.pattern like 'Check-ins stopped%' or p.pattern like 'Stress 4+%' then 'Reach out' else 'View' end as action
    from patt p
  )
  select c.sid, c.fid,
    left(split_part(c.display_name, ' ', 1), 1) || '. ' || substr(c.display_name, position(' ' in c.display_name) + 1),
    c.grade, c.pattern, c.status, c.status = 'Needs follow-up', c.action,
    array_remove(array[case when (c.sh).mood_trend then 'mood trend' end, case when (c.sh).quests_finished then 'quests finished' end,
                       case when (c.sh).streak_and_level then 'streak and level' end, case when (c.sh).upcoming_tests then 'upcoming tests' end], null),
    c.coach_any
  from classed c
  order by case c.status when 'Needs follow-up' then 0 when 'Improving' then 1 when 'On track' then 2 else 3 end, c.display_name;
end $$;

-- Admin self-starter rate per week: % of visible, mood-sharing students with 3+ check-ins.
create or replace function public.admin_self_starters(p_today date default current_date)
returns table (week_start date, pct int)
language sql stable security definer set search_path = '' as $$
  with mon as (select p_today - (extract(isodow from p_today)::int - 1) as m),
  sharers as (select fs.user_id as sid from public.family_students fs where public.admin_can_see_family(fs.family_id) and (public.sharing_of(fs.user_id)).mood_trend),
  weeks as (select (select m from mon) - 7 * g as ws from generate_series(6, 1, -1) g)
  select w.ws, case when (select count(*) from sharers) = 0 then 0 else
    round(100.0 * (select count(*) from sharers s where (select count(distinct date) from public.check_ins c where c.student_id = s.sid and c.date between w.ws and w.ws + 6) >= 3)
          / (select count(*) from sharers))::int end
  from weeks w where public.my_role() = 'admin' order by w.ws
$$;

-- ---------------------------------------------------------- API surface ---
-- `create or replace function` resets EXECUTE to PUBLIC, so this block must
-- come last and be re-run after any function change. Anonymous callers get
-- exactly one function: the student sign-in lookup.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
-- RLS policies run as the caller and use the yes/no helpers, so those stay
-- executable by signed-in users. These three never are:
revoke execute on function public.log_event(text, uuid, jsonb) from authenticated;
revoke execute on function public.insert_family() from authenticated;
revoke execute on function public.handle_new_auth_user() from authenticated;
grant execute on function public.student_login_email(text, text) to anon;
