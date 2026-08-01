-- ============================================================================
-- Hope's Corner — Job → Shift hierarchy (thin shifts, descriptive jobs)
-- Run in Supabase → SQL Editor after 0001–0006. Safe to re-run.
--
-- Model:
--   jobs  = the opportunity: name, description, requirements, location, min_age,
--           visible, password (team-lead jobs), self_report, created_at
--   shift = just spots_left, shift_start, shift_end, job_id  (belongs to a job;
--           a job can have several shifts, incl. two on the same day)
-- ============================================================================

-- 1. Jobs: add the descriptive fields the shift no longer carries.
alter table public.jobs
  add column if not exists requirements text,
  add column if not exists location     text;

-- 2. Shifts: a shift's descriptive info now lives on its job. If any legacy
--    per-shift text columns exist AND are NOT NULL, relax them so a shift can be
--    created with only spots_left + times + job_id. Skips columns that don't
--    exist (some databases never had them).
do $$
declare c text;
begin
  foreach c in array array['title', 'description', 'location', 'requirements'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'shifts'
        and column_name = c and is_nullable = 'NO'
    ) then
      execute format('alter table public.shifts alter column %I drop not null', c);
    end if;
  end loop;
end $$;

-- 3. Repeat grouping. When an admin generates a weekly-repeating batch, every
--    generated shift shares one recurrence_group id, so the whole series can be
--    managed/deleted together. uuid (a generated id) is the right type here —
--    not text — because it's an opaque group key, nullable for one-off shifts.
alter table public.shifts
  add column if not exists recurrence_group uuid;

create index if not exists shifts_recurrence_idx on public.shifts(recurrence_group);
create index if not exists shifts_job_idx        on public.shifts(job_id);
