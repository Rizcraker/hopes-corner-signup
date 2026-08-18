-- ============================================================================
-- Hope's Corner — run the hours-award automatically every minute (pg_cron)
-- Run in Supabase → SQL Editor after 0012. Safe to re-run.
--
-- award_all_completed_shifts() processes every finished, not-yet-awarded shift.
-- pg_cron calls it once a minute, server-side, so hours are credited even when
-- nobody has the app open.
-- ============================================================================

create or replace function public.award_all_completed_shifts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare r record; n integer := 0;
begin
  for r in
    select id from public.shifts
     where hours_awarded = false and shift_end is not null and shift_end <= now()
  loop
    begin
      perform public.award_hours_for_shift(r.id);
      n := n + 1;
    exception when others then
      raise warning 'award failed for shift %: %', r.id, sqlerrm;
    end;
  end loop;
  return n;
end;
$$;

grant execute on function public.award_all_completed_shifts() to authenticated, service_role;

-- Enable pg_cron. If this line errors, enable it once in
-- Supabase → Database → Extensions (search "pg_cron"), then re-run this file.
create extension if not exists pg_cron;

-- Replace any previous schedule of the same name, then run every minute.
select cron.unschedule(jobid) from cron.job where jobname = 'award-completed-shifts';
select cron.schedule('award-completed-shifts', '* * * * *', $$ select public.award_all_completed_shifts(); $$);
