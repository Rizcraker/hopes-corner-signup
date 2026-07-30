-- ============================================================================
-- Hope's Corner — verify a linked parent/guardian account exists
-- Run in Supabase → SQL Editor after 0001–0005. Safe to re-run.
--
-- A 14–15 volunteer must link a parent who already has a volunteer account, but
-- RLS won't let them read another user's user_info row. This SECURITY DEFINER
-- function only returns a boolean (existence), so no personal data leaks.
-- ============================================================================

create or replace function public.parent_account_exists(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_info
    where lower(email) = lower(trim(p_email))
  );
$$;

grant execute on function public.parent_account_exists(text) to authenticated;
