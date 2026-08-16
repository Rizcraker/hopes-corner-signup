-- ============================================================================
-- Hope's Corner -- Function to award hours for completed shifts
-- Run in Supabase → SQL Editor after 0001–0011. Safe to re-run.
-- ============================================================================

create or replace function public.award_hours_for_shift(p_shift_id uuid)
returns void
language plpgsql
as $$
declare
  v_shift_start timestamptz;
  v_shift_end timestamptz;
  v_job_name text;
  v_hours numeric;
  v_entry_id uuid;
  v_shift_description text;
begin
  -- Fetch shift details
  select s.shift_start, s.shift_end, j.name into v_shift_start, v_shift_end, v_job_name
  from public.shifts s
  left join public.jobs j on s.job_id = j.id
  where s.id = p_shift_id;

  if not found then
    raise exception 'Shift not found: %', p_shift_id;
  end if;

  -- Compute hours
  v_hours := extract(epoch from (v_shift_end - v_shift_start)) / 3600.0;

  -- Build shift description string matching client side: "role - time"
  -- time format: "Weekday, Mon DD · HH:MM AM/PM - HH:MM AM/PM"
  v_shift_description := trim(
      v_job_name || ' - ' ||
      to_char(v_shift_start, 'Dy, Mon DD') || ' · ' ||
      to_char(v_shift_start, 'HH12:MI AM') || ' - ' ||
      to_char(v_shift_end, 'HH12:MI AM')
  );

  -- Insert pending hour entries for each signed up volunteer and immediately approve each
  for v_entry_id in
    insert into public.hour_entries (user_id, hours, task, reason, status, created_at)
    select su.user_id,
           v_hours,
           coalesce(v_job_name, 'General') as task,
           'Completed shift: ' || coalesce(v_job_name, 'General') as reason,
           'pending' as status,
           now() as created_at
    from public.signups su
    where su.shift_id = p_shift_id
      and su.status = 'signed_up'
    returning id
  loop
    perform public.approve_hour_request(v_entry_id);
  end loop;

  -- Remove shift description from volunteers' active_shifts array
  update public.user_info
  set active_shifts = coalesce(array_remove(active_shifts, v_shift_description), '{}'::text[])
  where user_id in (
    select user_id from public.signups where shift_id = p_shift_id
  );

  -- Mark shift as hours awarded
  update public.shifts
  set hours_awarded = true
  where id = p_shift_id;

exception
  when others then
    raise exception 'Failed to award hours for shift %: %', p_shift_id, sqlerrm;
end;
$$;

-- Grant execute rights
grant execute on function public.award_hours_for_shift(p_shift_id uuid) to authenticated, anon;
grant execute on function public.award_hours_for_shift(p_shift_id uuid) to service_role;