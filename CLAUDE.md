# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Volunteer shift management web app for Hope's Corner: React 19 + TypeScript + Vite + Supabase. Volunteers browse shifts, sign up, self-report hours, and manage their profile. Admins manage jobs/shifts, rosters, hour-approval requests, other admins, and organizations. Minors (14–15) are gated behind a verified parent/guardian volunteer account.

## Tech Stack

- **Framework**: React 19, React Router DOM v7
- **Language**: TypeScript (strict; `verbatimModuleSyntax`, `noUnusedLocals`/`noUnusedParameters`, `erasableSyntaxOnly`). Use `import type` for type-only imports — `verbatimModuleSyntax` will reject a value-style import of a type.
- **Build**: Vite (`@vitejs/plugin-react` — Oxc, not SWC)
- **Backend**: Supabase (auth, Postgres, RPCs). Single client in [supabaseClient.ts](src/lib/supabaseClient.ts).
- **State**: custom hooks — no external state library. Styling is CSS (`App.css`, `index.css`) + inline styles.

## Common Commands

```bash
npm run dev       # Vite dev server (port 5173)
npm run build     # tsc -b (typecheck) then vite build — tsc is the type gate, so build fails on any TS error
npm run preview   # preview the production build
npm run lint      # eslint .
npx tsc -b        # typecheck only (no bundle) — fastest way to validate types
```

