-- ============================================================================
-- Hope's Corner — Jobs / Signups / Admin schema
-- Run this in Supabase → SQL Editor (paste the whole file, click Run).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE throughout.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helper: is the current user an admin?  Used by RLS policies below.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  );
$$;

-- Board members can toggle self-report capability for others.
alter table public.admins
  add column if not exists is_board boolean not null default false;

create or replace function public.is_board()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a where a.user_id = auth.uid() and a.is_board = true
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. JOBS  (a volunteer opportunity; shifts belong to a job)
-- ---------------------------------------------------------------------------
create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  visible       boolean not null default true,        -- volunteer visibility toggle
  password      text,                                  -- null = open; set = password-protected
  min_age       integer not null default 16,           -- per-job age limit
  self_report   boolean not null default false,        -- private job: volunteers self-report hours
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. SHIFTS  (extend existing table — link to a job, add capacity + password)
-- ---------------------------------------------------------------------------
alter table public.shifts
  add column if not exists job_id     uuid references public.jobs(id) on delete cascade,
  add column if not exists capacity   integer,         -- total volunteers needed
  add column if not exists password   text,            -- optional per-shift password
  add column if not exists updated_at timestamptz default now();  -- an existing trigger expects this


-- ---------------------------------------------------------------------------
-- 3. SIGNUPS  (one row per person per shift; replaces the string array)
-- ---------------------------------------------------------------------------
create table if not exists public.signups (
  id             uuid primary key default gen_random_uuid(),
  shift_id       uuid references public.shifts(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete set null,  -- null when admin adds a walk-in
  manual_name    text,                                 -- name when there is no account
  status         text not null default 'signed_up',    -- signed_up | cancelled | no_show | attended
  hours_reported numeric,                              -- self- or admin-reported hours
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists signups_shift_idx on public.signups(shift_id);
create index if not exists signups_user_idx  on public.signups(user_id);

-- ---------------------------------------------------------------------------
-- 4. BLACKLIST  (temporary or permanent ban)
-- ---------------------------------------------------------------------------
create table if not exists public.blacklist (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  email      text,
  name       text,
  reason     text,
  until      date,                                      -- null = permanent
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. GROUPS  (organization list admins manage; volunteers pick or add their own)
-- ---------------------------------------------------------------------------
create table if not exists public.groups (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);
insert into public.groups (name) values
  ('Hope''s Corner'), ('Local Church'), ('Community Group')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- 6. USER_INFO  (extra columns)
-- ---------------------------------------------------------------------------
alter table public.user_info
  add column if not exists can_self_report      boolean not null default false,
  add column if not exists first_volunteered_at timestamptz;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
alter table public.jobs      enable row level security;
alter table public.signups   enable row level security;
alter table public.blacklist enable row level security;
alter table public.groups    enable row level security;

-- JOBS: everyone signed-in can read visible jobs; admins read all + write.
drop policy if exists jobs_read      on public.jobs;
drop policy if exists jobs_admin_all on public.jobs;
create policy jobs_read on public.jobs
  for select to authenticated
  using (visible = true or public.is_admin());
create policy jobs_admin_all on public.jobs
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- SIGNUPS: a volunteer sees/creates/edits their own; admins see/do everything.
drop policy if exists signups_own_read   on public.signups;
drop policy if exists signups_own_write  on public.signups;
drop policy if exists signups_own_update on public.signups;
drop policy if exists signups_admin_all  on public.signups;
create policy signups_own_read on public.signups
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy signups_own_write on public.signups
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());
create policy signups_own_update on public.signups
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy signups_admin_all on public.signups
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- BLACKLIST: admin only.
drop policy if exists blacklist_admin on public.blacklist;
create policy blacklist_admin on public.blacklist
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- GROUPS: anyone signed-in reads; admins manage.
drop policy if exists groups_read      on public.groups;
drop policy if exists groups_admin_all on public.groups;
create policy groups_read on public.groups
  for select to authenticated using (true);
create policy groups_admin_all on public.groups
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- OPTIONAL: migrate existing shifts into a "Legacy" job so nothing is orphaned.
-- ============================================================================
do $$
declare legacy_id uuid;
begin
  if exists (select 1 from public.shifts where job_id is null) then
    insert into public.jobs (name, description)
    values ('Uncategorized', 'Shifts created before jobs existed')
    returning id into legacy_id;
    update public.shifts set job_id = legacy_id where job_id is null;
  end if;
end $$;
