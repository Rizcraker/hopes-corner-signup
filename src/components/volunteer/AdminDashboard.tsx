import type { Shift } from '../../types/shift'
import ShiftBrowser from '../shifts/ShiftBrowser'
import { supabase } from '../../lib/supabaseClient'
import { useState, useEffect } from 'react'

interface AdminDashboardProps {
  getUserName: () => string
  shifts: Shift[]
  loading: boolean
  errorMessage: string | null
  onRefresh: () => void
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
  onSignUp: (shift: Shift) => Promise<void>
  // Admin-specific functions
  refreshAdminStats?: () => void
  refreshUsers?: () => void
}

function AdminDashboard({
  getUserName,
  onSignUp,
  ...browser
}: AdminDashboardProps) {
  const [volunteers, setVolunteers] = useState<any[]>([])
  const [volunteersLoading, setVolunteersLoading] = useState(false)
  const [lastClickTime, setLastClickTime] = useState<string | null>(null)

  const handleClickVolunteers = async () => {
    setLastClickTime(new Date().toLocaleTimeString())
    await fetchVolunteers()
  } 

  const fetchVolunteers = async () => {
    setVolunteersLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_info')
        .select('*')
        .order('hours_volunteered', { ascending: false })
      if (error) throw error
      console.log('Fetched volunteers:', data)
      alert('Successfully loaded ' + data.length + ' volunteers')
      setVolunteers(data)
    } catch (err) {
      console.error('Error fetching volunteers:', err)
      alert('Failed to load volunteers: ' + err)
    } finally {
      setVolunteersLoading(false)
    }
  }

  // Fetch volunteers on mount
  useEffect(() => {
    fetchVolunteers()
  }, [])

  return (
    <div className="dashboard-container">
      <div className="welcome-banner">
        <div style={{ flex: 1, minWidth: '260px' }}>
          <h3>Admin Dashboard - {getUserName()}</h3>
          <p>Welcome back! You have full administrative access to Hope's Corner's volunteer management system.</p>

          {/* Admin-only statistics */}
          <div className="admin-stats">
            <h4>Administrative Overview</h4>
            <div className="dash-stats-row">
              <div className="stat-card">
                <span className="stat-value">{volunteers.length}</span>
                <span className="stat-label">Registered Volunteers</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">--</span>
                <span className="stat-label">Active Shifts</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">--</span>
                <span className="stat-label">Admins</span>
              </div>
            </div>
          </div>

          {/* Admin management sections */}
          <div className="admin-management">
            <h4>Management Actions</h4>
            <div className="admin-actions">
              <button onClick={browser.refreshAdminStats} className="btn-primary" disabled={browser.loading || browser.isRefreshSpinning}>
                {browser.isRefreshSpinning ? 'Refreshing...' : 'Refresh Statistics'}
              </button>
              <button onClick={handleClickVolunteers} className="btn-secondary" disabled={volunteersLoading}>
                {volunteersLoading ? 'Loading...' : 'View All Volunteers'}
              </button>
              <button className="btn-secondary">
                Manage Shifts
              </button>
              <button className="btn-secondary">
                Manage Admins
              </button>
            </div>
          </div>

          {/* Volunteer list */}
          {volunteers.length > 0 && (
            <div className="volunteer-list">
              <h4>Volunteers ({volunteers.length})</h4>
              <div className="volunteer-table">
                <div className="volunteer-header">
                  <div className="vol-col name">Name</div>
                  <div className="vol-col email">Email</div>
                  <div className="vol-col hours">Hours</div>
                  <div className="vol-col shifts">Active Shifts</div>
                </div>
                {volunteers.map(v => (
                  <div key={v.user_id} className="volunteer-row">
                    <div className="vol-col name">
                      {v.first_name ?? ''} {v.last_name ?? ''}
                    </div>
                    <div className="vol-col email">{v.email ?? ''}</div>
                    <div className="vol-col hours">{v.hours_volunteered ?? 0}</div>
                    <div className="vol-col shifts">
                      {(v.active_shifts as string[] ?? []).length}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick admin stats cards */}
          <div className="quick-stats-grid">
            <div className="quick-stat-card">
              <h5>Total Registered Users</h5>
              <p className="stat-number">{volunteers.length}</p>
            </div>
            <div className="quick-stat-card">
              <h5>Hours Volunteered</h5>
              <p className="stat-number">--</p>
            </div>
            <div className="quick-stat-card">
              <h5>Upcoming Shifts</h5>
              <p className="stat-number">--</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin control panel info box */}
      <div className="admin-info-box">
        <h3>Admin Control Panel</h3>
        <p>Welcome to the secure admin dashboard. This area provides comprehensive management tools for Hope's Corner's volunteer operations.</p>
        <p className="admin-info-highlight">🔐 All administrative actions are logged and monitored for security purposes.</p>
        <div className="admin-info-grid">
          <div className="admin-info-item">
            <h5>📊 Volunteer Management</h5>
            <p>View, edit, or remove volunteer profiles and shift assignments</p>
          </div>
          <div className="admin-info-item">
            <h5>📅 Shift Administration</h5>
            <p>Create, edit, or delete volunteer shift opportunities</p>
          </div>
          <div className="admin-info-item">
            <h5>👥 User Administration</h5>
            <p>Manage admin permissions and access levels</p>
          </div>
          <div className="admin-info-item">
            <h5>📈 Reporting</h5>
            <p>Access comprehensive volunteer statistics and analytics</p>
          </div>
        </div>
      </div>

      {/* Full Shift Browser for Admins */}
      <div className="admin-shift-browser">
        <h3>Volunteer Shift Management</h3>
        <ShiftBrowser {...browser} onSignUp={onSignUp} />
      </div>
    </div>
  )
}

export default AdminDashboard