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
- Admin capabilities including managing shifts, volunteers, and other admins

## Tech Stack

- **Framework**: React 19 with React Router DOM v7
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: CSS Modules and inline styles (see `App.css` and component inline styles)
- **Backend**: Supabase (authentication, database, storage)
- **State Management**: Custom React hooks (`useVolunteerAuth`, `useUserInfo`, `useShifts`)
- **HTTP Client**: Supabase JS client (`@supabase/supabase-js`)

## Directory Structure

```
src/
├── components/
│   ├── layout/           # Shared layout components (Navbar, Footer, BadgesRow)
│   ├── shift/            # Shift-related components (ShiftBrowser, ShiftCard)
│   └── volunteer/        # Volunteer-related components (AuthPanel, VolunteerDashboard, AdminDashboard)
├── hooks/                # Custom React hooks for data and state management
├── lib/                  # Supabase client initialization
├── pages/                # Page components routed via React Router
├── types/                # TypeScript interfaces (shift.ts, userInfo.ts)
└── utils/                # Utility functions (shiftUtils.ts)
```

## Key Architectural Patterns

### 1. Hook Circular Dependency Resolution
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

### 2. Registration Flow
- **Step 1**: Email/password + profile fields displayed
- **Step 2**: Final sign up with profile data sent in `auth.signUp()` options
- The `user_info` row is **NOT** created during registration (RLS rejects it before email confirmation)
- Row is created on first confirmed login via `useUserInfo.fetchUserInfo()` when auth row doesn't exist

### 3. Developer Bypass Mode
When `isBypassActive` is true:
- Sample shifts are generated instead of fetching from Supabase
- User profile is mocked locally instead of database operations
- Useful for UI/UX testing without requiring authentication

### 4. Data Flow
1. **App.tsx** orchestrates all hooks and provides them as props to pages
2. **useVolunteerAuth** manages authentication state, registration, sign-out, and profile fields
3. **useUserInfo** fetches/updates user profile in `user_info` table; auto-creates row from auth metadata if missing
4. **useShifts** fetches shifts from `shifts` table; provides grouping, sorting, and filtering utilities

### 5. Shift Browser State Management
- `sortMode` ('job' | 'date' | 'calendar'): Controls grouping/sorting
- `expandedJobs` / `expandedDateKeys`: Accordion state persists across route unmounts
- `shiftsByJob`, `shiftsByDate`, `shiftsByMonth`: Computed groupings using `useMemo`

### 6. Date Handling
- Shifts use JavaScript `Date` objects internally
- Date formatting utilities convert Supabase ISO timestamps to localized strings
- Sample shifts in bypass mode use `getOrdinalDay()` for "3rd", "15th" formatting

### 7. Profile Fields
Profile fields are stored in `user_info` table, but registration sends them to `auth.user_metadata` to work around RLS restrictions before email confirmation.

### 8. Admin Features
Admins have access to an admin dashboard (`/admin`) with a tabbed interface where they can:
- **Volunteers Tab** (default): View volunteer statistics and lists (name, email from user_info table, age calculated from birthday), search for volunteers by name or email, click on any volunteer to expand/collapse detailed information including all registration fields, hours volunteered, and upcoming shifts, and remove individual shifts from volunteers' schedules
- **Shifts Tab**: Create, edit, and delete shifts via the AdminShiftManager component
- **Admin Management**: Promote volunteers to admin status and remove admin privileges
- All admin actions are logged and monitored for security

## Common Commands

All commands are run from the project root (`volunteer-shift-manager`).

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Lint code with ESLint
npm run lint
```

### Environment Setup
Create a `.env` file in the project root with:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
**Do not commit actual credentials** - the `.env` file is in `.gitignore`.

## Database Schema (Supabase)

### Tables
- `auth.users`: Managed by Supabase Auth
- `public.user_info`: User profiles with:
  - `user_id` (foreign key to auth.users)
  - `hours_volunteered` (number)
  - `active_shifts` (JSON array of shift IDs)
  - `email` (string)
  - Profile fields (first_name, last_name, birthday, phone_number, etc.)
- `public.shifts`: Shift listings with:
  - `title` (text)
  - `shift_start` (timestamp)
  - `shift_end` (timestamp)
  - `spots_left` (integer)
  - `location` (text)
  - `description` (text)
  - `requirements` (text)
- `public.admins`: Admin users with:
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)

## Styling
- Uses CSS modules (`App.css`) and inline styles
- Follow existing patterns in `App.css` and component inline styles
- Responsive tab-based interface with conditional rendering for badges/footer

## Testing
No testing framework is currently configured. To add tests:
```bash
npm install --save-dev vitest @vitest/react @testing-library/react @testing-library/jest-dom
```
Add test script to package.json: `"test": "vitest"`

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

## Important Notes
- The Supabase client is initialized in `src/lib/supabaseClient.ts`
- Environment variables are accessed via `import.meta.env.VITE_*` (Vite convention)
- Authentication state is managed via Supabase auth helpers and custom hooks
- Developer bypass mode is toggled via `isBypassActive` state in `useVolunteerAuth`
- Admin functionality includes managing other admins through the AdminDashboard component