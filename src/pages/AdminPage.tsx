import type { Shift } from '../types/shift'
import type { UserInfo } from '../types/userInfo'
import AdminDashboard from '../components/volunteer/AdminDashboard'
import { useEffect } from 'react'

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
    addHoursVolunteered: (userId: string, hours: number) => Promise<void>
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

  // Ensure shifts are fetched when entering the admin page
  useEffect(() => {
    // Fetch shifts if none are present
    if (!shiftsApi.shifts || shiftsApi.shifts.length === 0) {
      void shiftsApi.fetchShifts()
    }
  }, [shiftsApi.shifts.length, shiftsApi.fetchShifts])

  return (
    <AdminDashboard
      getUserName={getUserName}
      onSignUp={async (_shift) => {
        // Admin doesn't need this, it's for regular volunteers
      }}
      removeActiveShift={userInfoApi.removeActiveShift}
      updateActiveShifts={userInfoApi.updateActiveShifts}
      refreshData={refreshData}
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
      fetchShifts={shiftsApi.fetchShifts}
      refreshAdminStats={() => {
        // Add admin-specific refresh function here
        console.log('Refreshing admin stats...')
      }}
      refreshUsers={() => {
        // Add admin-specific refresh function here
        console.log('Refreshing user list...')
      }}
      addHoursVolunteered={(userId, hours) => userInfoApi.addHoursVolunteered(userId, hours)}
    />
  )
}

export default AdminPage
