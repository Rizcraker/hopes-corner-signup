import { useEffect, useState } from 'react'
import { useSignups } from '../../hooks/useSignups'
import { supabase } from '../../lib/supabaseClient'
import type { RosterEntry } from '../../hooks/useSignups'
import type { Signup, SignupStatus } from '../../types/signup'
import type { Shift } from '../../types/shift'

// Roster panel for a single shift: who's signed up, add walk-ins, move / remove,
// mark no-show / attended, edit notes.  `otherShifts` lets an admin move a person.
interface ShiftRosterProps {
  shift: Shift
  otherShifts: Shift[]
  /** Optional callback to clean up volunteer's active_shifts when a signup is removed */
  onRemoveSignup?: (shiftId: string, userId: string | null) => Promise<void> | void
}

export default function ShiftRoster({ shift, otherShifts, onRemoveSignup }: ShiftRosterProps) {
  const { fetchRoster, addSignup, setStatus, moveSignup, removeSignup, updateSignup } = useSignups()
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [walkInName, setWalkInName] = useState('')
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setRoster(await fetchRoster(shift.id))
    } catch (e) {
      setError('Failed to load roster')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [shift.id])

  const addWalkIn = async () => {
    if (!walkInName.trim()) return
    try {
      setError(null)
      await addSignup({ shift_id: shift.id, manual_name: walkInName.trim() })
      setWalkInName('')
      await load()
    } catch (e: any) {
      setError(e.message ?? 'Failed to add walk-in')
    }
  }

  const statusBadge = (s: SignupStatus) => {
    const map: Record<SignupStatus, { label: string; bg: string; fg: string }> = {
      signed_up: { label: 'Signed up', bg: '#e3efe9', fg: '#22634d' },
      attended: { label: 'Attended', bg: '#e3f0ff', fg: '#1c5fb0' },
      no_show: { label: 'No-show', bg: '#fdecea', fg: '#c0392b' },
      cancelled: { label: 'Cancelled', bg: '#f0f0f0', fg: '#777' },
    }
    const c = map[s]
    return <span style={{ background: c.bg, color: c.fg, padding: '2px 8px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>{c.label}</span>
  }

  const handleRemove = async (signupId: string) => {
    if (!confirm('Remove this person from the shift?')) return
    try {
      setError(null)
      // Fetch signup to get shift_id and user_id for cleanup
      const { data: signup, error: fetchErr } = await supabase
        .from('signups')
        .select('shift_id, user_id')
        .eq('id', signupId)
        .single()
      if (fetchErr) throw fetchErr
      if (!signup) throw new Error('Signup not found')
      // Delete the signup
      await removeSignup(signupId)
      await load()
      // Notify parent to clean up active_shifts if callback provided
      if (onRemoveSignup) {
        await onRemoveSignup(signup.shift_id, signup.user_id ?? null)
      }
    } catch (e: any) {
      setError(e.message ?? 'Remove failed')
    }
  }

  return (
    <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '1rem', marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <strong>Roster — {roster.filter(r => r.status !== 'cancelled').length} signed up · {shift.spotsLeft} spots left</strong>
        <button onClick={load} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>Refresh</button>
        {error && <div style={{ color: '#d32f2f', marginLeft: '0.5rem', fontSize: '0.8rem' }}>{error}</div>}
      </div>

      {/* Add walk-in */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          value={walkInName}
          onChange={e => setWalkInName(e.target.value)}
          placeholder="Add walk-in by name…"
          style={{ flex: 1, padding: '0.4rem', border: '1px solid #ddd', borderRadius: 4, fontSize: '0.85rem' }}
        />
        <button onClick={addWalkIn} className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>Add</button>
      </div>

      {loading ? <p style={{ color: '#666' }}>Loading roster…</p> : roster.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No one signed up yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {roster.map(r => (
            <div key={r.id} style={{ border: '1px solid #eee', borderRadius: 6, padding: '0.6rem', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.display_name} {r.manual_name && <em style={{ fontWeight: 400, color: '#888', fontSize: '0.8rem' }}>(walk-in)</em>}</div>
                  {r.email && <div style={{ fontSize: '0.8rem', color: '#666' }}>{r.email}</div>}
                </div>
                {statusBadge(r.status)}
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <button onClick={async () => { await setStatus(r.id, 'attended'); load() }} className="btn-secondary" style={miniBtn}>Attended</button>
                <button onClick={async () => { await setStatus(r.id, 'no_show'); load() }} className="btn-secondary" style={miniBtn}>No-show</button>
                {otherShifts.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={async e => { if (e.target.value) { await moveSignup(r.id, e.target.value); load() } }}
                    style={{ ...miniBtn, cursor: 'pointer' }}
                  >
                    <option value="" disabled>Move to…</option>
                    {otherShifts.map(s => <option key={s.id} value={s.id}>{s.dateLabel} · {s.timeLabel}</option>)}
                  </select>
                )}
                <button onClick={() => handleRemove(r.id)} className="btn-danger" style={miniBtn}>Remove</button>
              </div>

              {/* Notes */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                <input
                  defaultValue={r.notes ?? ''}
                  onChange={e => setNoteDraft(d => ({ ...d, [r.id]: e.target.value }))}
                  placeholder="Notes…"
                  style={{ flex: 1, padding: '0.3rem', border: '1px solid #eee', borderRadius: 4, fontSize: '0.8rem' }}
                />
                <button
                  onClick={async () => { await updateSignup(r.id, { notes: noteDraft[r.id] ?? r.notes } as Partial<Signup>); load() }}
                  className="btn-secondary" style={miniBtn}
                >Save note</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const miniBtn: React.CSSProperties = { fontSize: '0.78rem', padding: '0.25rem 0.6rem', borderRadius: 4 }
