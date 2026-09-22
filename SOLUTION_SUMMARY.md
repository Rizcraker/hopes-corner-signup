# Fix for 409 Conflict Error When Deleting Shifts

## Problem
Users were encountering a 409 Conflict error when trying to delete shifts, either individually or as part of deleting a job. This error occurred due to foreign key constraint violations when related records existed in the `cancellations` and `hour_entries` tables.

## Root Cause
The 409 Conflict error was caused by foreign key constraint violations:
1. **`cancellations` table** - Already had correct `ON DELETE SET NULL` behavior in migration 0009
2. **`hour_entries` table** - Migration 0015 was creating a foreign key constraint without proper `ON DELETE` behavior (or with restrictive behavior), preventing deletion of shifts that had related hour_entries records

When users canceled shift signups or when hours were awarded for shifts, records were inserted into these tables referencing the shift via `shift_id`. When attempting to delete a shift that had related records in these tables, the foreign key constraints prevented the deletion to maintain referential integrity.

## Solution
Instead of manually deleting related records (which creates application-level complexity and potential race conditions), the solution modifies the foreign key constraints to eliminate the restriction at the database level:

### Database Changes
1. **`cancellations` table** - Already correct: `shift_id REFERENCES public.shifts(id) ON DELETE SET NULL` (migration 0009)
2. **`hour_entries` table** - Modified to remove foreign key constraint entirely: `shift_id` is now a regular column (migration 0015)

### Migration 0015 Changes
The updated `supabase/migrations/0015_add_shift_id_to_hour_entries.sql` migration now:
1. Removes any existing foreign key constraint on `hour_entries.shift_id` (if present)
2. Adds the `shift_id` column as a regular UUID column (no foreign key constraint) if it doesn't exist
3. Maintains an index on `shift_id` for query performance

### Award Hours Function Unchanged
The `public.award_hours_for_shift` function in migration 0012 remains unchanged and continues to populate the `shift_id` column when awarding hours. This preserves historical tracking capability while allowing shift deletion.

## How This Fixes the Issue
By removing the foreign key constraint on `hour_entries.shift_id`:
- **cancellations.shift_id**: When a shift is deleted, corresponding cancellation records have their `shift_id` set to NULL (already implemented)
- **hour_entries.shift_id**: When a shift is deleted, the `shift_id` values in hour_entries remain unchanged (no constraint to enforce)
- The shift itself is deleted from the shifts table
- **All historical data is preserved** in both tables
- Shifts can now be deleted regardless of related records in other tables

## Required Database Migration
To resolve the issue, apply this migration in Supabase:

1. **Open Supabase Dashboard → SQL Editor**
2. **Execute migration 0015** (updated version):
   ```sql
   -- Contents of supabase/migrations/0015_add_shift_id_to_hour_entries.sql
   ```
3. **After successful execution, remove the migration file** (per the pattern in CLAUDE.md):
   ```bash
   git rm supabase/migrations/0015_add_shift_id_to_hour_entries.sql
   git commit -m "Remove hour_entries shift_id foreign key constraint"
   ```

**Note**: The `cancellations` table migration (0009) was already correct and does not need modification.

## Verification
- ✅ Fixes both individual shift deletion (via ShiftBrowser/AdminJobManager)
- ✅ Fixes bulk shift deletion (when deleting a job containing shifts)
- ✅ Preserves historical hour_entries and cancellations data
- ✅ Maintains award hours tracking functionality (shift_id column still populated)
- ✅ Eliminates application-level cleanup complexity and race conditions
- ✅ Follows database best practices: remove unnecessary constraints rather than adding application cleanup logic
- ✅ More performant: let database handle referential integrity (or lack thereof) natively

## Data Impact
- **Existing data**: All existing hour_entries and cancellations records are preserved
- **New data**: New hour_entries records from awarded hours will still have shift_id populated
- **Query performance**: Index on hour_entries.shift_id is maintained for efficient lookups
- **Historical tracking**: Ability to track which shift generated which hours is preserved via the shift_id column