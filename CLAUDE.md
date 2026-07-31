# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Volunteer shift management web app for Hope's Corner: React 19 + TypeScript + Vite + Supabase. Volunteers browse shifts, sign up, self-report hours, and manage their profile. Admins manage jobs/shifts, rosters, hour-approval requests, other admins, and organizations. Minors (14–15) are gated behind a verified parent/guardian volunteer account.

## Tech Stack

- **Framework**: React 19, React Router DOM v7
- **Language**: TypeScript (strict; `verbatimModuleSyntax`, `noUnusedLocals`/`noUnusedParameters`)
- **Build**: Vite (`@vitejs/plugin-react` — Oxc, not SWC)
- **Backend**: Supabase (auth, Postgres, RPCs). Single client in [supabaseClient.ts](src/lib/supabaseClient.ts).
- **State**: custom hooks — no external state library. Styling is CSS (`App.css`) + inline styles.

## Common Commands

```bash
npm run dev       # Vite dev server
npm run build     # tsc -b (typecheck) then vite build
npm run preview   # preview the production build
npm run lint      # eslint .
```

No test framework. Env: a `.env` (gitignored) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; accessed via `import.meta.env.VITE_*`.

## Architecture

### Where state lives — App is the only hook host
The data hooks (`useVolunteerAuth`, `useUserInfo`, `useShifts`) are called **once in [App.tsx](src/App.tsx)** and passed down as props. They must **not** be called in route elements: pages like [VolunteerPage.tsx](src/pages/VolunteerPage.tsx) unmount on navigation, which would wipe the session, the in-progress registration form, and shift-browser state. The same reasoning is why shift-browser state (`sortMode`, `expandedJobs`, `expandedDateKeys`, `selectedCalendarDay`) lives in `useShifts`, not in `ShiftBrowser` — it has to survive leaving and re-entering the `/volunteer` route.

### Circular-dependency bridge between the three main hooks
`useVolunteerAuth` owns the auth listener, which must drive `useShifts`/`useUserInfo` (fetch on login, clear on logout). Those hooks in turn need `setErrorMessage` from auth. App breaks the cycle with a mutable `authBridgeRef` (`AuthDataBridge` in [useVolunteerAuth.ts](src/hooks/useVolunteerAuth.ts)) whose methods point at the other hooks' APIs. App fills it in a `useLayoutEffect` that runs before the auth listener's effect can fire, so the bridge is always populated.

### Registration & profile creation (RLS-driven)
Profile data is never inserted during registration — with email confirmation on, there's no session yet so RLS would reject the insert. Instead `handleAuthSubmit` sends all profile fields as `auth.signUp({ options: { data: ... } })` (auth `user_metadata`). The `user_info` row is created on the user's **first confirmed login**: `useUserInfo.fetchUserInfo` treats the `PGRST116` "no row" error as a signal to insert a row built from `session.user.user_metadata`. Keep this dance intact — do not add a registration-time `user_info` insert.

### Two parallel signup models (know which one you're touching)
Signup data is stored two ways that are **not joined**:

