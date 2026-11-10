-- Rooted v2, part 2: the pilot features. Second move ("wrong moment" outcome), smart-timing
-- nudges (web push), the in-app experiment (impressions + arms), the founding-family
-- offer, and a prompt-stats view. Everything stays per-parent under RLS.

-- Nudge settings and pilot mode live on the parent.
alter table public.parents
  add column if not exists nudge_enabled boolean not null default false,
  add column if not exists nudge_hour smallint not null default 17 check (nudge_hour between 0 and 23),
  add column if not exists tz text not null default 'America/New_York',
  add column if not exists pilot_mode boolean not null default true,
  add column if not exists last_nudged_on date;

-- Web push subscriptions (one row per browser/device).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid() references public.parents (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_parent on public.push_subscriptions (parent_id);

-- The experiment: which starter was shown, in which arm, and whether it was asked.
create table if not exists public.impressions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid() references public.parents (id) on delete cascade,
  kid_id uuid not null references public.kids (id) on delete cascade,
  prompt_id text not null,
  arm text not null check (arm in ('event', 'generic')),
  event_id uuid references public.events (id) on delete set null,
  shown_on date not null default current_date,
  asked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (parent_id, kid_id, shown_on, prompt_id)
);
create index if not exists impressions_parent on public.impressions (parent_id, shown_on desc);
alter table public.talks add column if not exists arm text check (arm in ('event', 'generic'));
alter table public.talks add column if not exists follow_up_used boolean not null default false;

-- Founding-family pilot interest (a real offer, counted against everyone shown it).
create table if not exists public.pilot_interest (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid() references public.parents (id) on delete cascade,
  note text check (length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (parent_id)
);

-- Per-prompt feedback the parent can see for their own family. The team runs the
-- same query with the service role in the dashboard for the whole pilot.
create or replace view public.prompt_stats with (security_invoker = true) as
  select t.prompt_id,
         t.arm,
         count(*)::int as asked,
         count(*) filter (where t.outcome in ('good_talk', 'really_talked'))::int as landed,
         count(*) filter (where t.outcome = 'not_tonight')::int as not_tonight,
         count(*) filter (where t.outcome = 'wrong_moment')::int as wrong_moment,
         round(avg(t.rating), 1) as avg_rating
  from public.talks t
  group by t.prompt_id, t.arm;

grant select, insert, update, delete on public.push_subscriptions, public.impressions, public.pilot_interest to authenticated;
grant select on public.prompt_stats to authenticated;
grant select on public.push_subscriptions, public.impressions, public.pilot_interest to anon;

alter table public.push_subscriptions enable row level security;
alter table public.impressions enable row level security;
alter table public.pilot_interest enable row level security;

create policy push_own on public.push_subscriptions for all to authenticated
  using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));
create policy impressions_own on public.impressions for all to authenticated
  using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()) and public.owns_kid(kid_id));
create policy pilot_interest_own on public.pilot_interest for all to authenticated
  using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));

-- What the nudge sender needs, for parents whose local hour is `p_hour` right now and
-- who haven't been nudged today. Service role only (the edge function).
create or replace function public.nudge_targets() returns table (
  parent_id uuid, display_name text, kid_name text, event_title text, event_kind public.event_kind, event_date date,
  endpoint text, p256dh text, auth text
)
language sql security definer set search_path = '' as $$
  with due as (
    select p.id, p.display_name, (now() at time zone p.tz)::date as local_today
    from public.parents p
    where p.nudge_enabled
      and extract(hour from (now() at time zone p.tz))::int = p.nudge_hour
      and (p.last_nudged_on is null or p.last_nudged_on < (now() at time zone p.tz)::date)
  ),
  kid as (
    select distinct on (d.id) d.id as parent_id, k.id as kid_id, k.name
    from due d join public.kids k on k.parent_id = d.id
    order by d.id, k.created_at
  ),
  ev as (
    select distinct on (kid.parent_id) kid.parent_id, e.title, e.kind, e.date
    from kid join due d on d.id = kid.parent_id
    join public.events e on e.kid_id = kid.kid_id and e.date between d.local_today - 3 and d.local_today + 3
    order by kid.parent_id, abs(e.date - d.local_today), e.date
  )
  select d.id, d.display_name, kid.name, ev.title, ev.kind, ev.date, s.endpoint, s.p256dh, s.auth
  from due d
  join kid on kid.parent_id = d.id
  left join ev on ev.parent_id = d.id
  join public.push_subscriptions s on s.parent_id = d.id
$$;
revoke execute on function public.nudge_targets() from public, anon, authenticated;

create or replace function public.mark_nudged(p_parent_ids uuid[]) returns void
language sql security definer set search_path = '' as $$
  update public.parents p set last_nudged_on = (now() at time zone p.tz)::date where p.id = any (p_parent_ids)
$$;
revoke execute on function public.mark_nudged(uuid[]) from public, anon, authenticated;

create or replace function public.drop_push_subscriptions(p_endpoints text[]) returns void
language sql security definer set search_path = '' as $$
  delete from public.push_subscriptions where endpoint = any (p_endpoints)
$$;
revoke execute on function public.drop_push_subscriptions(text[]) from public, anon, authenticated;

-- The nudge sender reads its keys through this function (PostgREST does not expose
-- the vault schema). Service role only; on a plain Postgres without Vault it returns nothing.
create or replace function public.nudge_secrets() returns table (name text, value text)
language plpgsql security definer set search_path = '' as $$
begin
  if to_regclass('vault.decrypted_secrets') is null then return; end if;
  return query execute 'select name::text, decrypted_secret::text from vault.decrypted_secrets where name in (''vapid_public'', ''vapid_private'', ''cron_secret'')';
end $$;
revoke execute on function public.nudge_secrets() from public, anon, authenticated;

-- The sender runs as the service role.
grant execute on function public.nudge_secrets() to service_role;
grant execute on function public.nudge_targets() to service_role;
grant execute on function public.mark_nudged(uuid[]) to service_role;
grant execute on function public.drop_push_subscriptions(text[]) to service_role;
