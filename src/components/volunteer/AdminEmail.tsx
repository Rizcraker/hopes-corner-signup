import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useEmail } from '../../hooks/useEmail'
import type { SendResult } from '../../hooks/useEmail'

interface VolRow {
  user_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  organization: string | null
  active_shifts: string[] | null
}
interface AdminOption { email: string; name: string }

type RecipientMode = 'all' | 'org' | 'job' | 'manual'

export default function AdminEmail() {
  const { templates, sending, fetchTemplates, saveTemplate, deleteTemplate, sendEmail } = useEmail()

  const [admins, setAdmins] = useState<AdminOption[]>([])
  const [vols, setVols] = useState<VolRow[]>([])
  const [jobs, setJobs] = useState<{ id: string; name: string }[]>([])
  const [orgs, setOrgs] = useState<string[]>([])

  const [fromEmail, setFromEmail] = useState('')
  const [fromName, setFromName] = useState("Hope's Corner")
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')

  const [mode, setMode] = useState<RecipientMode>('all')
  const [org, setOrg] = useState('')
  const [jobName, setJobName] = useState('')
  const [manual, setManual] = useState('')

  const [templateId, setTemplateId] = useState('')
  const [newTemplateName, setNewTemplateName] = useState('')
  const [result, setResult] = useState<SendResult | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    fetchTemplates()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      // Admins (for the From dropdown)
      const { data: adminRows } = await supabase.from('admins').select('user_id')
      const ids = (adminRows ?? []).map((a: any) => a.user_id)
      const { data: vinfo } = await supabase
        .from('user_info')
        .select('user_id, first_name, last_name, email, organization, active_shifts')
      const all = (vinfo ?? []) as VolRow[]
      setVols(all)
      setOrgs([...new Set(all.map(v => v.organization).filter(Boolean) as string[])].sort())
      const adminOpts: AdminOption[] = all
        .filter(v => ids.includes(v.user_id) && v.email)
        .map(v => ({ email: v.email as string, name: `${v.first_name ?? ''} ${v.last_name ?? ''}`.trim() }))
      setAdmins(adminOpts)
      // Default From = current admin
      const me = all.find(v => v.user_id === user?.id)
      if (me?.email) { setFromEmail(me.email); setFromName(`${me.first_name ?? ''} ${me.last_name ?? ''}`.trim() || "Hope's Corner") }
      else if (adminOpts[0]) { setFromEmail(adminOpts[0].email); setFromName(adminOpts[0].name) }
      const { data: jobRows } = await supabase.from('jobs').select('id, name').order('name')
      setJobs((jobRows ?? []) as { id: string; name: string }[])
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resolve the recipient email list for the chosen mode.
  const recipients = useMemo<string[]>(() => {
    const withEmail = vols.filter(v => v.email)
    if (mode === 'all') return withEmail.map(v => v.email as string)
    if (mode === 'org') return withEmail.filter(v => v.organization === org).map(v => v.email as string)
    if (mode === 'job') {
      const prefix = `${jobName} - `
      return withEmail
        .filter(v => (v.active_shifts ?? []).some(s => s.startsWith(prefix)))
        .map(v => v.email as string)
    }
    // manual
    return manual.split(/[\s,;]+/).map(s => s.trim()).filter(s => s.includes('@'))
  }, [mode, org, jobName, manual, vols])

  const applyTemplate = (id: string) => {
    setTemplateId(id)
    const t = templates.find(t => t.id === id)
    if (t) {
      setSubject(t.subject)
      setHtml(t.body_html)
      if (t.from_email) setFromEmail(t.from_email)
      if (t.from_name) setFromName(t.from_name)
    }
  }

  const onSaveTemplate = async () => {
    if (!newTemplateName.trim()) { setMsg('Name the template first.'); return }
    try {
      await saveTemplate({ name: newTemplateName.trim(), subject, body_html: html, from_name: fromName, from_email: fromEmail })
      setNewTemplateName('')
      setMsg('Template saved.')
    } catch (e: any) { setMsg('Could not save template: ' + (e?.message ?? e)) }
  }

  const onSend = async () => {
    setResult(null); setMsg(null)
    const to = [...new Set(recipients)]
    if (to.length === 0) { setMsg('No recipients resolved.'); return }
    if (!subject.trim() || !html.trim()) { setMsg('Add a subject and message body.'); return }
    if (!confirm(`Send this email to ${to.length} recipient(s)?`)) return

    // Track overall results
    let totalSent = 0
    let totalFailures: { recipient: string; error: string }[] = []

    setIsSending(true)
    try {
      for (const recipientEmail of to) {
        // Find volunteer by email
        const volunteer = vols.find(v => v.email === recipientEmail)
        let modifiedHtml = html
        if (volunteer && volunteer.user_id) {
          // Generate token for this volunteer
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
            'generate-volunteer-token',
            { body: { volunteer_id: volunteer.user_id } }
          )
          if (tokenError) {
            console.error('Token generation error:', tokenError)
            // If token fails, we'll send without replacement
          } else if (tokenData && tokenData.token) {
            const token = tokenData.token
            const link = `${window.location.origin}/volunteer-profile?token=${token}`
            // Replace placeholder with link
            modifiedHtml = html.replace(
              /\{volunteer profile link\}/g,
              `<a href="${link}" style="color: var(--hc-primary); text-decoration: underline;">Volunteer Profile</a>`
            )
          }
        }

        // Send email to this single recipient
        const res = await sendEmail({
          to: [recipientEmail],
          subject,
          html: modifiedHtml,
          fromName,
          fromEmail
        })
        totalSent += res.sent
        totalFailures = [...totalFailures, ...res.failures]
      }

      setResult({ sent: totalSent, total: to.length, failures: totalFailures })
      setMsg(
        `Sent ${totalSent}/${to.length}.` +
        (totalFailures.length ? ' Some failed — see below.' : '')
      )
    } catch (e: any) {
      setMsg('Send failed: ' + (e?.message ?? e))
    } finally {
      setIsSending(false)
    }
  }

  const onDomain = fromEmail.toLowerCase().endsWith('@hopes-corner.org') || fromEmail.toLowerCase() === 'onboarding@resend.dev'

  return (
    <div className="admin-panel-section">
      <h4>Email Communication</h4>
      <p className="note-text" style={{ marginTop: 0 }}>Send an email to volunteers directly through the app.</p>

      {msg && <div className="timesheet-msg" style={{ marginBottom: 12 }}>{msg}</div>}

      {/* From */}
      <div className="email-row">
        <label className="email-label">From</label>
        <select value={fromEmail} onChange={e => {
          setFromEmail(e.target.value);
          if (e.target.value === 'onboarding@resend.dev') {
            setFromName('Resend Testing');
          } else {
            const a = admins.find(a => a.email === e.target.value);
            if (a) setFromName(a.name);
          }
        }} className="email-input">
          {admins.length === 0 && <option value="">No admin emails found</option>}
          {/* Add Resend testing address as an option */}
          <option value="onboarding@resend.dev">Resend Testing &lt;onboarding@resend.dev&gt;</option>
          {admins.map(a => <option key={a.email} value={a.email}>{a.name} &lt;{a.email}&gt;</option>)}
        </select>
      </div>
      {!onDomain && fromEmail && (
        <p className="field-hint" style={{ color: 'var(--hc-danger)' }}>
          ⚠ {fromEmail} isn't on hopes-corner.org — Resend will reject it.
          {fromEmail.toLowerCase() === 'onboarding@resend.dev' ? '(Resend testing address - should work for testing)' : 'Pick an org address.'}
        </p>
      )}

      {/* Template */}
      <div className="email-row">
        <label className="email-label">Template</label>
        <select value={templateId} onChange={e => applyTemplate(e.target.value)} className="email-input">
          <option value="">— none (write from scratch) —</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {templateId && <button className="btn-danger btn-sm" onClick={() => { deleteTemplate(templateId); setTemplateId('') }}>Delete</button>}
      </div>

      {/* Subject */}
      <div className="email-row">
        <label className="email-label">Subject</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} className="email-input" placeholder="Subject line" />
      </div>

      {/* Body */}
      <label className="email-label" style={{ display: 'block', marginTop: 8 }}>Message (HTML supported)</label>
      <textarea value={html} onChange={e => setHtml(e.target.value)} rows={10} className="email-body"
        placeholder="<p>Hi {first name},</p><p>...</p>  — paste or type HTML here" />
      <details style={{ marginTop: 6 }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--hc-text-muted)' }}>Preview</summary>
        <div className="email-preview" dangerouslySetInnerHTML={{ __html: html }} />
      </details>

      {/* Save as template */}
      <div className="email-row" style={{ marginTop: 8 }}>
        <input value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} className="email-input" placeholder="Save current as template (name)…" />
        <button className="btn-secondary btn-sm" onClick={onSaveTemplate}>Save template</button>
      </div>

      {/* Recipients */}
      <h4 style={{ marginTop: 20 }}>Recipients</h4>
      <div className="email-recipient-modes">
        {(['all', 'org', 'job', 'manual'] as RecipientMode[]).map(m => (
          <label key={m} className={`recip-chip ${mode === m ? 'active' : ''}`}>
            <input type="radio" name="recip" checked={mode === m} onChange={() => setMode(m)} style={{ display: 'none' }} />
            {m === 'all' ? 'All volunteers' : m === 'org' ? 'By organization' : m === 'job' ? 'By shift / job' : 'Manual'}
          </label>
        ))}
      </div>
      {mode === 'org' && (
        <select value={org} onChange={e => setOrg(e.target.value)} className="email-input" style={{ marginTop: 8 }}>
          <option value="">Select organization…</option>
          {orgs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {mode === 'job' && (
        <select value={jobName} onChange={e => setJobName(e.target.value)} className="email-input" style={{ marginTop: 8 }}>
          <option value="">Select job…</option>
          {jobs.map(j => <option key={j.id} value={j.name}>{j.name}</option>)}
        </select>
      )}
      {mode === 'manual' && (
        <textarea value={manual} onChange={e => setManual(e.target.value)} rows={3} className="email-body" style={{ marginTop: 8 }}
          placeholder="paste emails, separated by commas, spaces, or new lines" />
      )}

      <p className="note-text" style={{ marginTop: 8 }}>
        {recipients.length} recipient{recipients.length !== 1 ? 's' : ''} resolved
        {mode === 'job' && ' (from volunteers signed up for that job)'}.
      </p>

      <button className="btn-primary" style={{ width: 'auto', marginTop: 8 }} onClick={onSend} disabled={isSending}>
        {isSending ? 'Sending…' : `Send to ${recipients.length}`}
      </button>

      {result && result.failures.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <strong style={{ color: 'var(--hc-danger)' }}>Failures:</strong>
          <ul style={{ fontSize: '0.82rem' }}>
            {result.failures.map((f, i) => <li key={i}>{f.recipient}: {f.error}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
