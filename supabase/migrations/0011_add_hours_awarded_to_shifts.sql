-- ============================================================================
-- Hope's Corner -- Add hours_awarded flag to shifts
-- Run in Supabase → SQL Editor after 0001–0010. Safe to re-run.
-- ============================================================================

alter table public.shifts add column if not exists hours_awarded boolean not null default false;

-- Index for faster queries on not yet awarded shifts
create index if not exists idx_shifts_hours_awarded_false on public.shifts (hours_awarded) where hours_awarded = false;

grant select, insert, update, delete on public.shifts to authenticated;
alter table public.shifts enable row level security;

-- Policy: admins can manage all shifts; volunteers can only see shifts (RLS on jobs already handles visibility)
drop policy if exists shifts_admin_all on public.shifts;
create policy shifts_admin_all on public.shifts
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists shifts_volunteer_select on public.shifts;
create policy shifts_volunteer_select on public.shifts
  for select to authenticated
  using (true); -- volunteers can see all shifts (job visibility handled via embedded jobs RLS)