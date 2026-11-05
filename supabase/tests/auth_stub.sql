-- Minimal stand-in for Supabase's auth schema, so the real migration and the
-- RLS tests can run against a plain Postgres. Never applied to a real project.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists extensions;
create extension if not exists pgcrypto schema extensions;

create schema auth;
create table auth.users (
  id uuid primary key,
  instance_id uuid,
  aud text,
  role text,
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  confirmation_token text, recovery_token text, email_change_token_new text, email_change text,
  email_change_token_current text, phone_change text, phone_change_token text, reauthentication_token text,
  is_sso_user boolean default false, is_anonymous boolean default false
);
create table auth.identities (
  id uuid primary key, user_id uuid references auth.users (id) on delete cascade, provider_id text, provider text,
  identity_data jsonb, created_at timestamptz, updated_at timestamptz, last_sign_in_at timestamptz
);

-- Supabase reads the request's JWT from the `request.jwt.claims` setting.
create or replace function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

grant usage on schema auth to anon, authenticated;
grant usage on schema extensions to anon, authenticated;
