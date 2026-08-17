---
name: shift-auto-award-hours
description: Hide finished shifts from volunteers; automatic hour awarding and active_shifts removal handled server‑side via trigger/pg_cron
metadata:
  type: project
---

Implemented hiding of shifts that have reached their shift_end for volunteers, with server‑side automatic hour awarding and active_shifts cleanup.

Changes made:
1. **`src/types/shift.ts`** – added `endDate: Date` (parsed from `shift_end`). The `hoursAwarded` field remains in the interface for compatibility but is not used client‑side.
2. **`src/hooks/useShifts.ts`**
   - Fetches `endDate` (and unused `hours_awarded`) from the database.
   - Removed the `processExpiredShifts` method and its periodic call; no RPC is invoked from the client.
   - The hook only provides shift data with `endDate`.
3. **`src/components/shifts/ShiftBrowser.tsx`**
   - The `isAvailable()` function filters out any shift where `endDate.getTime() <= Date.now()`, so ended shifts are not shown in Job, Date, or Calendar views.
4. **`src/App.tsx`**
   - Removed the `setInterval` that previously called `processExpiredShifts`.
5. **Supabase migrations** (to be applied in Supabase SQL Editor):
   - `0011_add_hours_awarded_to_shifts.sql` – adds `hours_awarded boolean NOT NULL DEFAULT FALSE` column to `public.shifts`.
   - `0012_create_award_hours_for_shift_function.sql` – creates `public.award_hours_for_shift(p_shift_id UUID)` that:
     * Retrieves shift start/end times and job name.
     * Computes hours volunteered as duration in hours.
     * Builds a shift description string matching the client's `"role - time"` format.
     * Inserts pending `hour_entries` for each volunteer signed up (`signups.status = 'signed_up'`).
     * **Approves each inserted hour entry directly** (sets status to `'approved'`, `decided_at = now()`, `decided_by = null`) and adds the hours to `user_info.hours_volunteered`.
     * **Removes the shift description from each volunteer's `active_shifts` array** using `jsonb_array_elements_text` to safely convert JSONB to text array, remove the element, and convert back to JSONB.
     * Marks the shift as `hours_awarded = TRUE`.
     * Function is `SECURITY DEFINER`, disables row security locally with `set local row_security = off;`, and has execute rights for `authenticated`, `anon`, and `service_role`.
   - `0013_trigger_award_on_shift_end.sql` – creates trigger `award_when_shift_ends` that fires `AFTER INSERT OR UPDATE OF shift_end, hours_awarded` on `public.shifts` and calls the RPC when `NEW.shift_end <= now()` and `NEW.hours_awarded = false`.
   - `0014_cron_award_ended_shifts.sql` – (optional) enables `pg_cron` extension and schedules a job every minute that runs the same RPC as a safety net.
   - `0015_add_shift_id_to_hour_entries.sql` – adds `shift_id uuid REFERENCES public.shifts(id)` to `public.hour_entries` and indexes it.
   - Index recommendation: `CREATE INDEX IF NOT EXISTS ix_shifts_pending_end ON public.shifts (hours_awarded, shift_end) WHERE hours_awarded = false;`
6. **Memory** – this file documents the approach.

Result: When a shift's `shift_end` time passes, the trigger (or the pg_cron job) invokes `award_hours_for_shift`, which awards hours to all signed‑up volunteers, removes the shift from their `active_shifts` array, and marks the shift as awarded. The volunteer UI hides the shift immediately via the `endDate` filter, and after awarding it also disappears from the volunteer's "Your Shifts" list because `active_shifts` was cleared. Admins can still see the shift in the `shifts` table (e.g., Admin Dashboard → Jobs & Shifts).

---
**Why:** This satisfies the requirement that finished shifts automatically award volunteers with hours, clear their active shift tracking, and remove them from the volunteer view while preserving admin visibility, with all logic residing safely on the server side.
**How to apply:** Apply the Supabase migrations in the order listed above (0011 → 0012 → 0013 → 0014 → 0015, plus optional index). The TypeScript changes are compile‑safe; run `npm run dev` to test.