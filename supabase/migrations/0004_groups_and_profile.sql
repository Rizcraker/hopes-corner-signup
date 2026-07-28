-- ============================================================================
-- Hope's Corner — organizations (groups) access + self-service profile edits
-- Run in Supabase → SQL Editor after 0001–0003. Safe to re-run.
-- ============================================================================

-- ---- Organizations / groups -------------------------------------------------
-- The signup form is PRE-auth, so anon must be able to read the org list.
-- Writes stay admin-only via the existing groups_admin_all policy (from 0001).
grant select on public.groups to anon, authenticated;
grant insert, update, delete on public.groups to authenticated;

drop policy if exists groups_read on public.groups;
create policy groups_read on public.groups
  for select to anon, authenticated
  using (true);

-- ---- Self-service profile edits --------------------------------------------
-- Let a volunteer update their own user_info row (address, birthday, etc.).
grant select, insert, update on public.user_info to authenticated;

drop policy if exists user_info_own_update on public.user_info;
create policy user_info_own_update on public.user_info
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
