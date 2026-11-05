-- One partner org and an invited admin. Change the email before running.
-- The invited person signs in with that email (one-time code) and becomes
-- the admin automatically; a parent who enrolls through this school links
-- their family to it from the Account tab.
insert into public.orgs (id, name, kind)
values ('00000000-0000-4000-8000-000000000001', 'Lincoln Middle School', 'school')
on conflict (id) do nothing;

insert into public.admin_invites (email, org_id, display_name)
values ('counselor@example.edu', '00000000-0000-4000-8000-000000000001', 'Ms. Patel')
on conflict (email) do nothing;