No test framework. Env: a gitignored `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, read via `import.meta.env.VITE_*`. `supabaseClient.ts` strips a trailing `/rest/v1/...` from the URL if you pasted a REST endpoint instead of the project URL.

## Architecture

### Where state lives — App is the only hook host
The core data hooks (`useVolunteerAuth`, `useUserInfo`, `useShifts`) are called **once in [App.tsx](src/App.tsx)** and passed down as props. They must **not** be called in route elements: pages like [VolunteerPage.tsx](src/pages/VolunteerPage.tsx) unmount on navigation, which would wipe the session, the in-progress registration form, and shift-browser state. The same reasoning is why shift-browser state (`sortMode`, `expandedJobs`, `expandedDateKeys`, `selectedCalendarDay`) lives in `useShifts`, not in `ShiftBrowser` — it has to survive leaving and re-entering the `/volunteer` route.

### Circular-dependency bridge between the three main hooks
`useVolunteerAuth` owns the auth listener, which must drive `useShifts`/`useUserInfo` (fetch on login, clear on logout). Those hooks in turn need `setErrorMessage` from auth. App breaks the cycle with a mutable `authBridgeRef` (`AuthDataBridge` in [useVolunteerAuth.ts](src/hooks/useVolunteerAuth.ts)) whose methods point at the other hooks' APIs. App fills it in a `useLayoutEffect` that runs before the auth listener's effect can fire, so the bridge is always populated. App also threads `updateShiftSpotsLeft` and `setUserInfo`/`setShifts` between hooks via the same ref pattern.

### Registration & profile creation (RLS-driven)
Profile data is never inserted during registration — with email confirmation on, there's no session yet so RLS would reject the insert. Instead `handleAuthSubmit` sends all profile fields as `auth.signUp({ options: { data: ... } })` (auth `user_metadata`). The `user_info` row is created on the user's **first confirmed login**: `useUserInfo.fetchUserInfo` treats the `PGRST116` "no row" error as a signal to insert a row built from `session.user.user_metadata`. Keep this dance intact — do not add a registration-time `user_info` insert.

### Two parallel signup models (know which one you're touching)
Signup data is stored two ways that are **not joined**:

1. **Volunteer self-service → `user_info.active_shifts`**: a JSON array of human-readable description strings (`"role - time"`), mutated only by `useUserInfo.updateActiveShifts` / `removeActiveShift`, which also decrement/increment the shift's `spots_left`. This is what `VolunteerDashboard`'s sign-up button calls (wired via `onSignUp` in [VolunteerPage.tsx](src/pages/VolunteerPage.tsx)). Matching a stored string back to a `Shift` is done by recomputing `${shift.role} - ${shift.time}` in `removeActiveShift`.
2. **Admin roster management → `signups` table**: relational rows with `status` (`signed_up`/`attended`/`no_show`/`cancelled`), `manual_name` (walk-ins), `notes`. Managed by `useSignups` and rendered by [ShiftRoster.tsx](src/components/volunteer/ShiftRoster.tsx). Because `signups` has no FK to `user_info`, `ShiftRoster` attaches display names/emails by re-querying `user_info` for the user_ids (`withUserInfo`).

When adding a signup-related feature, determine which model it belongs to before writing the query.

### Hours ledger (`hour_entries`) + SECURITY DEFINER RPCs
The hours table is **`hour_entries`**, not `hours`: `user_id, hours, task, reason, status ('pending'|'approved'|'denied'), created_at, decided_at, decided_by`. `useHours` drives two sides:

- **Volunteer** (`VolunteerDashboard`): `requestHours` inserts a `pending` entry.
- **Admin** (`AdminDashboard` Hour Requests tab): approves/denies via the RPCs `approve_hour_request(entry_id)` / `deny_hour_request(entry_id)`. Admins can also change a volunteer's running total directly with `admin_log_hours(target, delta, note)`, which returns the volunteer's new total — `AdminDashboard` writes that returned value straight into the row rather than refetching.

`user_info.hours_volunteered` is the cached running total these RPCs keep in sync. Mutate hours through the RPCs, not by hand-editing `hours_volunteered`.

### All shift times render in Pacific time
`useShifts` exports `PT_TZ = 'America/Los_Angeles'` and formats every `dateLabel` / `timeLabel` / `time` string with `{ timeZone: PT_TZ }`, so all viewers see the same PT times regardless of their own timezone. Keep `timeZone: PT_TZ` on any new date formatting. The admin shift form is labeled "Enter times in Pacific Time (PT)."

### Jobs → shifts hierarchy, and recurring shifts
A **job** is a volunteer opportunity (title, description, requirements, location, min age, password, visible, self-report). A **shift** is a concrete time slot belonging to a job. A shift's display heading/eligibility metadata come from its parent job — the `shifts` table carries only timing + `spots_left` + `job_id` + `recurrence_group` (see schema below).

`useShifts.fetchShifts` selects shifts plus an embedded `jobs(name, min_age, visible, description, requirements)` join and maps each row to a client `Shift` whose `role` is the job's `name` (used for job-view grouping, the card title, and matching a volunteer's stored `active_shifts` strings). The embedded `description`/`requirements` are carried onto the `Shift` as `jobDescription`/`jobRequirements` so the volunteer `ShiftCard` can surface a job's description + requirements without a second query. RLS on `jobs` hides invisible jobs from non-admins, in which case the embed is `null` and the browser filters that shift out via the `hasJob` flag (role falls back to `"General"` rather than erroring). Volunteers therefore need SELECT on `jobs`.

**Recurring shifts** ([AdminJobManager.tsx](src/components/volunteer/AdminJobManager.tsx)): when creating shifts, the admin picks a start date/time and optionally weekdays + repeat-weeks; the form expands that into N date instances and inserts them together. All shifts in a recurring batch share one `recurrence_group` (a `crypto.randomUUID()`), so the batch can be managed together. "Copy last year" duplicates every existing shift forward by one year as a single new recurrence group. Shift times are stored as ISO timestamps via `toISOString()`. When the form expands a date list, `targetDates()` is the source of truth for how many rows an "Add shift(s)" submit will insert.

### Age range, minors, and parent verification
`age_range` (`'14_15'` | `'16_17'` | `'18_plus'`) on `user_info` is the **operational** eligibility field; birthday is optional/cosmetic. Rules live in [ageRange.ts](src/utils/ageRange.ts) (`minAge`, `minor`, `parentLink`, `meetsAgeRequirement` against a job's `min_age`).

- **14–15** volunteers must provide a linked `parent_email`, and — at sign-up time in `updateActiveShifts` — a `parent_account_exists(p_email)` RPC must confirm the parent's volunteer account exists. RLS blocks reading another user's `user_info` row, so this is a SECURITY DEFINER function that returns only a boolean.
- **16–17** may link a parent but can sign up regardless; **18+** has no parent option.

### Admin dashboard tabs (route `/admin`, admin-only via redirect in App)
[AdminDashboard.tsx](src/components/volunteer/AdminDashboard.tsx) is a four-tab shell (`volunteers` | `shifts` | `admins` | `requests`):

- **Volunteers** (default): list/search `user_info`, expand a volunteer for full details + active shifts, remove a shift from their schedule, and adjust hours via `admin_log_hours` (the returned total updates the row in place).
- **Shifts** ("Jobs & Shifts"): [AdminJobManager.tsx](src/components/volunteer/AdminJobManager.tsx) — CRUD on `jobs` (each job's `ShiftRoster` is inlined underneath; `useJobs` powers job CRUD). Deleting a job cascades to its shifts and signups.
- **Manage Admins**: promote/remove admins via the `admins` table **and** manage organizations: add/remove `groups` rows (`useGroups`). `useGroups` is also consumed inside `useVolunteerAuth` to populate the registration org dropdown — one hook, two call sites.
- **Hour Requests**: the pending-hour-approval queue (`useHours.fetchPending`).

### Post-login redirect
After auth resolves (not loading, has session, admin status loaded) App redirects once: admins → `/admin`, everyone else → `/volunteer`. A `redirected` flag (reset on logout) prevents repeat redirects. The `/admin` route element itself also guards: if `!adminLoading && !isAdmin` it `<Navigate to="/">`.

## Database (Supabase)

Tables the code reads/writes (superset groups/newsletters are simpler):
- `auth.users` — Supabase Auth.
- `user_info` — `user_id`, `hours_volunteered`, `active_shifts` (JSON array of strings), `email`, profile fields (`first_name`, `last_name`, `birthday` nullable, `phone_number`, `emergency_contact_*`, `employer`, `street_address`, `city`, `zip_code`, `organization`), `age_range`, `parent_email`.
- `shifts` — `id`, `shift_start` / `shift_end` (timestamps), `spots_left`, `job_id` (FK→jobs), `recurrence_group` (nullable UUID string grouping a recurring batch). `title`/`description`/`requirements`/`location` were dropped from `shifts` — a shift's display heading now comes from its parent `jobs` row. The client `Shift` type carries `password: null` (always null client-side; job passwords stay admin-only) and `minAge`/`jobVisible`/`hasJob` derived from the embedded job.
- `jobs` — `id`, `name`, `description`, `requirements`, `location`, `visible`, `password`, `min_age`, `self_report`, `created_at`. `Shift`s belong to a job; `ON DELETE CASCADE` removes a job's shifts and their signups. **Note the naming split:** the `Job` type keeps DB snake_case (`min_age`, `self_report`), while the mapped client `Shift` type uses camelCase (`minAge`, `jobVisible`).
- `signups` — `id`, `shift_id`, `user_id` (nullable for walk-ins), `manual_name`, `status`, `hours_reported`, `notes`, `created_at`.
- `hour_entries` — `id`, `user_id`, `hours`, `task`, `reason`, `status`, `created_at`, `decided_at`, `decided_by` (see RPCs above).
- `admins` — `id`, `user_id` (presence of a row = admin).
- `groups` — `id`, `name`. Volunteer organizations shown on the pre-auth signup form.
- `newsletters` — `email`, `subscribed_at`, `unsubscribed_at`.

**SECURITY DEFINER RPCs** (the authoritative mutation paths; do not bypass):
- `approve_hour_request(entry_id)`, `deny_hour_request(entry_id)`, `admin_log_hours(target, delta, note)` → returns new total.
- `parent_account_exists(p_email)` → boolean.

**Migrations**: incremental, idempotent SQL run via the Supabase SQL Editor lives in [`supabase/migrations/`](supabase/migrations/). The established pattern is to remove a migration from the repo once it's applied to the live project, so the directory is currently empty in the working tree (0001–0008 have all been applied and removed). Add new schema changes as a new numbered `NNNN_description.sql` file marked "safe to re-run," apply it in the Supabase SQL Editor, then remove it after it's live.

**RLS notes**: the `groups` table is readable by `anon`/`authenticated` (the signup form needs the org list before auth); the `jobs` table must be SELECT-able by `authenticated` so volunteers can see shift titles (now derived from the job name); authenticated users can update their **own** `user_info` row (`user_info_own_update`) — `useUserInfo.updateProfile` throws if the policy is missing and 0 rows come back. Most other writes are admin-only.

## Conventions for extending

- **New page**: add under [src/pages/](src/pages/), add a `<Route>` in [App.tsx](src/App.tsx).
- **New `user_info` field**: add to the `UserInfo` interface in [userInfo.ts](src/types/userInfo.ts), to the `select` + insert-from-metadata row in `useUserInfo.fetchUserInfo` (PGRST116 branch), to the `updateProfile` editable list, and to the `user_metadata` sent in `handleAuthSubmit` (so the first-login insert picks it up). Also surface it in the admin volunteer detail grid in `AdminDashboard` if admins should see it.
- **New `shifts` column**: add to the `select` in `useShifts.fetchShifts`, the client `Shift` interface/mapping in [shift.ts](src/types/shift.ts), and the admin create form's `buildRow` / recurring expansion in `AdminJobManager`.
- **New `jobs` column**: add to the `Job` type, `useJobs`'s `createJob`/`updateJob` field lists, and the `AdminJobManager` form (`blankJobForm` + the edit/`startEdit` mapping).
- **New table/RPC**: follow the existing Supabase patterns in the relevant hook (`supabase.from('…')` / `supabase.rpc('…')`), add an idempotent migration, apply it in the SQL Editor, and add the table to the schema list above.
