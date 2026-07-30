-- ============================================================================
-- Hope's Corner — age range + parent/guardian link
-- Run in Supabase → SQL Editor after 0001–0004. Safe to re-run.
--
-- Birthday becomes optional; age_range is the operational field for eligibility.
-- parent_email links a minor ("kid") account to a parent volunteer's account.
-- ============================================================================

alter table public.user_info
  add column if not exists age_range    text,   -- 'under_14' | '14_15' | '16_17' | '18_plus'
  add column if not exists parent_email  text;   -- linked parent/guardian volunteer email (minors)
