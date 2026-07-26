import type { Shift } from '../../types/shift'
import type { UserInfo } from '../../types/userInfo'
import AdminJobManager from './AdminJobManager'
import { supabase } from '../../lib/supabaseClient'
import { useState, useEffect, useMemo } from 'react'

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
  addHoursVolunteered: (userId: string, hours: number) => Promise<void>
  refreshData: () => void
  fetchShifts: () => Promise<void>
  refreshAdminStats?: () => void
  refreshUsers?: () => void
}

function AdminDashboard({
  getUserName,
  onSignUp,
  removeActiveShift,
  addHoursVolunteered,
  refreshData,
  ...browser
}: AdminDashboardProps) {
  const [volunteers, setVolunteers] = useState<UserInfo[]>([])
  const [volunteersLoading, setVolunteersLoading] = useState(false)
  const [admins, setAdmins] = useState<Array<{id: string, user_id: string}>>([])
  const [expandedVolunteerId, setExpandedVolunteerId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'volunteers' | 'shifts' | 'stats'>('volunteers')
  const [confirmAction, setConfirmAction] = useState<{ type: 'make' | 'remove'; userId: string } | null>(null)
  const [hoursToAdd, setHoursToAdd] = useState('')
  const [selectedVolunteerForHours, setSelectedVolunteerForHours] = useState<string | null>(null)

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

  // Fetch volunteers and admins on mount
  useEffect(() => {
    fetchVolunteers()
    fetchAdmins()
  }, [])

  const handleMakeAdminClick = (userId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setConfirmAction({ type: 'make', userId })
  }

  const handleRemoveAdminClick = (userId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setConfirmAction({ type: 'remove', userId })
  }

  const confirmMakeAdmin = async () => {
    if (!confirmAction) return
    try {
      const { error } = await supabase
        .from('admins')
        .insert({ user_id: confirmAction.userId })
      if (error) throw error
      await fetchAdmins()
    } catch (err) {
      console.error('Error making admin:', err)
      alert('Failed to make admin: ' + err)
    } finally {
      setConfirmAction(null)
    }
  }

  const confirmRemoveAdmin = async () => {
    if (!confirmAction) return
    try {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('user_id', confirmAction.userId)
      if (error) throw error
      await fetchAdmins()
    } catch (err) {
      console.error('Error removing admin:', err)
      alert('Failed to remove admin: ' + err)
    } finally {
      setConfirmAction(null)
    }
  }

  const handleAddHoursClick = (userId: string) => {
    setSelectedVolunteerForHours(userId)
    setHoursToAdd('')
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHoursToAdd(e.target.value)
  }

  const handleSubmitHours = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVolunteerForHours || !hoursToAdd || parseFloat(hoursToAdd) <= 0) {
      alert('Please enter a valid number of hours')
      return
    }

    try {
      await addHoursVolunteered(selectedVolunteerForHours, parseFloat(hoursToAdd))
      setSelectedVolunteerForHours(null)
      setHoursToAdd('')
      // Refresh volunteers data to show updated hours
      await fetchVolunteers()
    } catch (err) {
      console.error('Error adding hours:', err)
      alert('Failed to add hours: ' + err)
    }
  }

  const handleCancelHours = () => {
    setSelectedVolunteerForHours(null)
    setHoursToAdd('')
  }

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
            </div>
          </div>

          {/* Admin management sections */}
          <div className="admin-management">
            <h4>Management Actions</h4>
            <div className="admin-actions">
              <button onClick={() => {
                  setActiveTab('volunteers');
                  handleClickVolunteers();
              }} className={activeTab === 'volunteers' ? 'btn-primary' : 'btn-secondary'} disabled={volunteersLoading}>
                {volunteersLoading ? 'Loading...' : 'View All Volunteers'}
              </button>
              <button className={activeTab === 'shifts' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('shifts')}>
                Manage Jobs & Shifts
              </button>
              <button className="btn-secondary">
                Manage Admins
              </button>
            </div>
          </div>

          {/* Volunteer list - shown when volunteers tab is active */}
          {activeTab === 'volunteers' && (
            <div className="volunteer-section">
              {/* Search volunteers */}
              <div className="admin-search">
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Search volunteers by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              {filteredVolunteers.length > 0 && (
                <div className="volunteer-list">
                  <h4>Volunteers ({filteredVolunteers.length})</h4>
                  <div className="volunteer-table">
                    <div className="volunteer-header">
                      <div className="vol-col name">Name</div>
                      <div className="vol-col email">Email</div>
                      <div className="vol-col age">Age</div>
                    </div>
                    {filteredVolunteers.map(v => {
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
                      const isAdmin = admins.some(a => a.user_id === v.user_id)
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
                                {/* Hours toggle button */}
                                <button
                                  onClick={(e) => handleAddHoursClick(v.user_id)}
                                  className={selectedVolunteerForHours === v.user_id ? 'btn-secondary' : 'btn-primary'}
                                  style={{ marginTop: '0.5rem' }}
                                >
                                  {selectedVolunteerForHours === v.user_id ? 'Cancel' : 'Add Hours'}
                                </button>

                                {/* Hours form (when selected) */}
                                {(selectedVolunteerForHours === v.user_id) && (
                                  <form onSubmit={handleSubmitHours} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                                    <div className="form-group" style={{ width: '80px', marginBottom: 0 }}>
                                      <input
                                        type="number"
                                        min="0.1"
                                        step="0.1"
                                        value={hoursToAdd}
                                        onChange={handleHoursChange}
                                        placeholder="Hours to add"
                                        style={{ width: '100%' }}
                                      />
                                    </div>
                                    <button type="submit" className="btn-primary">Add</button>
                                    <button type="button" onClick={handleCancelHours} className="btn-secondary">Cancel</button>
                                  </form>
                                )}

                                {/* Admin action buttons */}
                                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', textAlign: 'center' }}>
                                  {isAdmin ? (
                                    <>
                                      <button onClick={(e) => handleRemoveAdminClick(v.user_id, e)} className="btn-primary">
                                        Remove Admin
                                      </button>
                                    </>
                                  ) : (
                                    <button onClick={(e) => handleMakeAdminClick(v.user_id, e)} className="btn-primary">
                                      Make Admin
                                    </button>
                                  )}
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
            <h5>�5 Shift Administration</h5>
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

      {/* Confirmation Modal */}
      {confirmAction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--hc-white)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            width: '90%',
            maxWidth: '400px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--hc-border)'
          }}>
            <h3 style={{ marginTop: 0, color: 'var(--hc-green-dark)' }}>
              {confirmAction.type === 'make' ? 'Make Admin?' : 'Remove Admin?'}
            </h3>
            <p style={{ color: 'var(--hc-text-main)', marginBottom: '1.5rem' }}>
              Are you sure you want to {confirmAction.type === 'make' ? 'grant' : 'revoke'} admin privileges to this volunteer?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={confirmAction.type === 'make' ? confirmMakeAdmin : confirmRemoveAdmin}
                className="btn-primary"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard