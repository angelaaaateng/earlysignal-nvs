-- Rooted schema. Parent-only: every row belongs to one auth user (the parent).
-- There are no child accounts. Notes never reach the database (device-only).
-- Applied to the hosted project by the CLI or dashboard, and to a plain
-- Postgres by the rule tests (which stub the `auth` schema first).

create extension if not exists pgcrypto with schema extensions;

create type public.event_kind as enum ('test', 'tryout', 'game', 'performance', 'project', 'presentation', 'social', 'trip', 'other');
create type public.talk_outcome as enum ('not_tonight', 'few_words', 'good_talk', 'really_talked');
create type public.talk_moment as enum ('car', 'dinner', 'bedtime', 'walk', 'other');

-- ---------------------------------------------------------------- tables ---
create table public.parents (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.kids (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid() references public.parents (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  grade smallint not null check (grade between 1 and 12),
  interests text[] not null default '{}',
  activities text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid() references public.parents (id) on delete cascade,
  kid_id uuid not null references public.kids (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 80),
  kind public.event_kind not null default 'other',
  date date not null,
  created_at timestamptz not null default now()
);

create table public.talks (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid() references public.parents (id) on delete cascade,
  kid_id uuid not null references public.kids (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  prompt_id text not null,
  question text not null check (length(question) <= 200),
  moment public.talk_moment,
  outcome public.talk_outcome not null,
  rating smallint not null check (rating between 1 and 10),
  asked_at timestamptz not null default now()
);

create table public.week_reviews (
  parent_id uuid not null default auth.uid() references public.parents (id) on delete cascade,
  week_start date not null,
  reviewed_at timestamptz not null default now(),
  primary key (parent_id, week_start)
);

-- Who did what. Append-only; written by functions and triggers.
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  event text not null,
  data jsonb
);

create index on public.kids (parent_id);
create index on public.events (parent_id, date);
create index on public.events (kid_id);
create index on public.talks (parent_id, asked_at desc);
create index on public.talks (kid_id);
create index on public.talks (prompt_id);
create index on public.audit_log (actor_id, at desc);

-- -------------------------------------------------------------- helpers ---
create or replace function public.log_event(ev text, d jsonb default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, event, data) values (auth.uid(), ev, d)
$$;

-- The kid must be the caller's. Used by policies on events and talks.
create or replace function public.owns_kid(kid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kids k where k.id = kid and k.parent_id = auth.uid())
$$;

-- ------------------------------------------------------------------ RLS ---
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
-- anon gets the table grants Supabase gives by default; RLS has no anon policies, so it sees nothing.
grant select on all tables in schema public to anon;
revoke all on public.audit_log from authenticated;
grant select on public.audit_log to authenticated;
grant usage on all sequences in schema public to authenticated;

alter table public.parents enable row level security;
alter table public.kids enable row level security;
alter table public.events enable row level security;
alter table public.talks enable row level security;
alter table public.week_reviews enable row level security;
alter table public.audit_log enable row level security;

create policy parents_self on public.parents for select to authenticated using (id = (select auth.uid()));
create policy parents_self_update on public.parents for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy kids_own on public.kids for all to authenticated
  using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));
create policy events_own on public.events for all to authenticated
  using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()) and public.owns_kid(kid_id));
create policy talks_own on public.talks for all to authenticated
  using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()) and public.owns_kid(kid_id));
create policy week_reviews_own on public.week_reviews for all to authenticated
  using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));
create policy audit_self on public.audit_log for select to authenticated using (actor_id = (select auth.uid()));

-- ------------------------------------------------------------ accounts ---
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.parents (id, display_name)
  values (new.id, coalesce(nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''), split_part(coalesce(new.email, 'Parent'), '@', 1)));
  insert into public.audit_log (actor_id, event) values (new.id, 'account.create');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Anyone can delete their own account. Cascades through parents -> kids -> events/talks.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'ACCESS_DENIED: not signed in'; end if;
  perform public.log_event('account.delete', null);
  delete from auth.users where id = auth.uid();
end $$;

-- Audit a talk as it lands (the app also logs client-side, redacted).
create or replace function public.audit_talk() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (actor_id, event, data) values (new.parent_id, 'talk.log', jsonb_build_object('outcome', new.outcome, 'promptId', new.prompt_id, 'hasEvent', new.event_id is not null));
  return new;
end $$;
create trigger on_talk_logged after insert on public.talks for each row execute procedure public.audit_talk();

-- ---------------------------------------------------------- API surface ---
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.log_event(text, jsonb) from authenticated;
revoke execute on function public.handle_new_auth_user() from authenticated;
revoke execute on function public.audit_talk() from authenticated;