1. **Volunteer self-service → `user_info.active_shifts`**: a JSON array of human-readable description strings (`"role - time""), mutated only by `useUserInfo.updateActiveShifts` / `removeActiveShift`, which also decrement/increment the shift's `spots_left`. This is what `VolunteerDashboard`'s sign-up button calls (wired via `onSignUp` in [VolunteerPage.tsx](src/pages/VolunteerPage.tsx)).
2. **Admin roster management → `signups` table**: relational rows with `status` (`signed_up`/`attended`/`no_show`/`cancelled`), `manual_name` (walk-ins), `notes`. Managed by `useSignups` and rendered by [ShiftRoster.tsx](src/components/volunteer/ShiftRoster.tsx). Because `signups` has no FK to `user_info`, `ShiftRoster` attaches display names/emails by re-querying `user_info` for the user_ids (`withUserInfo`).

When adding a signup-related feature, determine which model it belongs to before writing the query.

### Hours ledger (`hour_entries`) + SECURITY DEFINER RPCs
The hours table is **`hour_entries`**, not `hours`: `user_id, hours, task, reason, status ('pending'|'approved'|'denied'), created_at, decided_at, decided_by`. `useHours` drives two sides:

- **Volunteer** (`VolunteerDashboard`): `requestHours` inserts a `pending` entry.
- **Admin** (`AdminDashboard` Requests tab): approves/denies via the RPCs `approve_hour_request(entry_id)` / `deny_hour_request(entry_id)`. Admins can also log hours directly with `admin_log_hours(target, delta, note)`, which returns the volunteer's new total.

`user_info.hours_volunteered` is the cached running total these RPCs keep in sync. Mutate hours through the RPCs, not by hand-editing `hours_volunteered`.

### All shift times render in Pacific time
`useShifts` exports `PT_TZ = 'America/Los_Angeles'` and formats every `dateLabel` / `timeLabel` / `time` string with `{ timeZone: PT_TZ }`, so all viewers see the same PT times regardless of their own timezone. Keep `timeZone: PT_TZ` on any new date formatting.

### Age range, minors, and parent verification
`age_range` (`'14_15'` | `'16_17'` | `'18_plus'`) on `user_info` is the **operational** eligibility field; birthday is optional/cosmetic. Rules live in [ageRange.ts](src/utils/ageRange.ts) (`minAge`, `minor`, `parentLink`, `meetsAgeRequirement` against a job's `min_age`).

- **14–15** volunteers must provide a linked `parent_email`, and — at sign-up time in `updateActiveShifts` — a `parent_account_exists(p_email)` RPC must confirm the parent's volunteer account exists. RLS blocks reading another user's `user_info` row, so this is a SECURITY DEFINER function that returns only a boolean.
- **16–17** may link a parent but can sign up regardless; **18+** has no parent option.

### Admin dashboard tabs (route `/admin`, admin-only via redirect in App)
[AdminDashboard.tsx](src/components/volunteer/AdminDashboard.tsx) is a four-tab shell (`volunteers` | `shifts` | `admins` | `requests`):

- **Volunteers** (default): list/search `user_info`, expand a volunteer for full details + active shifts, remove a shift from their schedule, and adjust hours via `admin_log_hours`.
- **Shifts**: [AdminJobManager.tsx](src/components/volunteer/AdminJobManager.tsx) — CRUD on `jobs` (each job's `ShiftRoster` is inlined). Jobs carry `min_age`, `password`, `visible`, `self_report`; deleting a job cascades to its shifts and signups.
- **Admins**: promote/remove admins via the `admins` table.
- **Requests**: the pending-hour-approval queue (`useHours.fetchPending`).

### Post-login redirect
After auth resolves (not loading, has session, admin status loaded) App redirects once: admins → `/admin`, everyone else → `/volunteer`. A `redirected` flag (reset on logout) prevents repeat redirects.

## Database (Supabase)

Tables the code reads/writes (superset groups/newsletters are simpler):
- `auth.users` — Supabase Auth.
- `user_info` — `user_id`, `hours_volunteered`, `active_shifts` (JSON array of strings), `email`, profile fields (`first_name`, `last_name`, `birthday` nullable, `phone_number`, `emergency_contact_*`, `employer`, `street_address`, `city`, `zip_code`, `organization`), `age_range`, `parent_email`, `first_volunteered_at`, `can_self_report`.
- `shifts` — `shift_start`, `shift_end` (timestamps), `spots_left`, `job_id` (FK→jobs), `capacity`, `password` (nullable). `title`/`description`/`requirements`/`location` were dropped — a shift's display heading now comes from its parent job. `useShifts.fetchShifts` selects shifts plus `jobs(id, name)` and maps each row to a client `Shift` whose `role` is the job's `name` (used for job-view grouping, the card title, and matching a volunteer's stored `active_shifts` strings). Volunteers therefore need SELECT on `jobs`; if RLS blocks it, roles fall back to `"General"` rather than erroring.
- `jobs` — `name`, `description`, `visible`, `password`, `min_age`, `self_report`, `created_at`. `Shift`s belong to a job; `ON DELETE CASCADE` removes a job's shifts and their signups.
- `signups` — `shift_id`, `user_id` (nullable for walk-ins), `manual_name`, `status`, `hours_reported`, `notes`, `created_at`.
- `hour_entries` — `user_id`, `hours`, `task`, `reason`, `status`, `created_at`, `decided_at`, `decided_by` (see RPCs above).
- `admins` — `user_id` (presence of a row = admin).
- `groups` — volunteer organizations shown on the pre-auth signup form.
- `newsletters` — `email`, `subscribed_at`, `unsubscribed_at`.

**SECURITY DEFINER RPCs** (the authoritative mutation paths; do not bypass):
- `approve_hour_request(entry_id)`, `deny_hour_request(entry_id)`, `admin_log_hours(target, delta, note)` → returns new total.
- `parent_account_exists(p_email)` → boolean.

**Migrations**: incremental, idempotent SQL run via the Supabase SQL Editor lives in [`supabase/migrations/`](supabase/migrations/). `0001`–`0003` (auth/jobs/signups/hours base + RPCs) are already applied and removed from the repo; `0004` (groups anon-read + `user_info` self-update policy), `0005` (`age_range`/`parent_email` columns), `0006` (`parent_account_exists` RPC) are the current on-disk migrations. Add new schema changes as a new numbered `.sql` file marked "safe to re-run."

**RLS notes**: the groups table is readable by `anon`/`authenticated` (the signup form needs the org list before auth); the `jobs` table must be SELECT-able by `authenticated` so volunteers can see shift titles (now derived from the job name); authenticated users can update their **own** `user_info` row (`user_info_own_update`). Most other writes are admin-only.

## Conventions for extending

- **New page**: add under [src/pages/](src/pages/), add a `<Route>` in [App.tsx](src/App.tsx).
- **New `user_info` field**: add to the `UserInfo` interface in [userInfo.ts](src/types/userInfo.ts), to the `select` + insert-from-metadata row in `useUserInfo.fetchUserInfo` (PGRST116 branch), to the `updateProfile` editable list, and to the `user_metadata` sent in `handleAuthSubmit` (so the first-login insert picks it up).
- **New `shifts` column**: add to the `select` in `useShifts.fetchShifts`, the client `Shift` interface/mapping, and the admin job/shift form.
- **New table/RPC**: follow the existing Supabase patterns in the relevant hook (`supabase.from('…')` / `supabase.rpc('…')`), add an idempotent migration, and add the table to the schema list above.
