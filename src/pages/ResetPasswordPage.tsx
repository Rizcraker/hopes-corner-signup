import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

// Landing page for the Supabase password-recovery link. Arriving here the user has a
// temporary recovery session (detectSessionInUrl), which lets updateUser set a new password.
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null); setMsg(null)
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setErr('Passwords do not match.'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      await supabase.auth.signOut()
      setMsg('Password updated. Redirecting to sign in…')
      window.setTimeout(() => navigate('/volunteer', { replace: true }), 1800)
    } catch (e: any) {
      setErr(e.message || 'Could not update password. The reset link may have expired — request a new one.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tab-fade-in">
      <div className="portal-header-box">
        <h2>Reset Your Password</h2>
        <p>Choose a new password for your Hope's Corner account.</p>
      </div>
      <div className="auth-card" style={{ maxWidth: 440, margin: '0 auto' }}>
        <form onSubmit={submit} className="auth-form">
          {err && <div className="error-banner">{err}</div>}
          {msg && <div className="info-banner">{msg}</div>}
          <div className="form-group">
            <label htmlFor="np">New Password *</label>
            <input id="np" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="form-group">
            <label htmlFor="cp">Confirm Password *</label>
            <input id="cp" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Updating…' : 'Update Password'}</button>
        </form>
      </div>
    </div>
  )
}
