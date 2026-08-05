-- ============================================================================
-- Hope's Corner — cancellation log (report + late-cancel follow-up)
-- Run in Supabase → SQL Editor after 0001–0008. Safe to re-run.
--
-- Records every volunteer shift cancellation so admins can (a) view a cancelled
-- report and (b) follow up on late cancels (<24h before the shift). Snapshots the
-- shift start + job name so the report survives the shift being deleted later.
-- ============================================================================

create table if not exists public.cancellations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  shift_id     uuid references public.shifts(id) on delete set null,
  shift_start  timestamptz,                    -- snapshot
  job_name     text,                           -- snapshot
  cancelled_at timestamptz not null default now(),
  hours_before numeric,                        -- hours between cancel and shift start
  late         boolean not null default false, -- cancelled within 24h of the shift
  notified     boolean not null default false  -- admin/system emailed the volunteer about it
);
create index if not exists cancellations_user_idx on public.cancellations(user_id);
create index if not exists cancellations_late_idx on public.cancellations(late);

grant select, insert, update, delete on public.cancellations to authenticated;

alter table public.cancellations enable row level security;

-- A volunteer logs their own cancellation and can read it; admins read/manage all.
drop policy if exists cancellations_own_insert on public.cancellations;
drop policy if exists cancellations_read       on public.cancellations;
drop policy if exists cancellations_admin_all  on public.cancellations;
create policy cancellations_own_insert on public.cancellations
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());
create policy cancellations_read on public.cancellations
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy cancellations_admin_all on public.cancellations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
