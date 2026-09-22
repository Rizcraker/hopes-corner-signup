-- ============================================================================
-- Hope's Corner -- Add shift_id to hour_entries for tracing
-- Run in Supabase → SQL Editor after 0001–0014. Safe to re-run.
-- ============================================================================

-- Remove foreign key constraint if it exists (ignore if doesn't exist)
do $$
begin
    execute 'ALTER TABLE public.hour_entries DROP CONSTRAINT IF EXISTS hour_entries_shift_id_fkey';
exception when undefined_table then
    -- table doesn't exist yet, that's fine
end $$;

-- Add shift_id column if it does not exist (as regular column, no foreign key)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'hour_entries' and column_name = 'shift_id') then
        alter table public.hour_entries add column shift_id uuid;
    end if;
end $$;

-- Index for faster lookups by shift
create index if not exists ix_hour_entries_shift_id on public.hour_entries (shift_id);