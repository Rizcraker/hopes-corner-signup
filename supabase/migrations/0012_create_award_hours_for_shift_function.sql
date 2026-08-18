-- ============================================================================
-- Hope's Corner — award hours for a completed shift
-- Run in Supabase → SQL Editor after 0001–0011. Safe to re-run.
--
-- When a shift is over, every signed-up volunteer is credited its duration, an
-- approved hour_entries row is written, and the shift is removed from their
-- active_shifts. SECURITY DEFINER (owned by postgres, the table owner) so it
-- bypasses RLS — no client permission issues. Idempotent via hours_awarded.
-- ============================================================================

create or replace function public.award_hours_for_shift(p_shift_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start   timestamptz;
  v_end     timestamptz;
  v_awarded boolean;
  v_job     text;
  v_hours   numeric;
  v_desc    text;
begin
  select s.shift_start, s.shift_end, s.hours_awarded, coalesce(j.name, 'General')
    into v_start, v_end, v_awarded, v_job
    from public.shifts s
    left join public.jobs j on j.id = s.job_id
   where s.id = p_shift_id;

  if not found then raise exception 'Shift not found: %', p_shift_id; end if;
  if v_awarded then return; end if;                        -- already paid out — no double count
  if v_end is null or v_end > now() then return; end if;    -- not finished yet

  v_hours := round(greatest(0, extract(epoch from (v_end - v_start)) / 3600.0)::numeric, 2);

  -- Rebuild the exact string the app stores in active_shifts, e.g.
  -- "Saturday Breakfast - Sat, Aug 8 · 7:00 AM - 9:00 AM"  (Pacific time, no zero-padding).
  v_desc := v_job || ' - ' ||
            to_char(v_start at time zone 'America/Los_Angeles', 'Dy, Mon FMDD') || ' · ' ||
            to_char(v_start at time zone 'America/Los_Angeles', 'FMHH12:MI AM') || ' - ' ||
            to_char(v_end   at time zone 'America/Los_Angeles', 'FMHH12:MI AM');

  -- One approved hour entry per signed-up volunteer (skip walk-ins with no account).
  insert into public.hour_entries (user_id, shift_id, hours, task, reason, status, created_at, decided_at)
  select su.user_id, p_shift_id, v_hours, v_job, 'Completed shift: ' || v_job, 'approved', now(), now()
    from public.signups su
   where su.shift_id = p_shift_id
     and su.user_id is not null
     and su.status in ('signed_up', 'attended');

  -- Credit each volunteer's cached total by the shift duration.
  update public.user_info ui
     set hours_volunteered = coalesce(ui.hours_volunteered, 0) + v_hours
   where ui.user_id in (
     select su.user_id from public.signups su
      where su.shift_id = p_shift_id and su.user_id is not null and su.status in ('signed_up', 'attended')
   );

  -- Remove the shift from each of those volunteers' active_shifts list.
  update public.user_info ui
     set active_shifts = coalesce((
           select to_jsonb(array_remove(array_agg(elem), v_desc))
             from jsonb_array_elements_text(ui.active_shifts) as elem
         ), '[]'::jsonb)
   where ui.active_shifts is not null
     and ui.user_id in (
       select su.user_id from public.signups su
        where su.shift_id = p_shift_id and su.user_id is not null and su.status in ('signed_up', 'attended')
     );

  update public.shifts set hours_awarded = true where id = p_shift_id;
end;
$$;

grant execute on function public.award_hours_for_shift(uuid) to authenticated, service_role;
