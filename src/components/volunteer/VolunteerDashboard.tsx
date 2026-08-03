import { useEffect, useState } from 'react'
import type { Shift } from '../../types/shift'
import type { UserInfo } from '../../types/userInfo'
import type { HourEntry } from '../../types/hourEntry'
import { useHours } from '../../hooks/useHours'
import { AGE_RANGES, parentLinkMode } from '../../utils/ageRange'
import ShiftBrowser from '../shifts/ShiftBrowser'

interface VolunteerDashboardProps {
  getUserName: () => string
  userInfo: UserInfo | null
  removeActiveShift: (shiftDescription: string) => Promise<void>
  updateProfile: (fields: Partial<UserInfo>) => Promise<void>
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
  updateProfile,
  handleSignOut,
  ...browser
}: VolunteerDashboardProps) {
  // Compute user's age range for eligibility filtering
  const userAgeRange = userInfo?.age_range ?? null;
  const userId = userInfo?.user_id ?? null
  const hoursApi = useHours()
  const [entries, setEntries] = useState<HourEntry[]>([])
  const [showRequest, setShowRequest] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [reqHours, setReqHours] = useState('')
  const [reqReason, setReqReason] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profile, setProfile] = useState<Partial<UserInfo>>({})

  const loadEntries = async () => {
    if (userId) setEntries(await hoursApi.fetchMyEntries(userId))
  }
  useEffect(() => { loadEntries() /* eslint-disable-next-line */ }, [userId])

  const totalHours = userInfo?.hours_volunteered ?? 0

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    const h = parseFloat(reqHours)
    if (!userId || !h || h <= 0 || !reqReason.trim()) {
      setMsg('Enter a positive number of hours and a reason.')
      return
    }
    try {
      await hoursApi.requestHours(userId, h, reqReason.trim())
      setReqHours(''); setReqReason(''); setShowRequest(false)
      setMsg('Request sent to admins for approval. ✅')
      await loadEntries()
      window.setTimeout(() => setMsg(null), 4000)
    } catch (err: any) {
      console.error('Error requesting hours:', err)
      const detail = err?.message || err?.details || 'Please try again.'
      setMsg('Could not send request: ' + detail)
    }
  }

  const openEdit = () => {
    if (userInfo) {
      setProfile({
        first_name: userInfo.first_name, last_name: userInfo.last_name,
        age_range: userInfo.age_range ?? '',
        parent_email: userInfo.parent_email ?? '',
        birthday: userInfo.birthday ? userInfo.birthday.slice(0, 10) : '',
        phone_number: userInfo.phone_number,
        emergency_contact_name: userInfo.emergency_contact_name,
        emergency_contact_phone: userInfo.emergency_contact_phone,
        employer: userInfo.employer, street_address: userInfo.street_address,
        city: userInfo.city, zip_code: userInfo.zip_code, organization: userInfo.organization,
      })
    }
    setShowEdit(true); setShowRequest(false)
  }

  const setField = (k: keyof UserInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setProfile(p => ({ ...p, [k]: e.target.value }))

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (profile.age_range === '14_15' && !((profile.parent_email as string) ?? '').trim()) {
      setMsg('14–15 volunteers must provide a parent/guardian volunteer email.')
      return
    }
    setSavingProfile(true)
    try {
      await updateProfile(profile)
      setShowEdit(false)
      setMsg('Your info has been updated. ✅')
      window.setTimeout(() => setMsg(null), 4000)
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setMsg('Could not update info: ' + (err?.message || 'please try again'))
    } finally {
      setSavingProfile(false)
    }
  }

  const printTimesheet = () => window.print()

  return (
    <div className="dashboard-container">
      <div className="welcome-banner">
        <div style={{ flex: 1, minWidth: '260px' }}>
          <h3>Welcome back, {getUserName()}!</h3>
          <p>Thank you for contributing your time and energy to Hope's Corner.</p>
        </div>
        <button onClick={handleSignOut} className="btn-secondary logout-btn">Log Out</button>
      </div>

      {/* My Volunteering hub — stats, upcoming shifts, profile, timesheet history */}
      {userInfo && (
        <div className="timesheet-box">
          {/* Print-only header */}
          <div className="print-only print-header">
            <h2>Hope's Corner — Volunteer Timesheet</h2>
            <p>{`${userInfo.first_name ?? ''} ${userInfo.last_name ?? ''}`.trim()} · {userInfo.email}</p>
            <p>Total hours: {totalHours} · Printed {new Date().toLocaleDateString()}</p>
          </div>

          <div className="timesheet-head">
            <h4>My Volunteering</h4>
            <div className="timesheet-actions">
              <button type="button" className="btn-secondary btn-sm" onClick={openEdit}>Edit my info</button>
              <button type="button" className="btn-secondary btn-sm" onClick={printTimesheet}>🖨 Print</button>
              <button type="button" className="btn-primary btn-sm" onClick={() => { setShowRequest(s => !s); setShowEdit(false) }}>
                {showRequest ? 'Close' : '＋ Request hours'}
              </button>
            </div>
          </div>

          {/* Stats moved here */}
          <div className="dash-stats-row">
            <div className="stat-card">
              <span className="stat-icon" aria-hidden="true">⏱️</span>
              <span className="stat-value">{totalHours}</span>
              <span className="stat-label">Hours Volunteered</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon" aria-hidden="true">📅</span>
              <span className="stat-value">{userInfo.active_shifts.length}</span>
              <span className="stat-label">Upcoming Shifts</span>
            </div>
          </div>

          {msg && <div className="timesheet-msg">{msg}</div>}

          {/* Edit-info form */}
          {showEdit && (
            <form className="profile-edit-form" onSubmit={saveProfile}>
              <div className="profile-grid">
                <label>First name<input type="text" value={profile.first_name ?? ''} onChange={setField('first_name')} /></label>
                <label>Last name<input type="text" value={profile.last_name ?? ''} onChange={setField('last_name')} /></label>
                <label>Age range
                  <select value={(profile.age_range as string) ?? ''} onChange={setField('age_range')}>
                    <option value="">Select…</option>
                    {AGE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </label>
                {parentLinkMode(profile.age_range as string) !== 'none' && (
                  <label className="profile-wide">
                    Parent/guardian volunteer email{parentLinkMode(profile.age_range as string) === 'required' ? ' *' : ''}
                    <input
                      type="email"
                      value={(profile.parent_email as string) ?? ''}
                      onChange={setField('parent_email')}
                      placeholder="parent@example.com"
                      required={parentLinkMode(profile.age_range as string) === 'required'}
                    />
                  </label>
                )}
                <label>Birthday <span className="optional-tag">(optional)</span><input type="date" value={(profile.birthday as string) ?? ''} onChange={setField('birthday')} /></label>
                <label>Phone<input type="tel" value={profile.phone_number ?? ''} onChange={setField('phone_number')} /></label>
                <label>Emergency contact<input type="text" value={profile.emergency_contact_name ?? ''} onChange={setField('emergency_contact_name')} /></label>
                <label>Emergency phone<input type="tel" value={profile.emergency_contact_phone ?? ''} onChange={setField('emergency_contact_phone')} /></label>
                <label>Employer<input type="text" value={profile.employer ?? ''} onChange={setField('employer')} /></label>
                <label>Organization<input type="text" value={profile.organization ?? ''} onChange={setField('organization')} /></label>
                <label className="profile-wide">Street address<input type="text" value={profile.street_address ?? ''} onChange={setField('street_address')} /></label>
                <label>City<input type="text" value={profile.city ?? ''} onChange={setField('city')} /></label>
                <label>ZIP code<input type="text" value={profile.zip_code ?? ''} onChange={setField('zip_code')} /></label>
              </div>
              <div className="profile-edit-actions">
                <button type="button" className="btn-secondary btn-sm" onClick={() => setShowEdit(false)}>Cancel</button>
                <button type="submit" className="btn-primary btn-sm" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          )}

          {/* Request-hours form */}
          {showRequest && (
            <form className="request-form" onSubmit={submitRequest}>
              <input
                type="number" step="0.5" min="0.5"
                placeholder="Hours"
                value={reqHours}
                onChange={(e) => setReqHours(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Reason — what did you do?"
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary btn-sm">Send to admins</button>
            </form>
          )}

          {/* Upcoming shifts (moved here) */}
          {userInfo.active_shifts.length > 0 && (
            <div className="active-shifts-list">
              <h4>Upcoming Shifts</h4>
              <ul>
                {userInfo.active_shifts.map((shift, idx) => (
                  <li key={idx}>
                    <span>✅ {shift}</span>
                    <button onClick={() => removeActiveShift(shift)} className="trash-btn" title="Remove shift">✕</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Volunteering history */}
          <h4 className="timesheet-history-title">Volunteering History</h4>
          {entries.length === 0 ? (
            <p className="note-text">No hours logged yet. Completed shifts and approved requests will show up here.</p>
          ) : (
            <div className="timesheet-table-wrap">
              <table className="timesheet-table">
                <thead>
                  <tr><th>Date</th><th>Activity / Job</th><th>Hours</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {entries.map(en => (
                    <tr key={en.id}>
                      <td>{new Date(en.created_at).toLocaleDateString()}</td>
                      <td>{en.task || en.reason || '—'}</td>
                      <td className={`ts-hours ${en.hours < 0 ? 'neg' : ''}`}>{en.hours > 0 ? '+' : ''}{en.hours}</td>
                      <td><span className={`ts-status ts-${en.status}`}>{en.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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

      <ShiftBrowser
        {...browser}
        userAgeRange={userAgeRange}
      />
    </div>
  )
}

export default VolunteerDashboard
