import type { Shift } from '../../types/shift'
import type { UserInfo } from '../../types/userInfo'
import AdminJobManager from './AdminJobManager'
import { supabase } from '../../lib/supabaseClient'
import { useState, useEffect, useImperativeHandle, useRef, forwardRef, useMemo } from 'react'

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
  removeActiveShift: (shiftDescription: string) => Promise<void>
  refreshData: () => void
  refreshAdminStats?: () => void
  refreshUsers?: () => void
}

function AdminDashboard({
  getUserName,
  onSignUp,
  removeActiveShift,
  refreshData,
  ...browser
}: AdminDashboardProps) {
  const [volunteers, setVolunteers] = useState<UserInfo[]>([])
  const [volunteersLoading, setVolunteersLoading] = useState(false)
  const [admins, setAdmins] = useState<Array<{id: string, user_id: string}>>([])
  const [adminsLoading, setAdminsLoading] = useState(true)
  const [expandedVolunteerId, setExpandedVolunteerId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'volunteers' | 'shifts' | 'stats'>('volunteers')

  // Create filtered volunteers based on search term
  const filteredVolunteers = useMemo(() => {
    if (!searchTerm.trim()) return volunteers
    const term = searchTerm.toLowerCase().trim()
    return volunteers.filter(v =>
      (v.first_name?.toLowerCase().includes(term) ||
       v.last_name?.toLowerCase().includes(term) ||
       v.email?.toLowerCase().includes(term))
    )
  }, [volunteers, searchTerm])

  const handleClickVolunteers = async () => {
    await fetchVolunteers()
    await fetchAdmins()
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
      setVolunteers(data)
    } catch (err) {
      console.error('Error fetching volunteers:', err)
      alert('Failed to load volunteers: ' + err)
    } finally {
      setVolunteersLoading(false)
    }
  }

  const fetchAdmins = async () => {
    setAdminsLoading(true)
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id, user_id')
      if (error) throw error
      console.log('Fetched admins:', data)
      setAdmins(data)
    } catch (err) {
      console.error('Error fetching admins:', err)
      alert('Failed to load admins: ' + err)
    } finally {
      setAdminsLoading(false)
    }
  }

  const makeAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('admins')
        .insert({ user_id: userId })
      if (error) throw error
      await fetchAdmins()
      alert('User is now an admin')
    } catch (err) {
      console.error('Error making admin:', err)
      alert('Failed to make admin: ' + err)
    }
  }

  const removeAdmin = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove admin privileges from this user?')) {
      return
    }
    try {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('user_id', userId)
      if (error) throw error
      await fetchAdmins()
      alert('Admin privileges removed')
    } catch (err) {
      console.error('Error removing admin:', err)
      alert('Failed to remove admin: ' + err)
    }
  }

  // Fetch volunteers and admins on mount
  useEffect(() => {
    fetchVolunteers()
    fetchAdmins()
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
                <span className="stat-value">{admins.length}</span>
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
              <button onClick={() => {
                  setActiveTab('volunteers');
                  handleClickVolunteers();
              }} className="btn-secondary" disabled={volunteersLoading || adminsLoading}>
                {volunteersLoading || adminsLoading ? 'Loading...' : 'View All Volunteers'}
              </button>
              <button className="btn-secondary" onClick={() => setActiveTab('shifts')}>
                Manage Jobs &amp; Shifts
              </button>
              <button className="btn-secondary">
                Manage Admins
              </button>
            </div>
          </div>

          {/* Volunteer list with admin actions - shown when volunteers tab is active */}
          {activeTab === 'volunteers' && (
            <div className="volunteer-section">
              {/* Search volunteers */}
              <div className="admin-search">
                <input
                  type="text"
                  placeholder="Search volunteers by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ marginTop: '1rem', padding: '0.5rem', width: '100%', maxWidth: '300px' }}
                />
              </div>
              {filteredVolunteers.length > 0 && (
                <div className="volunteer-list">
                  <h4>Volunteers ({filteredVolunteers.length})</h4>
                  <div className="volunteer-table">
                    <div className="volunteer-header">
                      <div className="vol-col name">Name</div>
                      <div className="vol-col email">Email</div>
                      <div className="vol-col age">Age</div>
                      <div className="vol-col action">Admin Actions</div>
                    </div>
                    {filteredVolunteers.map(v => {
                      const isAdmin = admins.some(a => a.user_id === v.user_id)
                      // calculate age from birthday
                      let ageDisplay: string | number = 'N/A'
                      if (v.birthday) {
                        const birth = new Date(v.birthday)
                        const today = new Date()
                        let age = today.getFullYear() - birth.getFullYear()
                        const m = today.getMonth() - birth.getMonth()
                        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                          age--
                        }
                        ageDisplay = age
                      }
                      const isExpanded = expandedVolunteerId === v.user_id
                      return (
                        <>
                          <div
                            key={v.user_id}
                            className="volunteer-row"
                            onClick={() => setExpandedVolunteerId(isExpanded ? null : v.user_id)}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div className="vol-col name">
                              {v.first_name ?? ''} {v.last_name ?? ''}
                            </div>
                            <div className="vol-col email">{v.email ?? ''}</div>
                            <div className="vol-col age">{ageDisplay}</div>
                            <div className="vol-col action">
                              {isAdmin ? (
                                <button onClick={() => removeAdmin(v.user_id)} className="btn-danger">
                                  Remove Admin
                                </button>
                              ) : (
                                <button onClick={() => makeAdmin(v.user_id)} className="btn-primary">
                                  Make Admin
                                </button>
                              )}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="volunteer-details" style={{
                              padding: '1rem',
                              backgroundColor: '#f9f9f9',
                              borderTop: '1px solid #eee',
                              margin: '0 -1rem',
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                                <div>
                                  <strong>First Name:</strong> {v.first_name ?? ''}
                                </div>
                                <div>
                                  <strong>Last Name:</strong> {v.last_name ?? ''}
                                </div>
                                <div>
                                  <strong>Email:</strong> {v.email ?? ''}
                                </div>
                                <div>
                                  <strong>Birthday:</strong> {v.birthday ? new Date(v.birthday).toLocaleDateString() : 'N/A'}
                                </div>
                                <div>
                                  <strong>Phone Number:</strong> {v.phone_number ?? ''}
                                </div>
                                <div>
                                  <strong>Emergency Contact Name:</strong> {v.emergency_contact_name ?? ''}
                                </div>
                                <div>
                                  <strong>Emergency Contact Phone:</strong> {v.emergency_contact_phone ?? ''}
                                </div>
                                <div>
                                  <strong>Employer:</strong> {v.employer ?? ''}
                                </div>
                                <div>
                                  <strong>Street Address:</strong> {v.street_address ?? ''}
                                </div>
                                <div>
                                  <strong>City:</strong> {v.city ?? ''}
                                </div>
                                <div>
                                  <strong>ZIP Code:</strong> {v.zip_code ?? ''}
                                </div>
                                <div>
                                  <strong>Organization:</strong> {v.organization ?? ''}
                                </div>
                                <div>
                                  <strong>Hours Volunteered:</strong> {v.hours_volunteered}
                                </div>
                                <div>
                                  <strong>Upcoming Shifts:</strong>
                                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
                                    {v.active_shifts?.map((shift, idx) => (
                                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{shift}</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation(); // Prevent triggering the row click
                                            removeActiveShift(shift);
                                            fetchVolunteers(); // Refresh volunteers data to show updated shifts
                                          }}
                                          className="btn-danger"
                                          style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
                                        >
                                          Remove
                                        </button>
                                      </li>
                                    )) ?? <li>None</li>}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })}
                  </div>
                </div>
              )}
              {filteredVolunteers.length === 0 && (
                <p>No volunteers found matching your search.</p>
              )}
            </div>
          )}

          {/* Jobs + shift manager - shown when shifts tab is active */}
          {activeTab === 'shifts' && (
            <div className="admin-shift-manager" style={{ marginTop: '1rem' }}>
              <AdminJobManager
                shifts={browser.shifts}
                loading={browser.loading}
                fetchShifts={browser.fetchShifts}
              />
            </div>
          )}
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
    </div>
  )
}

export default AdminDashboard