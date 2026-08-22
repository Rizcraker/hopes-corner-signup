import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Volunteer profile page for viewing read-only profile summaries.
// Can be accessed directly or via internal links within the application.
interface ProfileData {
  profile: {
    first_name: string | null
    last_name: string | null
    email: string | null
    hours_volunteered: number | null
    active_shifts: string[] | null
    organization: string | null
  }
  entries: { hours: number; task: string | null; created_at: string; status: string }[]
}

export default function VolunteerProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    console.log('VolunteerProfilePage: token from URL:', token)
    if (!token) { setError('This link is missing its token.'); setLoading(false); return }
    ;(async () => {
      try {
        console.log('VolunteerProfilePage: invoking get-volunteer-profile function')
        const { data, error } = await supabase.functions.invoke('get-volunteer-profile', { body: { token } })
        console.log('VolunteerProfilePage: function result:', { data, error })
        if (error) throw error
        if ((data as any)?.error) throw new Error((data as any).error)
        setData(data as ProfileData)
      } catch (e: any) {
        console.error('VolunteerProfilePage: error invoking function:', e)
        setError(e?.message || 'Could not load your profile. The link may have expired.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="tab-fade-in"><div className="loading-spinner">Loading your profile…</div></div>

  if (error || !data) {
    return (
      <div className="tab-fade-in">
        <div className="portal-header-box"><h2>Volunteer Profile</h2></div>
        <div className="auth-card" style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="error-banner">{error ?? 'Profile unavailable.'}</div>
          <p className="note-text">Ask an admin to resend your profile link.</p>
        </div>
      </div>
    )
  }

  const p = data.profile
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Volunteer'
  const upcoming = p.active_shifts ?? []

  return (
    <div className="tab-fade-in">
      <div className="portal-header-box">
        <h2>Hi {p.first_name || name}!</h2>
        <p>Your Hope's Corner volunteer profile.</p>
      </div>

      <div className="timesheet-box">
        <div className="dash-stats-row">
          <div className="stat-card">
            <span className="stat-icon" aria-hidden="true">⏱️</span>
            <span className="stat-value">{p.hours_volunteered ?? 0}</span>
            <span className="stat-label">Hours Volunteered</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon" aria-hidden="true">📅</span>
            <span className="stat-value">{upcoming.length}</span>
            <span className="stat-label">Upcoming Shifts</span>
          </div>
        </div>

        {upcoming.length > 0 && (
          <div className="active-shifts-list">
            <h4>Upcoming Shifts</h4>
            <ul>{upcoming.map((s, i) => <li key={i}><span>✅ {s}</span></li>)}</ul>
          </div>
        )}

        <h4 className="timesheet-history-title">Volunteering History</h4>
        {data.entries.length === 0 ? (
          <p className="note-text">No approved hours yet.</p>
        ) : (
          <div className="timesheet-table-wrap">
            <table className="timesheet-table">
              <thead><tr><th>Date</th><th>Activity / Job</th><th>Hours</th></tr></thead>
              <tbody>
                {data.entries.map((en, i) => (
                  <tr key={i}>
                    <td>{new Date(en.created_at).toLocaleDateString()}</td>
                    <td>{en.task || '—'}</td>
                    <td className="ts-hours">{en.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="note-text" style={{ marginTop: 12 }}>
          To sign up for shifts or edit your details, <a href="/volunteer">log in to the volunteer hub</a>.
        </p>
      </div>
    </div>
  )
}
