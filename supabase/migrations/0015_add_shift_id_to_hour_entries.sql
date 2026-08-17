-- ============================================================================
-- Hope's Corner -- Add shift_id to hour_entries for tracing
-- Run in Supabase → SQL Editor after 0001–0014. Safe to re-run.
-- ============================================================================

-- Add shift_id column if it does not exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'hour_entries' and column_name = 'shift_id') then
        alter table public.hour_entries add column shift_id uuid references public.shifts(id);
    end if;
end $$;

-- Index for faster lookups by shift
create index if not exists ix_hour_entries_shift_id on public.hour_entries (shift_id);