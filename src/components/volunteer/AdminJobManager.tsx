import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useJobs } from '../../hooks/useJobs'
import type { Job } from '../../types/job'
import type { Shift } from '../../types/shift'
import ShiftRoster from './ShiftRoster'

interface Props {
  shifts: Shift[]
  loading: boolean
  fetchShifts: () => Promise<void>
  removeActiveShift: (shiftDescription: string) => Promise<void>
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const blankJobForm = { name: '', description: '', requirements: '', location: '', min_age: 16, visible: true, self_report: false, password: '' }

export default function AdminJobManager({ shifts, loading, fetchShifts, removeActiveShift }: Props) {
  const { jobs, fetchJobs, createJob, updateJob, deleteJob } = useJobs()
  const [jobForm, setJobForm] = useState({ ...blankJobForm })
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const shiftsByJob = useMemo(() => {
    const map: Record<string, Shift[]> = {}
    for (const s of shifts) {
      const key = s.jobId ?? 'none'
      ;(map[key] ??= []).push(s)
    }
    Object.values(map).forEach(g => g.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()))
    return map
  }, [shifts])

  const flash = (m: string) => { setMsg(m); setErr(null); setTimeout(() => setMsg(null), 3000) }
  const fail = (m: string) => { setErr(m); setMsg(null) }

