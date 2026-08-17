-- ============================================================================
-- Hope's Corner -- Function to award hours for completed shifts
-- Run in Supabase → SQL Editor after 0001–0011. Safe to rerun.
-- ============================================================================

create or replace function public.award_hours_for_shift(p_shift_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift_start timestamptz;
  v_shift_end   timestamptz;
  v_job_name    text;
  v_hours       numeric;
  v_entry_id    uuid;
  v_shift_desc  text;
begin
  -- Bypass Row Level Security for the duration of this function
  set local row_security = off;

  -- 1️⃣ Load shift + job name
  select s.shift_start, s.shift_end, j.name
    into v_shift_start, v_shift_end, v_job_name
    from public.shifts s
    left join public.jobs j on s.job_id = j.id
   where s.id = p_shift_id;

  if not found then
    raise exception 'Shift not found: %', p_shift_id;
  end if;

  -- 2️⃣ Compute hours (duration in hours)
  v_hours := extract(epoch from (v_shift_end - v_shift_start)) / 3600.0;

  -- 3️⃣ Build the description string that matches what the client stores in active_shifts
  --    Example: "Barista - Tue, Aug 17 · 9:00 AM - 1:00 PM"
  v_shift_desc := trim(
      coalesce(v_job_name,'General') || ' - ' ||
      to_char(v_shift_start, 'Dy, Mon DD') || ' · ' ||
      to_char(v_shift_start, 'HH12:MI AM') || ' - ' ||
      to_char(v_shift_end,   'HH12:MI AM')
  );

  -- 4️⃣ Insert pending hour entries for every signed‑up volunteer
  for v_entry_id in
    insert into public.hour_entries
          (id, user_id, shift_id, hours, task, reason, status, created_at)
    select
        gen_random_uuid(),                     -- id
        su.user_id,
        p_shift_id,                            -- shift_id
        v_hours,
        coalesce(v_job_name,'General') as task,
        'Completed shift: ' || coalesce(v_job_name,'General') as reason,
        'pending' as status,
        now() as created_at
    from public.signups su
    where su.shift_id = p_shift_id
      and su.status = 'signed_up'
    returning id
  loop
    -- Note: we keep them as pending for now; we'll approve them in a batch below.
    null; -- placeholder to keep loop syntax
  end loop;

  -- 5️⃣ Approve all pending hour entries for this shift in one go
  update public.hour_entries
     set status = 'approved',
         decided_at = now(),
         decided_by = null   -- system‑awarded; you could set to a specific system userid if desired
   where shift_id = p_shift_id
     and status = 'pending';

  -- 6️⃣ Add the awarded hours to each volunteer's total
  update public.user_info ui
     set hours_volunteered = ui.hours_volunteered + sub.total_hours
   from (
         select he.user_id, sum(he.hours) as total_hours
           from public.hour_entries he
          where he.shift_id = p_shift_id
            and he.status = 'approved'
          group by he.user_id
       ) sub
   where ui.user_id = sub.user_id;

  -- 7️⃣ Remove the shift description from each volunteer's active_shifts array
  -- active_shifts is jsonb array of strings; convert to text[], remove, back to jsonb
  update public.user_info
     set active_shifts = coalesce(
         (
             select to_jsonb(
                 array_remove(
                     array_agg(elem),
                     v_shift_desc
                 )
             )
             from jsonb_array_elements_text(active_shifts) as elem
         ),
         '[]'::jsonb
     )
   where user_id in (
         select user_id from public.signups where shift_id = p_shift_id
       );

  -- 8️⃣ Mark the shift as awarded
  update public.shifts
     set hours_awarded = true
   where id = p_shift_id;

  -- 9️⃣ (Optional) Fire a notification – you can call an edge function here
  -- perform public.notify_hour_award(p_shift_id);
exception
  when others then
    raise exception 'Failed to award hours for shift %: %', p_shift_id, sqlerrm;
end;
$$;

-- Grant execute rights
grant execute on function public.award_hours_for_shift(p_shift_id uuid) to authenticated, anon;
grant execute on function public.award_hours_for_shift(p_shift_id uuid) to service_role;