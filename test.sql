-- Make sure the function is security definer (run once)
ALTER FUNCTION public.award_hours_for_shift(uuid)
    SECURITY DEFINER
    SET search_path = public;

-- Find a shift that hasn't been awarded yet but whose end time is past
WITH target AS (
    SELECT id
    FROM   public.shifts
    WHERE  hours_awarded = false
      AND  shift_end <= now()
    LIMIT 1
)
SELECT public.award_hours_for_shift(id) FROM target;

-- Verify the effects
SELECT
  s.id,
  s.hours_awarded,
  (SELECT count(*) FROM public.hour_entries he WHERE he.shift_id = s.id) AS entry_cnt,
  ui.hours_volunteered                                  AS vol_hours,
  ui.active_shifts                                      AS active_shifts
FROM   public.shifts s
JOIN   public.signups sg ON sg.shift_id = s.id
JOIN   public.user_info ui ON ui.user_id = sg.user_id
WHERE  s.id = (SELECT id FROM target LIMIT 1);