  const submitJob = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingJob) {
        await updateJob(editingJob.id, jobForm)
        flash('Job updated')
      } else {
        await createJob(jobForm)
        flash('Job created')
      }
      setJobForm({ ...blankJobForm })
      setEditingJob(null)
    } catch (e: any) { fail(e.message ?? 'Save failed') }
  }

  const startEdit = (j: Job) => {
    setEditingJob(j)
    setJobForm({
      name: j.name, description: j.description ?? '', requirements: j.requirements ?? '',
      location: j.location ?? '', min_age: j.min_age,
      visible: j.visible, self_report: j.self_report, password: j.password ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const removeJob = async (j: Job) => {
    if (!confirm(`Delete job "${j.name}" and ALL its shifts + signups? This cannot be undone.`)) return
    try { await deleteJob(j.id); await fetchShifts(); flash('Job deleted') }
    catch (e: any) { fail(e.message ?? 'Delete failed') }
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <h3 style={{ marginBottom: '0.25rem' }}>Jobs &amp; Shifts</h3>
      <p style={{ color: '#666', marginTop: 0, fontSize: '0.9rem' }}>Create a job (a volunteer opportunity), then add shifts under it.</p>

      {msg && <div className="alert alert-success" style={{ marginBottom: '1rem', padding: '0.6rem' }}>{msg}</div>}
      {err && <div className="alert alert-error" style={{ marginBottom: '1rem', padding: '0.6rem' }}>{err}</div>}

      {/* ---- Job create / edit form ---- */}
      <form onSubmit={submitJob} style={card}>
        <h4 style={{ marginTop: 0 }}>{editingJob ? `Edit job: ${editingJob.name}` : 'Create a job'}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <label style={fieldLabel}>Name
            <input required value={jobForm.name} onChange={e => setJobForm({ ...jobForm, name: e.target.value })} style={input} />
          </label>
          <label style={fieldLabel}>Minimum age
            <input type="number" min={0} value={jobForm.min_age} onChange={e => setJobForm({ ...jobForm, min_age: Number(e.target.value) || 0 })} style={input} />
          </label>
          <label style={fieldLabel}>Location
            <input value={jobForm.location} onChange={e => setJobForm({ ...jobForm, location: e.target.value })} placeholder="e.g. Main Hall / Kitchen" style={input} />
          </label>
          <label style={{ ...fieldLabel, gridColumn: '1 / -1' }}>Description
            <textarea value={jobForm.description} onChange={e => setJobForm({ ...jobForm, description: e.target.value })} rows={2} style={{ ...input, resize: 'vertical' }} />
          </label>
          <label style={{ ...fieldLabel, gridColumn: '1 / -1' }}>Requirements
            <textarea value={jobForm.requirements} onChange={e => setJobForm({ ...jobForm, requirements: e.target.value })} rows={2} placeholder="e.g. Age 16+, able to stand 3 hrs" style={{ ...input, resize: 'vertical' }} />
          </label>
          <label style={fieldLabel}>Password (optional)
            <input value={jobForm.password} onChange={e => setJobForm({ ...jobForm, password: e.target.value })} placeholder="Leave blank = open" style={input} />
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', justifyContent: 'center' }}>
            <label style={checkRow}><input type="checkbox" checked={jobForm.visible} onChange={e => setJobForm({ ...jobForm, visible: e.target.checked })} /> Visible to volunteers</label>
            <label style={checkRow}><input type="checkbox" checked={jobForm.self_report} onChange={e => setJobForm({ ...jobForm, self_report: e.target.checked })} /> Private — volunteers self-report hours</label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          {editingJob && <button type="button" onClick={() => { setEditingJob(null); setJobForm({ ...blankJobForm }) }} className="btn-secondary">Cancel</button>}
          <button type="submit" className="btn-primary">{editingJob ? 'Save changes' : 'Create job'}</button>
        </div>
      </form>

      {/* ---- Jobs list ---- */}
      {jobs.length === 0 && <p style={{ color: '#666' }}>No jobs yet. Create one above.</p>}
      {jobs.map(job => {
        const jobShifts = shiftsByJob[job.id] ?? []
        const open = expandedJob === job.id
        return (
          <div key={job.id} style={{ ...card, borderLeft: `4px solid ${job.visible ? '#22634d' : '#bbb'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div>
                <h4 style={{ margin: 0 }}>
                  {job.name}
                  {!job.visible && <span style={tag('#eee', '#777')}>Hidden</span>}
                  {job.password && <span style={tag('#fdf0e3', '#b5651d')}>🔒 Password</span>}
                  {job.self_report && <span style={tag('#e3f0ff', '#1c5fb0')}>Self-report</span>}
                  <span style={tag('#f0f7f4', '#22634d')}>Age {job.min_age}+</span>
                </h4>
                <p style={{ margin: '0.2rem 0 0', color: '#666', fontSize: '0.85rem' }}>{jobShifts.length} shift(s)</p>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button onClick={() => updateJob(job.id, { visible: !job.visible })} className="btn-secondary" style={miniBtn}>{job.visible ? 'Hide' : 'Show'}</button>
                <button onClick={() => startEdit(job)} className="btn-secondary" style={miniBtn}>Edit</button>
                <button onClick={() => removeJob(job)} className="btn-danger" style={miniBtn}>Delete</button>
                <button onClick={() => setExpandedJob(open ? null : job.id)} className="btn-primary" style={miniBtn}>{open ? 'Close' : 'Manage shifts'}</button>
              </div>
            </div>

            {open && (
              <JobShifts job={job} jobShifts={jobShifts} loading={loading} fetchShifts={fetchShifts} onFlash={flash} onFail={fail} removeActiveShift={removeActiveShift} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---- Shifts under one job: create (single or recurring), copy-year, list, roster ----
function JobShifts({ job, jobShifts, loading, fetchShifts, onFlash, onFail, removeActiveShift }: {
  job: Job; jobShifts: Shift[]; loading: boolean; fetchShifts: () => Promise<void>
  onFlash: (m: string) => void; onFail: (m: string) => void;
  removeActiveShift: (shiftDescription: string) => Promise<void>
}) {
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('11:00')
  const [capacity, setCapacity] = useState(5)
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [repeatWeeks, setRepeatWeeks] = useState(1)
  const [openRoster, setOpenRoster] = useState<string | null>(null)

  const toggleWeekday = (d: number) =>
    setWeekdays(w => w.includes(d) ? w.filter(x => x !== d) : [...w, d])

  // Compute the list of dates a new-shift request expands into.
  const targetDates = (): Date[] => {
    if (!date) return []
    const base = new Date(`${date}T00:00:00`)
    if (weekdays.length === 0) return [base]
    const out: Date[] = []
    for (let i = 0; i < repeatWeeks * 7; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i)
      if (weekdays.includes(d.getDay())) out.push(d)
    }
    return out
  }

  // A thin shift row: just times, spots, and the job it belongs to.
  const buildRow = (d: Date, group: string | null) => {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const start = new Date(d); start.setHours(sh, sm, 0, 0)
    const end = new Date(d); end.setHours(eh, em, 0, 0)
    return {
      shift_start: start.toISOString(), shift_end: end.toISOString(),
      spots_left: capacity, job_id: job.id, recurrence_group: group,
    }
  }

  const createShifts = async (e: React.FormEvent) => {
    e.preventDefault()
    const dates = targetDates()
    if (dates.length === 0) { onFail('Pick a start date.'); return }
    try {
      // A repeated batch shares one recurrence group so it can be managed together.
      const group = dates.length > 1 ? crypto.randomUUID() : null
      const { error } = await supabase.from('shifts').insert(dates.map(d => buildRow(d, group)))
      if (error) throw error
      await fetchShifts()
      onFlash(`Created ${dates.length} shift(s)`)
      setWeekdays([]); setRepeatWeeks(1)
    } catch (e: any) { onFail(e.message ?? 'Create failed') }
  }

  const copyLastYear = async () => {
    if (jobShifts.length === 0) { onFail('No shifts to copy.'); return }
    if (!confirm(`Copy all ${jobShifts.length} shift(s) forward by one year?`)) return
    try {
      const group = crypto.randomUUID()
      const rows = await Promise.all(jobShifts.map(async s => {
        const { data } = await supabase.from('shifts').select('shift_start, shift_end').eq('id', s.id).single()
        const start = new Date(data!.shift_start); start.setFullYear(start.getFullYear() + 1)
        const end = new Date(data!.shift_end); end.setFullYear(end.getFullYear() + 1)
        return {
          shift_start: start.toISOString(), shift_end: end.toISOString(),
          spots_left: s.spotsLeft, job_id: job.id, recurrence_group: group,
        }
      }))
      const { error } = await supabase.from('shifts').insert(rows)
      if (error) throw error
      await fetchShifts()
      onFlash(`Copied ${rows.length} shift(s) to next year`)
    } catch (e: any) { onFail(e.message ?? 'Copy failed') }
  }

  const deleteShift = async (id: string) => {
    if (!confirm('Delete this shift and its signups?')) return
    try {
      // 1. Get signups for this shift to know which users need the shift removed from active_shifts
      const { data: signups, error: signupError } = await supabase
        .from('signups')
        .select('user_id')
        .eq('shift_id', id)
      if (signupError) throw signupError

      // Collect unique user ids (excluding nulls for walk-ins)
      const userIds = [...new Set(signups.map(s => s.user_id).filter((id): id is string => id !== null))]

      // 2. For each user, remove the shift from their active_shifts array
      for (const userId of userIds) {
        const { data: userInfo, error: fetchError } = await supabase
          .from('user_info')
          .select('active_shifts')
          .eq('user_id', userId)
          .single()
        if (fetchError) throw fetchError

        const current = userInfo?.active_shifts ?? []
        const updated = (Array.isArray(current) ? current : []).filter((shiftId: string) => shiftId !== id)

        const { error: updateError } = await supabase
          .from('user_info')
          .update({ active_shifts: updated })
          .eq('user_id', userId)
        if (updateError) throw updateError
      }

      // 3. Delete signups for this shift
      const { error: deleteSignupsError } = await supabase.from('signups').delete().eq('shift_id', id)
      if (deleteSignupsError) throw deleteSignupsError

      // 4. Finally delete the shift (this will also cascade-delete signups if FK set)
      await supabase.from('shifts').delete().eq('id', id)
      await fetchShifts()
      onFlash('Shift deleted')
    } catch (e: any) {
      onFail(e.message ?? 'Delete failed')
    }
  }

  return (
    <div style={{ marginTop: '0.75rem', borderTop: '1px dashed #ddd', paddingTop: '0.75rem' }}>
      {/* Add shift(s) */}
      <form onSubmit={createShifts} style={{ background: '#f9fbfa', border: '1px solid #e3efe9', borderRadius: 8, padding: '0.75rem', marginBottom: '0.75rem' }}>
        <strong style={{ fontSize: '0.9rem' }}>Add shift(s)</strong>
        <span className="tz-note" style={{ marginLeft: 8 }}>🕒 Enter times in Pacific Time (PT)</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
          <label style={fieldLabel}>Start date<input type="date" required value={date} onChange={e => setDate(e.target.value)} style={input} /></label>
          <label style={fieldLabel}>Start time<input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={input} /></label>
          <label style={fieldLabel}>End time<input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={input} /></label>
          <label style={fieldLabel}>Volunteers needed<input type="number" min={1} value={capacity} onChange={e => setCapacity(Number(e.target.value) || 1)} style={input} /></label>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', color: '#555' }}>Repeat on: </span>
          {WEEKDAYS.map((w, i) => (
            <button type="button" key={w} onClick={() => toggleWeekday(i)}
              style={{ ...miniBtn, marginRight: 4, background: weekdays.includes(i) ? '#22634d' : '#eee', color: weekdays.includes(i) ? '#fff' : '#333' }}>{w}</button>
          ))}
          {weekdays.length > 0 && (
            <label style={{ fontSize: '0.82rem', marginLeft: 8 }}>for
              <input type="number" min={1} max={53} value={repeatWeeks} onChange={e => setRepeatWeeks(Number(e.target.value) || 1)} style={{ ...input, width: 60, margin: '0 4px', padding: '0.2rem' }} /> week(s)
            </label>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem' }}>
          <button type="button" onClick={copyLastYear} className="btn-secondary" style={miniBtn}>📋 Copy last year</button>
          <button type="submit" className="btn-primary" style={miniBtn}>Add {targetDates().length || ''} shift(s)</button>
        </div>
      </form>

      {/* Existing shifts */}
      {loading ? <p style={{ color: '#666' }}>Loading…</p> : jobShifts.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No shifts yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {jobShifts.map(s => (
            <div key={s.id} style={{ border: '1px solid #eee', borderRadius: 6, padding: '0.6rem', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.dateLabel}</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>{s.timeLabel} · {s.spotsLeft} spots left</div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => setOpenRoster(openRoster === s.id ? null : s.id)} className="btn-secondary" style={miniBtn}>{openRoster === s.id ? 'Hide roster' : 'Roster'}</button>
                  <button onClick={() => deleteShift(s.id)} className="btn-danger" style={miniBtn}>Delete</button>
                </div>
              </div>
              {openRoster === s.id && (
  <ShiftRoster
    shift={s}
    otherShifts={jobShifts.filter(x => x.id !== s.id)}
    onRemoveSignup={async (shiftId, userId) => {
      if (!userId) return
      const description = `${s.role} - ${s.time}`
      await removeActiveShift(description)
    }}
  />
)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- shared inline styles ----
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e6e6e6', borderRadius: 10, padding: '1rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
const input: React.CSSProperties = { padding: '0.45rem', border: '1px solid #ddd', borderRadius: 4, fontSize: '0.88rem', width: '100%', boxSizing: 'border-box' }
const fieldLabel: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem', fontWeight: 600, color: '#333' }
const checkRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 500 }
const miniBtn: React.CSSProperties = { fontSize: '0.8rem', padding: '0.3rem 0.7rem', borderRadius: 4 }
const tag = (bg: string, fg: string): React.CSSProperties => ({ background: bg, color: fg, fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, marginLeft: 6, verticalAlign: 'middle' })
