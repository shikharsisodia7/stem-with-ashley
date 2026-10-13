-- Admin dashboard (CMS) storage for STEM with Ashley.
-- Holds ONLY private admin state: unpublished drafts, the publication log, and an
-- audit trail. Published content itself lives in the GitHub repo (and therefore on
-- the static public site), so the public apps never depend on this database.
--
-- Access model: every table has RLS on. A signed-in user may touch these tables only
-- when their Supabase `app_metadata.cms_role` is 'admin' or 'editor'. app_metadata
-- can only be written with the service-role key (never by the user), so a public
-- sign-up can never grant itself access.

create or replace function public.cms_role() returns text
language sql stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'cms_role', '')
$$;

create or replace function public.cms_is_editor() returns boolean
language sql stable
set search_path = ''
as $$
  select public.cms_role() in ('admin', 'editor')
$$;

-- One shared working copy per content document ("roadmap", "jobs", "interview").
create table if not exists public.cms_drafts (
  doc text primary key check (doc in ('roadmap', 'jobs', 'interview')),
  content jsonb not null,
  base_sha text not null,             -- git blob sha of the live file this draft started from
  updated_by text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_publications (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('publish', 'restore')),
  commit_sha text not null,
  docs text[] not null default '{}',
  summary jsonb not null default '{}'::jsonb,
  restored_from text,
  published_by text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.cms_audit (
  id bigint generated always as identity primary key,
  action text not null,
  ok boolean not null default true,
  details jsonb not null default '{}'::jsonb,
  actor text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists cms_audit_created_idx on public.cms_audit (created_at desc);
create index if not exists cms_publications_created_idx on public.cms_publications (created_at desc);

-- The acting user's email is stamped server-side from the verified JWT, so a client
-- can't record an action under someone else's name.
create or replace function public.cms_stamp_actor() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  jwt_email text := auth.jwt() ->> 'email';
begin
  if jwt_email is not null then
    if tg_table_name = 'cms_drafts' then
      new.updated_by := jwt_email;
      new.updated_at := now();
    elsif tg_table_name = 'cms_publications' then
      new.published_by := jwt_email;
    else
      new.actor := jwt_email;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists cms_drafts_stamp on public.cms_drafts;
create trigger cms_drafts_stamp before insert or update on public.cms_drafts
  for each row execute function public.cms_stamp_actor();
drop trigger if exists cms_publications_stamp on public.cms_publications;
create trigger cms_publications_stamp before insert on public.cms_publications
  for each row execute function public.cms_stamp_actor();
drop trigger if exists cms_audit_stamp on public.cms_audit;
create trigger cms_audit_stamp before insert on public.cms_audit
  for each row execute function public.cms_stamp_actor();

alter table public.cms_drafts enable row level security;
alter table public.cms_publications enable row level security;
alter table public.cms_audit enable row level security;

-- Drafts: full read/write for editors.
drop policy if exists cms_drafts_editor_all on public.cms_drafts;
create policy cms_drafts_editor_all on public.cms_drafts
  for all to authenticated
  using ((select public.cms_is_editor()))
  with check ((select public.cms_is_editor()));

-- Publication log + audit trail: append-only for editors (no update/delete policy).
drop policy if exists cms_publications_editor_read on public.cms_publications;
create policy cms_publications_editor_read on public.cms_publications
  for select to authenticated using ((select public.cms_is_editor()));
drop policy if exists cms_publications_editor_insert on public.cms_publications;
create policy cms_publications_editor_insert on public.cms_publications
  for insert to authenticated with check ((select public.cms_is_editor()));

drop policy if exists cms_audit_editor_read on public.cms_audit;
create policy cms_audit_editor_read on public.cms_audit
  for select to authenticated using ((select public.cms_is_editor()));
drop policy if exists cms_audit_editor_insert on public.cms_audit;
create policy cms_audit_editor_insert on public.cms_audit
  for insert to authenticated with check ((select public.cms_is_editor()));

revoke all on public.cms_drafts, public.cms_publications, public.cms_audit from anon;
grant select, insert, update, delete on public.cms_drafts to authenticated;
grant select, insert on public.cms_publications, public.cms_audit to authenticated;

-- Keep-alive: the daily Vercel cron calls this so the free-tier project is never
-- paused for inactivity (a paused project would block Ashley from signing in).
create or replace function public.cms_ping() returns integer
language sql stable
set search_path = ''
as $$ select 1 $$;
grant execute on function public.cms_ping() to anon, authenticated;
