-- ============================================================================
-- Hope's Corner -- pg_cron job to award hours for ended shifts (safety net)
-- Run in Supabase → SQL Editor after 0001–0013. Safe to re-run.
-- ============================================================================

-- Enable the pg_cron extension if not already present
create extension if not exists pg_cron schema public;

-- Schedule a job that runs every minute
select cron.schedule(
  'award-ended-shifts-every-minute',
  '* * * * *',                     -- every minute
  $$
    -- Find shifts that are still pending and whose end time has passed
    update public.shifts s
       set hours_awarded = true
     from (
        select s.id
          from public.shifts s
         where s.shift_end <= now()
           and s.hours_awarded = false
     ) sub
    where s.id = sub.id
      and public.award_hours_for_shift(s.id) is not null   -- invoke the RPC
  $$
);