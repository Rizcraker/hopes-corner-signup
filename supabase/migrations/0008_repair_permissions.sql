-- ============================================================================
-- Hope's Corner — permissions repair + schema fixes
-- Run in Supabase → SQL Editor. Safe to re-run (idempotent).
--
-- Why: tables were rebuilt, and recreating a table silently drops ALL of its
-- RLS policies and role grants. This file re-establishes every grant + policy
-- in one place, and fixes two schema issues found in the dump:
--   * foreign keys missing ON DELETE CASCADE (job/shift deletes would fail)
--   * user_info.hours_volunteered was bigint (rounded away half-hours)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helper functions (recreate to be safe)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 1. Schema fixes
-- ---------------------------------------------------------------------------
-- Fractional hours (2.5) must not round: bigint -> numeric.
alter table public.user_info
  alter column hours_volunteered type numeric using hours_volunteered::numeric;

-- Deleting a job should remove its shifts; deleting a shift its signups.
alter table public.shifts  drop constraint if exists shifts_job_id_fkey;
alter table public.shifts  add  constraint shifts_job_id_fkey
  foreign key (job_id) references public.jobs(id) on delete cascade;

alter table public.signups drop constraint if exists signups_shift_id_fkey;
alter table public.signups add  constraint signups_shift_id_fkey
  foreign key (shift_id) references public.shifts(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 2. Grants (table-level access; RLS below decides WHICH rows)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.jobs         to authenticated;
grant select, insert, update, delete on public.shifts       to authenticated;
grant select, insert, update, delete on public.signups      to authenticated;
grant select, insert, update         on public.user_info    to authenticated;
grant update                          on public.user_info    to authenticated;
grant select, insert, delete         on public.admins       to authenticated;
grant select, insert, update, delete on public.blacklist    to authenticated;
grant select, insert, update, delete on public.groups       to authenticated;
grant select, insert, update, delete on public.hour_entries to authenticated;
grant select on public.groups to anon;   -- signup form reads orgs pre-auth

-- ---------------------------------------------------------------------------
-- 3. RLS policies (drop + recreate every one so state is known-good)
-- ---------------------------------------------------------------------------
alter table public.jobs         enable row level security;
alter table public.shifts       enable row level security;
alter table public.signups      enable row level security;
alter table public.user_info    enable row level security;
alter table public.admins       enable row level security;
alter table public.blacklist    enable row level security;
alter table public.groups       enable row level security;
alter table public.hour_entries enable row level security;

-- JOBS: signed-in users see visible jobs; admins see and manage all.
drop policy if exists jobs_read      on public.jobs;
drop policy if exists jobs_admin_all on public.jobs;
create policy jobs_read on public.jobs
  for select to authenticated
  using (visible = true or public.is_admin());
create policy jobs_admin_all on public.jobs
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- SHIFTS: signed-in users read all rows (app hides shifts whose job is hidden);
-- volunteers may update spots_left when claiming; admins manage rows.
drop policy if exists shifts_read         on public.shifts;
drop policy if exists shifts_update       on public.shifts;
drop policy if exists shifts_admin_insert on public.shifts;
drop policy if exists shifts_admin_delete on public.shifts;
create policy shifts_read on public.shifts
  for select to authenticated using (true);
create policy shifts_update on public.shifts
  for update to authenticated using (true) with check (true);
create policy shifts_admin_insert on public.shifts
  for insert to authenticated with check (public.is_admin());
create policy shifts_admin_delete on public.shifts
  for delete to authenticated using (public.is_admin());

-- SIGNUPS: own rows, or everything for admins.
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

-- USER_INFO: read own row or all if admin; create/update own row; admins update anyone.
drop policy if exists user_info_read         on public.user_info;
drop policy if exists user_info_own_insert   on public.user_info;
drop policy if exists user_info_own_update   on public.user_info;
drop policy if exists user_info_admin_update on public.user_info;
create policy user_info_read on public.user_info
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy user_info_own_insert on public.user_info
  for insert to authenticated
  with check (user_id = auth.uid());
create policy user_info_own_update on public.user_info
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy user_info_admin_update on public.user_info
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ADMINS: any signed-in user may check admin status; only admins add/remove admins.
drop policy if exists admins_read         on public.admins;
drop policy if exists admins_admin_insert on public.admins;
drop policy if exists admins_admin_delete on public.admins;
create policy admins_read on public.admins
  for select to authenticated using (true);
create policy admins_admin_insert on public.admins
  for insert to authenticated with check (public.is_admin());
create policy admins_admin_delete on public.admins
  for delete to authenticated using (public.is_admin());

-- BLACKLIST: admin only.
drop policy if exists blacklist_admin on public.blacklist;
create policy blacklist_admin on public.blacklist
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- GROUPS: anyone (incl. signup form) reads; admins manage.
drop policy if exists groups_read      on public.groups;
drop policy if exists groups_admin_all on public.groups;
create policy groups_read on public.groups
  for select to anon, authenticated using (true);
create policy groups_admin_all on public.groups
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- HOUR_ENTRIES: own rows readable; volunteers file pending requests; admins the rest.
drop policy if exists hour_entries_read         on public.hour_entries;
drop policy if exists hour_entries_insert       on public.hour_entries;
drop policy if exists hour_entries_admin_update on public.hour_entries;
drop policy if exists hour_entries_admin_delete on public.hour_entries;
create policy hour_entries_read on public.hour_entries
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy hour_entries_insert on public.hour_entries
  for insert to authenticated
  with check (public.is_admin() or (user_id = auth.uid() and status = 'pending'));
create policy hour_entries_admin_update on public.hour_entries
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy hour_entries_admin_delete on public.hour_entries
  for delete to authenticated
  using (public.is_admin());
