import type { Shift } from '../../types/shift'
import type { UserInfo } from '../../types/userInfo'
import AdminJobManager from './AdminJobManager'
import { supabase } from '../../lib/supabaseClient'
import { useState, useEffect, useMemo } from 'react'
import { useHours } from '../../hooks/useHours'
import type { PendingRequest } from '../../hooks/useHours'
import { useGroups } from '../../hooks/useGroups'
import { useBlacklist } from '../../hooks/useBlacklist'
import { useCancellations } from '../../hooks/useCancellations'
import type { CancellationRow } from '../../hooks/useCancellations'
import { formatDateOnly, ageFromBirthday } from '../../utils/dateUtils'
import { ageRangeShort, ageRangeLabel } from '../../utils/ageRange'

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
  updateActiveShifts: (shift: Shift) => Promise<void>
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
  updateActiveShifts,
  refreshData,
  ...browser
}: AdminDashboardProps) {
  const [volunteers, setVolunteers] = useState<UserInfo[]>([])
  const [volunteersLoading, setVolunteersLoading] = useState(false)
  const [admins, setAdmins] = useState<Array<{id: string, user_id: string}>>([])
  const [expandedVolunteerId, setExpandedVolunteerId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'volunteers' | 'shifts' | 'admins' | 'requests' | 'cancellations'>('volunteers')
  const [confirmAction, setConfirmAction] = useState<{ type: 'make' | 'remove'; userId: string } | null>(null)
  const [selectedVolunteerForHours, setSelectedVolunteerForHours] = useState<string | null>(null)
  const [hoursDelta, setHoursDelta] = useState<string>('1')
  const [hoursNote, setHoursNote] = useState('')
  const [adminSearch, setAdminSearch] = useState('')
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  // Ban form state
  const [banForm, setBanForm] = useState({
    volunteerId: '',
    reason: '',
    until: '' // ISO date string or empty for permanent
  })

  const hoursApi = useHours()
  const groupsApi = useGroups()
  const cancellationsApi = useCancellations()
  const [newGroup, setNewGroup] = useState('')
  const [cancellations, setCancellations] = useState<CancellationRow[]>([])
  const [lateOnly, setLateOnly] = useState(false)

  const loadCancellations = async () => {
    setCancellations(await cancellationsApi.fetchCancellations())
  }

  const markCancelNotified = async (id: string) => {
    try {
      await cancellationsApi.markNotified(id, true)
      setCancellations(prev => prev.map(c => c.id === id ? { ...c, notified: true } : c))
    } catch (err) { alert('Failed to update: ' + errMsg(err)) }
  }

  // mailto: link with a pre-filled late-cancellation notice (works with no email backend —
  // opens the admin's mail client). Auto-send can replace this once Resend is wired.
  const lateCancelMailto = (c: CancellationRow) => {
    const when = c.shift_start ? new Date(c.shift_start).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }) : 'your shift'
    const subject = `Hope's Corner — late shift cancellation`
    const body =
      `Hi ${c.display_name.split(' ')[0] || 'there'},\n\n` +
      `We noticed you cancelled your "${c.job_name ?? 'volunteer'}" shift (${when} PT) less than 24 hours before it started.\n\n` +
      `Last-minute cancellations leave gaps that are hard to fill, so please give us as much notice as you can next time. ` +
      `If something came up, no worries — we'd still love to have you at a future shift.\n\n` +
      `Thank you,\nHope's Corner`
    return `mailto:${c.email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  useEffect(() => { groupsApi.fetchGroups() }, [groupsApi.fetchGroups])

  // Blacklist hook
  const { loading: blacklistLoading, error: blacklistError, entries: blacklist, fetchBlacklist, addBan, removeBan } = useBlacklist()
  useEffect(() => {
    fetchBlacklist()
  }, [fetchBlacklist])

  // Sync hook state to local state (optional, we can use hook directly)
  // We'll just use the hook's return values directly in render.

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroup.trim()) return
    try { await groupsApi.addGroup(newGroup); setNewGroup('') }
    catch (err) { alert('Failed to add organization: ' + errMsg(err)) }
  }

  const handleRemoveGroup = async (id: string, name: string) => {
    if (!confirm(`Remove organization "${name}"?`)) return
    try { await groupsApi.removeGroup(id) }
    catch (err) { alert('Failed to remove organization: ' + errMsg(err)) }
  }

  // Supabase errors are objects — pull out something human-readable.
  const errMsg = (err: any) =>
    err?.message || err?.details || err?.hint || (typeof err === 'string' ? err : JSON.stringify(err))

  const loadPending = async () => {
    setPendingRequests(await hoursApi.fetchPending())
  }
  useEffect(() => { loadPending() }, [])

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
      alert('Failed to load volunteers: ' + errMsg(err))
    } finally {
      setVolunteersLoading(false)
    }
  }

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id, user_id')
      if (error) throw error
      setAdmins(data)
    } catch (err) {
      console.error('Error fetching admins:', err)
      alert('Failed to load admins: ' + errMsg(err))
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
    setHoursDelta('1')
    setHoursNote('')
  }

  const stepHours = (by: number) => {
    setHoursDelta(prev => {
      const n = (parseFloat(prev) || 0) + by
      return String(Math.round(n * 10) / 10)
    })
  }

  const handleSubmitHours = async (e: React.FormEvent) => {
    e.preventDefault()
    const delta = parseFloat(hoursDelta)
    if (!selectedVolunteerForHours || !delta || isNaN(delta)) {
      alert('Enter a non-zero number of hours (negative to subtract).')
      return
    }
    try {
      const targetId = selectedVolunteerForHours
      const newTotal = await hoursApi.logHours(targetId, delta, hoursNote.trim())
      // Update the row straight from the authoritative returned total.
      setVolunteers(prev => prev.map(v => v.user_id === targetId ? { ...v, hours_volunteered: newTotal } : v))
      setSelectedVolunteerForHours(null)
      setHoursDelta('1')
      setHoursNote('')
    } catch (err) {
      console.error('Error changing hours:', err)
      alert('Failed to change hours: ' + errMsg(err))
    }
  }

  const handleCancelHours = () => {
    setSelectedVolunteerForHours(null)
    setHoursDelta('1')
    setHoursNote('')
  }

  const handleApprove = async (entry: PendingRequest) => {
    try {
      await hoursApi.approveEntry(entry)
      await loadPending()
      await fetchVolunteers()
    } catch (err) {
      console.error('Error approving request:', err)
      alert('Failed to approve: ' + errMsg(err))
    }
  }

  const handleDeny = async (id: string) => {
    try {
      await hoursApi.denyEntry(id)
      await loadPending()
    } catch (err) {
      console.error('Error denying request:', err)
      alert('Failed to deny: ' + errMsg(err))
    }
  }

  return (
    <div className="dashboard-container admin-dashboard">
      {/* Hero */}
      <header className="admin-hero">
        <div className="admin-hero-text">
          <span className="admin-eyebrow">🛡️ Admin Console</span>
          <h3>Welcome back, {getUserName()}</h3>
          <p>Full administrative access to Hope's Corner's volunteer operations.</p>
        </div>
      </header>

      {/* Stat cards */}
      <div className="dash-stats-row admin-stat-row">
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true">👥</span>
          <span className="stat-value">{volunteers.length}</span>
          <span className="stat-label">Registered Volunteers</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true">📅</span>
          <span className="stat-value">{browser.shifts.length}</span>
          <span className="stat-label">Active Shifts</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true">🛡️</span>
          <span className="stat-value">{admins.length}</span>
          <span className="stat-label">Admins</span>
        </div>
      </div>

      {/* Tab toolbar */}
      <nav className="admin-toolbar" aria-label="Admin sections">
        <button
          className={`admin-tab ${activeTab === 'volunteers' ? 'active' : ''}`}
          onClick={() => { setActiveTab('volunteers'); handleClickVolunteers() }}
          disabled={volunteersLoading}
        >
          {volunteersLoading ? 'Loading…' : 'Volunteers'}
        </button>
        <button className={`admin-tab ${activeTab === 'shifts' ? 'active' : ''}`} onClick={() => setActiveTab('shifts')}>
          Jobs & Shifts
        </button>
        <button className={`admin-tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => { setActiveTab('requests'); loadPending() }}>
          Hour Requests
          {pendingRequests.length > 0 && <span className="req-badge">{pendingRequests.length}</span>}
        </button>
        <button className={`admin-tab ${activeTab === 'admins' ? 'active' : ''}`} onClick={() => { setActiveTab('admins'); handleClickVolunteers() }}>
          Admin Actions
        </button>
        <button className={`admin-tab ${activeTab === 'cancellations' ? 'active' : ''}`} onClick={() => { setActiveTab('cancellations'); loadCancellations() }}>
          Cancellations
        </button>
      </nav>

      <div className="admin-tab-content">

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
                      <div className="vol-col expand" aria-hidden="true"></div>
                    </div>
                    {filteredVolunteers.map(v => {
                      // age from birthday (local calendar date, no UTC shift)
                      const ageDisplay: string | number = ageFromBirthday(v.birthday) ?? 'N/A'
                      const isAdmin = admins.some(a => a.user_id === v.user_id)
                      const isExpanded = expandedVolunteerId === v.user_id
                      return (
                        <>
                          <div
                            key={v.user_id}
                            className={`volunteer-row ${isExpanded ? 'is-open' : ''}`}
                            onClick={() => setExpandedVolunteerId(isExpanded ? null : v.user_id)}
                          >
                            <div className="vol-col name">
                              {(v.first_name || v.last_name) ? `${v.first_name ?? ''} ${v.last_name ?? ''}`.trim() : '—'}
                              {isAdmin && <span className="vol-admin-dot" title="Admin">🛡️</span>}
                            </div>
                            <div className="vol-col email">{v.email ?? ''}</div>
                            <div className="vol-col age"><span className="age-pill">{v.age_range ? ageRangeShort(v.age_range) : ageDisplay}</span></div>
                            <div className="vol-col expand"><span className="expand-chevron">▾</span></div>
                          </div>
                          {isExpanded && (
                            <div className="vol-detail-panel" onClick={(e) => e.stopPropagation()}>
                              {/* Hours: change/add control (left) + running total (right) */}
                              <div className="vol-hours-bar">
                                {selectedVolunteerForHours === v.user_id ? (
                                  <form className="hours-editor" onSubmit={handleSubmitHours}>
                                    <div className="hours-stepper">
                                      <button type="button" className="step-btn step-plus" onClick={() => stepHours(1)} aria-label="Increase by 1">+</button>
                                      <input
                                        type="number"
                                        step="0.5"
                                        value={hoursDelta}
                                        onChange={(e) => setHoursDelta(e.target.value)}
                                        aria-label="Hours to change"
                                        autoFocus
                                      />
                                      <button type="button" className="step-btn step-minus" onClick={() => stepHours(-1)} aria-label="Decrease by 1">−</button>
                                    </div>
                                    <input
                                      className="hours-note-input"
                                      value={hoursNote}
                                      onChange={(e) => setHoursNote(e.target.value)}
                                      placeholder="Note (what for) — optional"
                                    />
                                    <button type="submit" className="btn-primary btn-sm">Save</button>
                                    <button type="button" onClick={handleCancelHours} className="btn-secondary btn-sm">Cancel</button>
                                  </form>
                                ) : (
                                  <button onClick={() => handleAddHoursClick(v.user_id)} className="btn-change-hours">
                                    Change / Add Hours
                                  </button>
                                )}
                                <div className="vol-hours-figure">
                                  <span className="vol-hours-value">{v.hours_volunteered ?? 0}</span>
                                  <span className="vol-hours-label">hours volunteered</span>
                                </div>
                              </div>

                              {/* Profile fields */}
                              <dl className="vol-detail-grid">
                                <div className="vol-field"><dt>Phone</dt><dd>{v.phone_number || '—'}</dd></div>
                                <div className="vol-field"><dt>Age range</dt><dd>{ageRangeLabel(v.age_range)}</dd></div>
                                <div className="vol-field"><dt>Birthday</dt><dd>{formatDateOnly(v.birthday)}</dd></div>
                                {v.parent_email && <div className="vol-field"><dt>Linked parent</dt><dd>👪 {v.parent_email}</dd></div>}
                                <div className="vol-field"><dt>Emergency contact</dt><dd>{v.emergency_contact_name || '—'}</dd></div>
                                <div className="vol-field"><dt>Emergency phone</dt><dd>{v.emergency_contact_phone || '—'}</dd></div>
                                <div className="vol-field"><dt>Employer</dt><dd>{v.employer || '—'}</dd></div>
                                <div className="vol-field"><dt>Organization</dt><dd>{v.organization || '—'}</dd></div>
                                <div className="vol-field vol-field-wide"><dt>Address</dt><dd>{[v.street_address, v.city, v.zip_code].filter(Boolean).join(', ') || '—'}</dd></div>
                              </dl>

                              {/* Admin role action */}
                              <div className="vol-detail-actions">
                                {isAdmin ? (
                                  <>
                                    <span className="vol-role-tag">🛡️ Admin</span>
                                    <button onClick={(e) => handleRemoveAdminClick(v.user_id, e)} className="btn-danger">
                                      Remove admin
                                    </button>
                                  </>
                                ) : (
                                  <button onClick={(e) => handleMakeAdminClick(v.user_id, e)} className="btn-secondary">
                                    Make admin
                                  </button>
                                )}
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
                removeActiveShift={removeActiveShift}
                updateActiveShifts={updateActiveShifts}
              />
            </div>
          )}

          {/* Manage Admins tab */}
          {activeTab === 'admins' && (
            <div className="admin-panel-section">
              <h4>Current Admins ({admins.length})</h4>
              <div className="admin-chip-grid">
                {admins.map(a => {
                  const info = volunteers.find(v => v.user_id === a.user_id)
                  const name = info ? `${info.first_name ?? ''} ${info.last_name ?? ''}`.trim() : a.user_id.slice(0, 8)
                  return (
                    <div key={a.user_id} className="admin-chip">
                      <div className="admin-chip-info">
                        <div className="admin-chip-name">🛡️ {name || 'Unknown'}</div>
                        {info?.email && <div className="admin-chip-email">{info.email}</div>}
                      </div>
                      <button className="btn-danger btn-sm" onClick={() => handleRemoveAdminClick(a.user_id)}>Remove</button>
                    </div>
                  )
                })}
                {admins.length === 0 && <p className="note-text">No admins yet.</p>}
              </div>

              <h4 style={{ marginTop: '1.75rem' }}>Promote a volunteer</h4>
              <div className="admin-search">
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Search volunteers to promote…"
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="promote-list">
                {volunteers.length === 0 && <p className="note-text">Loading volunteers…</p>}
                {volunteers
                  .filter(v => !admins.some(a => a.user_id === v.user_id))
                  .filter(v => {
                    const t = adminSearch.toLowerCase().trim()
                    return !t || `${v.first_name ?? ''} ${v.last_name ?? ''} ${v.email ?? ''}`.toLowerCase().includes(t)
                  })
                  .slice(0, 25)
                  .map(v => (
                    <div key={v.user_id} className="promote-row">
                      <div className="promote-info">
                        <div className="promote-name">{`${v.first_name ?? ''} ${v.last_name ?? ''}`.trim() || '—'}</div>
                        <div className="promote-email">{v.email}</div>
                      </div>
                      <button className="btn-secondary btn-sm" onClick={() => handleMakeAdminClick(v.user_id)}>Make Admin</button>
                    </div>
                  ))}
              </div>

              <h4 style={{ marginTop: '1.75rem' }}>Ban Management</h4>
              <p className="note-text" style={{ marginTop: 0 }}>
                Ban volunteers from signing up for shifts. Enter reason and optional expiration date.
              </p>
              <div className="ban-form-section">
                <div className="form-group">
                  <label>Volunteer</label>
                  <select
                    value={banForm.volunteerId}
                    onChange={(e) => setBanForm({ ...banForm, volunteerId: e.target.value })}
                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: 4 }}
                  >
                    <option value="">Select volunteer…</option>
                    {volunteers
                      .map(v => (
                        <option key={v.user_id} value={v.user_id}>
                          {`${v.first_name ?? ''} ${v.last_name ?? ''}`.trim()} ({v.email})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label>Reason</label>
                  <input
                    type="text"
                    value={banForm.reason}
                    onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
                    placeholder="Reason for ban"
                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: 4 }}
                  />
                </div>
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label>Expires (optional)</label>
                  <input
                    type="date"
                    value={banForm.until}
                    onChange={(e) => setBanForm({ ...banForm, until: e.target.value })}
                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: 4 }}
                  />
                  <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                    Leave empty for a permanent ban.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!banForm.volunteerId) {
                      alert('Please select a volunteer');
                      return
                    }
                    const volunteer = volunteers.find(v => v.user_id === banForm.volunteerId)
                    if (!volunteer) {
                      alert('Volunteer not found')
                      return
                    }
                    try {
                      await addBan({
                        user_id: volunteer.user_id,
                        email: volunteer.email,
                        name: `${volunteer.first_name ?? ''} ${volunteer.last_name ?? ''}`.trim(),
                        reason: banForm.reason || null,
                        until: banForm.until || null
                      })
                      // reset form
                      setBanForm({ volunteerId: '', reason: '', until: '' })
                      alert('Ban added successfully')
                    } catch (err) {
                      console.error('Error adding ban:', err)
                      alert('Failed to add ban: ' + errMsg(err))
                    }
                  }}
                  className="btn-primary btn-sm"
                  style={{ marginTop: '0.5rem' }}
                >
                  Add Ban
                </button>
              </div>

              {blacklistLoading && <p className="note-text">Loading ban list…</p>}
              {blacklistError && <p className="note-text" style={{ color: '#d32f2f' }}>Error loading ban list: {blacklistError}</p>}
              {!blacklistLoading && !blacklistError && (
                <div>
                  <h4 style={{ marginTop: '1.5rem' }}>Current Bans ({blacklist.length})</h4>
                  {blacklist.length === 0 ? (
                    <p className="note-text">No active bans.</p>
                  ) : (
                    <div className="ban-list">
                      {blacklist.map((ban) => (
                        <div key={ban.user_id} className="ban-item" style={{ border: '1px solid #eee', borderRadius: 6, padding: '0.75rem', marginBottom: '0.5rem', background: '#fafafa' }}>
                          <div>
                            <strong>{ban.name}</strong> ({ban.email})
                            {ban.reason && (
                              <>
                                <br />
                                <span style={{ fontSize: '0.85rem', color: '#555' }}>Reason: {ban.reason}</span>
                              </>
                            )}
                          </div>
                          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                            {ban.until ? (
                              <>
                                Expires: {new Date(ban.until).toLocaleDateString()} &nbsp;
                                {new Date(ban.until) < new Date() ? (
                                  <span style={{ color: '#d32f2f' }}> (Expired)</span>
                                ) : (
                                  <span style={{ color: '#28a745' }}> (Active)</span>
                                )}
                              </>
                            ) : (
                              <span style={{ color: '#dc3545' }}>Permanent</span>
                            )}
                          </div>
                          <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                if (confirm(`Unban ${ban.name}?`)) {
                                  removeBan(ban.user_id).then(() => {
                                    alert('Ban removed')
                                  }).catch(err => {
                                    alert('Failed to remove ban: ' + (err.message ?? 'Unknown error'))
                                  })
                                }
                              }}
                              className="btn-danger btn-sm"
                            >
                              Unban
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <h4 style={{ marginTop: '1.75rem' }}>Organizations</h4>
              <p className="note-text" style={{ marginTop: 0 }}>Groups volunteers can sign up under during registration.</p>
              <form className="org-add-form" onSubmit={handleAddGroup}>
                <input
                  type="text"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  placeholder="New organization name…"
                />
                <button type="submit" className="btn-primary btn-sm">Add</button>
              </form>
              <div className="org-chip-grid">
                {groupsApi.groups.length === 0 && <p className="note-text">No organizations yet.</p>}
                {groupsApi.groups.map(g => (
                  <div key={g.id} className="org-chip">
                    <span>{g.name}</span>
                    <button className="org-chip-remove" onClick={() => handleRemoveGroup(g.id, g.name)} aria-label={`Remove ${g.name}`}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hour Requests tab */}
          {activeTab === 'requests' && (
            <div className="admin-panel-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0 }}>Pending Hour Requests ({pendingRequests.length})</h4>
                <button className="btn-secondary btn-sm" onClick={loadPending}>Refresh</button>
              </div>
              {pendingRequests.length === 0 ? (
                <p className="note-text" style={{ marginTop: '1rem' }}>No pending requests right now. 🎉</p>
              ) : (
                <div className="request-list">
                  {pendingRequests.map(r => (
                    <div key={r.id} className="request-card">
                      <div className="request-main">
                        <div className="request-head">
                          <span className="request-name">{r.display_name}</span>
                          <span className="request-hours">+{r.hours} hrs</span>
                        </div>
                        {r.email && <div className="request-email">{r.email}</div>}
                        {r.reason && <div className="request-reason">“{r.reason}”</div>}
                        <div className="request-date">Requested {new Date(r.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="request-actions">
                        <button className="btn-primary btn-sm" onClick={() => handleApprove(r)}>Approve</button>
                        <button className="btn-danger btn-sm" onClick={() => handleDeny(r.id)}>Deny</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cancellations report */}
          {activeTab === 'cancellations' && (
            <div className="admin-panel-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0 }}>Cancelled Volunteers ({cancellations.length})</h4>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={lateOnly} onChange={e => setLateOnly(e.target.checked)} />
                    Late only (&lt;24h)
                  </label>
                  <button className="btn-secondary btn-sm" onClick={loadCancellations}>Refresh</button>
                </div>
              </div>
              <p className="note-text" style={{ marginTop: '0.5rem' }}>
                Volunteer self-cancellations are logged here. Late cancels (&lt;24h before the shift) can be emailed a
                reminder with one click — this opens your mail app until automatic sending is set up.
              </p>

              {(() => {
                const rows = lateOnly ? cancellations.filter(c => c.late) : cancellations
                if (rows.length === 0) {
                  return <p className="note-text" style={{ marginTop: '1rem' }}>{lateOnly ? 'No late cancellations. 🎉' : 'No cancellations recorded yet.'}</p>
                }
                return (
                  <div className="request-list">
                    {rows.map(c => (
                      <div key={c.id} className="request-card" style={c.late ? { borderLeftColor: 'var(--hc-danger)' } : undefined}>
                        <div className="request-main">
                          <div className="request-head">
                            <span className="request-name">{c.display_name}</span>
                            {c.late && <span className="request-hours" style={{ background: '#fdecea', color: '#c0392b' }}>Late (&lt;24h)</span>}
                            {c.notified && <span className="ts-status ts-approved">Notified</span>}
                          </div>
                          {c.email && <div className="request-email">{c.email}</div>}
                          <div className="request-reason" style={{ fontStyle: 'normal' }}>
                            {c.job_name ?? 'Shift'} · {c.shift_start ? new Date(c.shift_start).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }) + ' PT' : 'unknown time'}
                          </div>
                          <div className="request-date">
                            Cancelled {new Date(c.cancelled_at).toLocaleString()} · {c.hours_before != null ? `${c.hours_before}h notice` : 'notice unknown'}
                          </div>
                        </div>
                        {c.late && (
                          <div className="request-actions">
                            {c.email && <a className="btn-primary btn-sm" href={lateCancelMailto(c)}>✉️ Email</a>}
                            {!c.notified && <button className="btn-secondary btn-sm" onClick={() => markCancelNotified(c.id)}>Mark notified</button>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
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