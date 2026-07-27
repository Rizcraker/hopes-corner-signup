-- ============================================================================
-- Hope's Corner — hours write functions (robust, reproducible)
-- Run in Supabase → SQL Editor after 0001 and 0002. Safe to re-run.
--
-- Why: admin hour writes previously relied on ad-hoc RLS policies + table GRANTs
-- being present on every database. That was fragile (worked on one DB, silently
-- failed on another). These SECURITY DEFINER functions run as the table owner, so
-- they bypass RLS for the internal writes, are atomic, and only need is_admin().
-- ============================================================================

-- Belt-and-suspenders: also capture the admin UPDATE policy on user_info that was
-- previously only applied by hand, in case any direct writes remain.
drop policy if exists user_info_admin_update on public.user_info;
create policy user_info_admin_update on public.user_info
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Admin logs a (signed) hours change with a note; approved on the spot. Returns new total.
create or replace function public.admin_log_hours(target uuid, delta numeric, note text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare new_total numeric;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  insert into public.hour_entries (user_id, hours, task, status, decided_at, decided_by)
  values (target, delta, nullif(note, ''), 'approved', now(), auth.uid());

  update public.user_info
    set hours_volunteered = greatest(0, coalesce(hours_volunteered, 0) + delta)
    where user_id = target
    returning hours_volunteered into new_total;

  return new_total;
end
$$;

-- Admin approves a pending request: flips status + credits the hours atomically. Returns new total.
create or replace function public.approve_hour_request(entry_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare e public.hour_entries; new_total numeric;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  update public.hour_entries
    set status = 'approved', decided_at = now(), decided_by = auth.uid()
    where id = entry_id and status = 'pending'
    returning * into e;

  if e.id is null then
    raise exception 'request not found or already decided';
  end if;

  update public.user_info
    set hours_volunteered = greatest(0, coalesce(hours_volunteered, 0) + e.hours)
    where user_id = e.user_id
    returning hours_volunteered into new_total;

  return new_total;
end
$$;

-- Admin denies a pending request.
create or replace function public.deny_hour_request(entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  update public.hour_entries
    set status = 'denied', decided_at = now(), decided_by = auth.uid()
    where id = entry_id and status = 'pending';
end
$$;

grant execute on function public.admin_log_hours(uuid, numeric, text) to authenticated;
grant execute on function public.approve_hour_request(uuid) to authenticated;
grant execute on function public.deny_hour_request(uuid) to authenticated;
