# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Volunteer shift management web application for Hope's Corner, built with React 19, TypeScript, Vite, and Supabase. Features include:
- User authentication (sign up with profile fields, sign in, sign out)
- Volunteer shift browsing and claiming via a custom UI
- User profile management (hours volunteered, active shifts, contact info)
- Developer bypass mode for testing without authentication
- Multi-page navigation with React Router
- Two-step registration flow with email verification

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

## Environment Setup

The application requires the following environment variables in `.env`:

- `VITE_SUPABASE_URL`: Supabase project URL (code strips `/rest/v1/*` path)
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymized public key

**Do not commit actual credentials** - the `.env` file is in `.gitignore`.

## High-Level Architecture

### Core Patterns

**1. Hook Circular Dependency Resolution**
The three main hooks (`useVolunteerAuth`, `useUserInfo`, `useShifts`) use a ref-based bridge pattern to avoid circular dependencies. The bridge is populated during render and accessed by effects and handlers:

```typescript
const dataBridge = useRef<AuthDataBridge>({
  fetchShifts: async () => {},
  fetchUserInfo: async () => {},
  clearShifts: () => {},
  clearUserInfo: () => {},
})

useLayoutEffect(() => {
  dataBridge.current = {
    fetchShifts: shiftsApi.fetchShifts,
    fetchUserInfo: userInfoApi.fetchUserInfo,
    // ...
  }
})
```

This runs before the auth listener subscribes, ensuring the bridge is always populated.

**2. Registration Flow**
- Step 1: Email/password + profile fields display
- Step 2: Final sign up with profile data sent in `auth.signUp()` options
- User_info row is NOT created during registration (RLS rejects it before email confirmation)
- Row is created on first confirmed login via `useUserInfo.fetchUserInfo()` when auth row doesn't exist

**3. Developer Bypass Mode**
When `isBypassActive` is true:
- Sample shifts are generated instead of fetching from Supabase
- User profile is mocked locally instead of database operations
- Useful for UI/UX testing without requiring authentication

### Data Flow

1. **App.tsx** orchestrates all hooks and provides them as props to pages
2. **useVolunteerAuth** manages authentication state, registration, sign-out, and profile fields
3. **useUserInfo** fetches/updates user profile in `user_info` table; auto-creates row from auth metadata if missing
4. **useShifts** fetches shifts from `shifts` table; provides grouping, sorting, and filtering utilities

### Component Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx          # Top navigation with tabs
│   │   ├── Footer.tsx          # Page footer
│   │   └── BadgesRow.tsx       # Conditional badges (Home/Donate only)
│   ├── shift/
│   │   ├── ShiftBrowser.tsx    # Main shift browsing UI
│   │   └── ShiftCard.tsx       # Individual shift card
│   └── volunteer/
│       ├── AuthPanel.tsx       # Sign in/up forms
│       └── VolunteerDashboard.tsx  # User's active shifts display
├── hooks/
│   ├── useVolunteerAuth.ts     # Auth + registration logic
│   ├── useUserInfo.ts          # User profile CRUD
│   └── useShifts.ts            # Shift data + browser state
├── pages/
│   ├── HomePage.tsx
│   ├── DonatePage.tsx
│   ├── VolunteerPage.tsx
│   ├── LearnPage.tsx
│   ├── AboutPage.tsx
│   ├── CommunityPage.tsx
│   ├── NewsPage.tsx
│   └── ContactPage.tsx
├── lib/
│   └── supabaseClient.ts       # Supabase client initialization
├── types/
│   ├── shift.ts
│   └── userInfo.ts
└── utils/
    └── shiftUtils.ts
```

### Supabase Tables

- `auth.users`: Managed by Supabase Auth
- `public.user_info`: User profiles with `user_id` foreign key, `hours_volunteered`, `active_shifts` (JSON array), and profile fields
- `public.shifts`: Shift listings with `title`, `shift_start`, `shift_end`, `spots_left`, `location`, `description`, `requirements`
- `public.admins`: Admin users with `id` (unique uuid) and `user_id` (references the user's identifier in other tables)

### Key Implementation Details

**Shift Browser State Management**
- `sortMode` ('job' | 'date' | 'calendar'): Controls grouping/sorting
- `expandedJobs` / `expandedDateKeys`: Accordion state persists across route unmounts
- `shiftsByJob`, `shiftsByDate`, `shiftsByMonth`: Computed groupings using `useMemo`

**Date Handling**
- Shifts use JavaScript `Date` objects internally
- Date formatting utilities convert Supabase ISO timestamps to localized strings
- Sample shifts in bypass mode use `getOrdinalDay()` for "3rd", "15th" formatting

**Profile Fields**
Profile fields are stored in `user_info` table, but registration sends them to `auth.user_metadata` to work around RLS restrictions before email confirmation.

## Adding New Features

### New Page
1. Add component in `src/pages/`
2. Add route in `App.tsx` under `<Routes>`:
   ```tsx
   <Route path="/newpage" element={<NewPage />} />
   ```

### New Data Fields
1. Add field to `UserInfo` interface in `src/types/userInfo.ts`
2. Add to `useUserInfo` state and Supabase queries
3. Update profile form in `useVolunteerAuth` registration fields

### Database Changes
- For new tables, follow existing Supabase patterns in `useShifts` and `useUserInfo`
- Use `supabase.from('table_name')` for CRUD operations
- Handle RLS policies before committing to production

## Styling
- Uses CSS modules/App.css and inline styles
- Follow existing patterns in `App.css` and component inline styles
- Responsive tab-based interface with conditional rendering for badges/footer

## Testing
No testing framework configured. To add:
```bash
npm install --save-dev vitest @vitest/react @testing-library/react @testing-library/jest-dom
```
Add test script to package.json: `"test": "vitest"`
