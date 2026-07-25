import type { Shift } from '../types/shift'
import type { UserInfo } from '../types/userInfo'
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
  userInfoApi: {
    userInfo: UserInfo | null
    setUserInfo: React.Dispatch<React.SetStateAction<UserInfo | null>>
    fetchUserInfo: (session: any) => Promise<void>
    updateActiveShifts: (shift: Shift) => Promise<void>
    removeActiveShift: (shiftDescription: string) => Promise<void>
    clearUserInfo: () => void
  }
}

function AdminPage({
  getUserName,
  shiftsApi,
  userInfoApi,
}: AdminPageProps) {
  const refreshData = async () => {
    // This would ideally trigger a refresh in the child component
    // For now, we'll just log - in a more complex implementation,
    // this could trigger a refetch or state update
    console.log('Refreshing data...')
  }

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
      removeActiveShift={userInfoApi.removeActiveShift}
      refreshData={refreshData}
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
