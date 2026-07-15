import type { Shift } from '../../types/shift'
import type { UserInfo } from '../../types/userInfo'
import ShiftBrowser from '../shifts/ShiftBrowser'

interface VolunteerDashboardProps {
  getUserName: () => string
  userInfo: UserInfo | null
  removeActiveShift: (shiftDescription: string) => Promise<void>
  handleSignOut: () => Promise<void>
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
}

function VolunteerDashboard({
  getUserName,
  userInfo,
  removeActiveShift,
  handleSignOut,
  ...browser
}: VolunteerDashboardProps) {
  return (
    <div className="dashboard-container">
      <div className="welcome-banner">
        <div style={{ flex: 1, minWidth: '260px' }}>
          <h3>Welcome back, {getUserName()}!</h3>
          <p>Thank you for contributing your time and energy to Hope's Corner.</p>

          {/* Database metric stats display */}
          {userInfo && (
            <div className="user-db-stats">
              <div className="dash-stats-row">
                <div className="stat-card">
                  <span className="stat-value">{userInfo.hours_volunteered}</span>
                  <span className="stat-label">Hours Volunteered</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{userInfo.active_shifts.length}</span>
                  <span className="stat-label">Upcoming Shifts</span>
                </div>
              </div>
              {userInfo.active_shifts.length > 0 && (
                <div className="active-shifts-list">
                  <h4>Your Active Scheduled Shifts:</h4>
                  <ul>
                    {userInfo.active_shifts.map((shift, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <span>✅ {shift}</span>
                        <button
                          onClick={() => removeActiveShift(shift)}
                          className="trash-btn"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#c0392b',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            padding: '0',
                            lineHeight: 1
                          }}
                          title="Remove shift"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={handleSignOut} className="btn-secondary logout-btn">Log Out</button>
      </div>

      {/* Volunteer opportunities info box — sits right above the shift browser */}
      <div className="volunteer-info-box">
        <p className="info-line info-brand">Hope's Corner</p>
        <p className="info-line info-brand">2026 Volunteer Opportunities</p>
        <p className="info-line">January 1st – December 31st, 2026</p>
        <p className="info-line">748 Mercy St.</p>
        <p className="info-line info-thankyou">
          Thank you for signing up to volunteer with Hope's Corner. We're almost entirely volunteer-run, we literally can't do this without you!
        </p>
        <div className="info-age-requirements">
          <p className="info-age-title">Age Requirements:</p>
          <ul>
            <li><strong>14–15 (with chaperone, both must sign up):</strong> RV Delivery, Clothing &amp; Supplies Organizing</li>
            <li><strong>16+:</strong> Breakfast Service, Program Assistant (Shower/Laundry), RV Kitchen Assistant, Friday Prep, Bicycle Program</li>
            <li><strong>18+:</strong> Kitchen Assistant, Community Engagement</li>
          </ul>
        </div>
      </div>

      <ShiftBrowser {...browser} />
    </div>
  )
}

export default VolunteerDashboard
