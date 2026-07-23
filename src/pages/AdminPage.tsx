import type { Shift } from '../types/shift'
import AdminDashboard from '../components/volunteer/AdminDashboard'

interface AdminPageProps {
  getUserName: () => string
  shiftsApi: {
    shifts: Shift[]
    setShifts: (shifts: Shift[]) => void
    loading: boolean
    fetchShifts: () => Promise<void>
    handleRefreshShifts: () => void
    isRefreshSpinning: boolean
    sortMode: 'job' | 'date' | 'calendar'
    setSortMode: (mode: 'job' | 'date' | 'calendar') => void
    expandedJobs: Set<string>
    toggleJobGroup: (role: string) => void
    expandedDateKeys: Set<string>
    toggleDateEntry: (key: string) => void
    selectedCalendarDay: string | null
    setSelectedCalendarDay: (day: string | null) => void
    shiftsByJob: Record<string, Shift[]>
    jobGroupNames: string[]
    shiftsByDate: Shift[]
    shiftsByMonth: Record<string, Shift[]>
  }
}

function AdminPage({
  getUserName,
  shiftsApi,
}: AdminPageProps) {
  return (
    <AdminDashboard
      getUserName={getUserName}
      shifts={shiftsApi.shifts}
      loading={shiftsApi.loading}
      errorMessage={null}
      onRefresh={shiftsApi.handleRefreshShifts}
      isRefreshSpinning={shiftsApi.isRefreshSpinning}
      sortMode={shiftsApi.sortMode}
      setSortMode={shiftsApi.setSortMode}
      expandedJobs={shiftsApi.expandedJobs}
      toggleJobGroup={shiftsApi.toggleJobGroup}
      expandedDateKeys={shiftsApi.expandedDateKeys}
      toggleDateEntry={shiftsApi.toggleDateEntry}
      selectedCalendarDay={shiftsApi.selectedCalendarDay}
      setSelectedCalendarDay={shiftsApi.setSelectedCalendarDay}
      shiftsByJob={shiftsApi.shiftsByJob}
      jobGroupNames={shiftsApi.jobGroupNames}
      shiftsByDate={shiftsApi.shiftsByDate}
      shiftsByMonth={shiftsApi.shiftsByMonth}
      refreshAdminStats={() => {
        // Add admin-specific refresh function here
        console.log('Refreshing admin stats...')
      }}
      refreshUsers={() => {
        // Add admin-specific refresh function here
        console.log('Refreshing user list...')
      }}
      onSignUp={async (_shift) => {
        // Admin doesn't need this, it's for regular volunteers
      }}
    />
  )
}

export default AdminPage
