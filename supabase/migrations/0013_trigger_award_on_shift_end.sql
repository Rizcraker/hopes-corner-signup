-- ============================================================================
-- Hope's Corner -- Trigger to award hours when a shift ends
-- Run in Supabase → SQL Editor after 0001–0012. Safe to re-run.
-- ============================================================================

-- Function that fires the awarding logic
create or replace function public.trigger_award_when_shift_ends()
returns trigger
language plpgsql
as $$
begin
  -- Fire only when the shift’s end time is now in the past
  -- and we haven’t awarded it yet.
  if NEW.shift_end <= now() and NEW.hours_awarded = false then
    perform public.award_hours_for_shift(NEW.id);
  end if;

  -- Let the original INSERT/UPDATE proceed unchanged
  return NEW;
end;
$$;

-- Attach the trigger to the shifts table
drop trigger if exists award_when_shift_ends on public.shifts;
create trigger award_when_shift_ends
after insert or update of shift_end, hours_awarded
on public.shifts
for each row
execute function public.trigger_award_when_shift_ends();