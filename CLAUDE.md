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

## Development Workflow

1. **Start development**: `npm run dev` - serves at http://localhost:5173
2. **Type checking**: `npx tsc -b` - fastest way to validate types without building
3. **Linting**: `npm run lint` - runs ESLint on all files
4. **Production build**: `npm run build` - typechecks then builds for production
5. **Preview build**: `npm run preview` - serves the production build locally

## Environment Setup

- Copy `.env.example` to `.env` and fill in Supabase credentials
- Required environment variables:
  - `VITE_SUPABASE_URL`: Your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon/public key
  - Optional: `RESEND_KEY` for email functionality (see EMAIL_SETUP.md)

## Supabase Specifics

### Row Level Security (RLS)
- Most tables have RLS policies enabled
- Authenticated users can only read/update their own `user_info` unless policies specify otherwise
- Admin-only operations typically check the `admins` table or use `is_admin()` helper function
- When writing queries, always consider RLS implications

### Security Definer RPCs
Use these authorized mutation paths instead of direct table writes:
- `approve_hour_request(entry_id)` / `deny_hour_request(entry_id)` - for hour request approvals
- `admin_log_hours(target, delta, note)` - adjust volunteer hours (returns new total)
- `parent_account_exists(p_email)` - verify parent account exists for minor volunteers

### Migrations
- Located in `supabase/migrations/`
- Pattern: Remove migration files from repo after applying to live project
- New migrations: Create `NNNN_description.sql`, apply via Supabase SQL Editor, then remove after deployment
- Always make migrations idempotent/safe to re-run

### Edge Functions
- Email functionality uses `send-email` Edge Function
- Deploys via: `supabase functions deploy send-email`
- Requires `RESEND_API_KEY` secret set in Supabase
- Only admins can invoke (checked via `admins` table)

## Architecture Details

### State Management
- Core data hooks (`useVolunteerAuth`, `useUserInfo`, `useShifts`) called once in `App.tsx`
- Props passed down to avoid state loss on route changes
- Browser state (sorting, expanded sections) lives in hooks, not components
- Circular dependency broken via `authBridgeRef` in `useVolunteerAuth.ts`

### Data Models
Two parallel signup systems:
1. **Volunteer self-service**: `user_info.active_shifts` (JSON array of "role - time" strings)
2. **Admin roster management**: `signups` table (relational with status tracking)

Hours tracking:
- Table: `hour_entries` (not `hours`)
- Status: `pending`|`approved`|`denied`
- Cached total in `user_info.hours_volunteered` kept in sync via RPCs

Timezone:
- All times displayed in Pacific Time (`America/Los_Angeles`)
- Use `PT_TZ = 'America/Los_Angeles'` constant from `useShifts.ts`
- Always include `{ timeZone: PT_TZ }` in date formatting

### Component Organization
- Pages: `src/pages/` (VolunteerPage.tsx, AdminDashboard.tsx, etc.)
- Components: `src/components/` (split by feature: volunteer/, admin/, shared/)
- Hooks: `src/hooks/` (custom React hooks for data fetching/mutation)
- Types: `src/types/` (TypeScript interfaces)
- Utils: `src/utils/` (helper functions like ageRange.ts, dateUtils.ts)

## Conventions for Extending

### Adding Features
- **New page**: Create in `src/pages/`, add route in `App.tsx`
- **New `user_info` field**: 
  - Add to `UserInfo` interface in `userInfo.ts`
  - Update `select` in `useUserInfo.fetchUserInfo`
  - Add to editable fields in `updateProfile`
  - Include in `user_metadata` in `handleAuthSubmit`
  - Surface in admin volunteer detail grid if needed
- **New `shifts` column**: 
  - Add to `select` in `useShifts.fetchShifts`
  - Update `Shift` interface in `shift.ts`
  - Modify admin form in `AdminJobManager`
- **New `jobs` column**:
  - Add to `Job` type
  - Update `useJobs.createJob`/`updateJob` field lists
  - Modify `AdminJobManager` form
- **New table/RPC**: 
  - Follow existing patterns in relevant hooks
  - Add idempotent migration
  - Apply in Supabase SQL Editor
  - Document in this file

### TypeScript Guidelines
- Strict mode enabled: `noUnusedLocals`, `noUnusedParameters`
- Use `verbatimModuleSyntax`: `import type` for type-only imports
- Prefer interfaces over types for object shapes
- Export types from `src/types/` for reuse
- Use `as const` for literal objects when needed
- Avoid `any`; use `unknown` with type guards when necessary

## Debugging Tips

### Supabase Connections
- Check network tab for failed requests
- Console logs show Supabase errors when available
- Test RPCs directly in Supabase SQL Editor
- Verify RLS policies aren't blocking expected access

### Common Issues
- **"PGRST116"**: No row returned - expected in `fetchUserInfo` for new users
- **Auth listener timing**: State initialized in `useLayoutEffect` before auth effects
- **Timezone confusion**: All internal times stored as UTC, displayed as PT
- **Null job references**: Handle `hasJob` flag when RLS hides jobs from non-admins

### Performance
- Memoize expensive computations with `useMemo`/`useCallback`
- Lazy load routes/components when appropriate
- Supabase client is singleton - reuse across hooks
- Consider pagination for large lists (volunteers, shifts)

## Testing Approach

While there's no dedicated test framework:
- Manual testing via `npm run dev` is primary validation
- TypeScript compiler catches many errors at build time
- ESLint helps maintain code quality
- Test edge cases in browser console when authenticated
- Use Supabase dashboard to verify data changes

## Related Documentation

- See `docs/EMAIL_SETUP.md` for email system configuration
- Check individual component files for implementation details
- Review Supabase dashboard for table schemas and actual data
- Migration history shows evolution of database schema
