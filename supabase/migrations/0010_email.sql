-- ============================================================================
-- Hope's Corner — email templates + send log
-- Run in Supabase → SQL Editor after 0001–0009. Safe to re-run.
-- Pairs with the send-email Edge Function.
-- ============================================================================

create table if not exists public.email_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  subject    text not null default '',
  body_html  text not null default '',
  from_name  text,
  from_email text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.email_log (
  id              uuid primary key default gen_random_uuid(),
  sent_by         uuid references auth.users(id) on delete set null,
  subject         text,
  recipient_count integer,
  recipients      jsonb,
  status          text,
  created_at      timestamptz not null default now()
);

grant select, insert, update, delete on public.email_templates to authenticated;
grant select, insert                 on public.email_log       to authenticated;

alter table public.email_templates enable row level security;
alter table public.email_log       enable row level security;

-- Templates: admins manage.  Log: admins read (the function writes via service role).
drop policy if exists email_templates_admin on public.email_templates;
create policy email_templates_admin on public.email_templates
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists email_log_admin_read on public.email_log;
create policy email_log_admin_read on public.email_log
  for select to authenticated
  using (public.is_admin());
