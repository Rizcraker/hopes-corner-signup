-- ============================================================================
-- Hope's Corner — hour_entries ledger
-- Powers: volunteer timesheet, "request more hours" flow, admin approve/deny,
--         and admin add/change-hours logging.
-- Run in Supabase → SQL Editor. Safe to re-run.
-- Depends on 0001 (needs the public.is_admin() helper).
-- ============================================================================

create table if not exists public.hour_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  hours       numeric not null,                       -- may be negative (corrections)
  task        text,                                    -- what they did (admin note / shift name)
  reason      text,                                    -- volunteer's justification when requesting
  status      text not null default 'approved',        -- pending | approved | denied
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  decided_by  uuid references auth.users(id)
);
create index if not exists hour_entries_user_idx   on public.hour_entries(user_id);
create index if not exists hour_entries_status_idx on public.hour_entries(status);

-- Table-level privileges. RLS (below) still restricts WHICH rows each user sees;
-- these GRANTs are what let the authenticated role touch the table at all.
grant select, insert, update, delete on public.hour_entries to authenticated;

alter table public.hour_entries enable row level security;

-- Read: your own rows, or any if admin.
drop policy if exists hour_entries_read on public.hour_entries;
create policy hour_entries_read on public.hour_entries
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Insert: a volunteer can only file a PENDING request for themselves;
--         an admin can insert anything (e.g. an approved add-hours entry).
drop policy if exists hour_entries_insert on public.hour_entries;
create policy hour_entries_insert on public.hour_entries
  for insert to authenticated
  with check (
    public.is_admin()
    or (user_id = auth.uid() and status = 'pending')
  );

-- Update / delete: admins only (approve, deny, correct).
drop policy if exists hour_entries_admin_update on public.hour_entries;
create policy hour_entries_admin_update on public.hour_entries
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists hour_entries_admin_delete on public.hour_entries;
create policy hour_entries_admin_delete on public.hour_entries
  for delete to authenticated
  using (public.is_admin());
