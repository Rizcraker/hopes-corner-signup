import './App.css'
import { useState, useEffect } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { createClient } from '@supabase/supabase-js'
import logoGreen from './assets/Hopes_Corner_Logo_Green.png'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/.*$/, '') || import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Shift {
  id: number
  role: string
  time: string
  location: string
  requirements: string
  spotsLeft: number
}

const SHIFTS_DB: Shift[] = [
  {
    id: 1,
    role: 'Breakfast Food Server',
    time: 'Sat, Jun 22 · 7:00 AM - 10:00 AM',
    location: 'Hope\'s Corner Kitchen',
    requirements: 'Age 16+, ability to stand for 3 hours, friendly attitude.',
    spotsLeft: 4
  },
  {
    id: 2,
    role: 'Lunch Prep & Packing',
    time: 'Sat, Jun 22 · 10:15 AM - 1:30 PM',
    location: 'Hope\'s Corner Kitchen',
    requirements: 'Age 16+, basic kitchen safety knowledge preferred.',
    spotsLeft: 2
  },
  {
    id: 3,
    role: 'Shower Program Monitor',
    time: 'Sat, Jun 22 · 8:00 AM - 12:00 PM',
    location: 'Shower Facilities',
    requirements: 'Age 18+, clear communication skills, background check required.',
    spotsLeft: 1
  },
  {
    id: 4,
    role: 'Site Cleanup & Breakdown',
    time: 'Sat, Jun 22 · 1:00 PM - 3:00 PM',
    location: 'Main Hall / Kitchen',
    requirements: 'Age 14+ (with adult), ability to lift up to 25 lbs.',
    spotsLeft: 5
  },
]

function App() {
  const [isSignUp, setIsSignUp] = useState(true)
  const [userSession, setUserSession] = useState<any>(null)

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [password, setPassword] = useState('')
  // Password visible toggle track state
  const [showPassword, setShowPassword] = useState(false)

  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  // User info from user_info table
  const [userInfo, setUserInfo] = useState<{ hours_volunteered: number; active_shifts: string[] } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session)
      if (session) {
        fetchShifts()
        fetchUserInfo()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession(session)
      if (session) {
        fetchShifts()
        fetchUserInfo()
      } else {
        setUserInfo(null)
        setShifts([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserInfo = async () => {
    if (!userSession?.user) return
    try {
      const { data, error } = await supabase
        .from('user_info')
        .select('hours_volunteered, active_shifts')
        .eq('user_id', userSession.user.id)
        .single()

      if (error) {
        // If no record exists, create one with default values
        if (error.code === 'PGRST116') { // not found
          await supabase.from('user_info').insert({
            user_id: userSession.user.id,
            hours_volunteered: 0,
            active_shifts: [] // Will be stored as JSON array
          })
          setUserInfo({ hours_volunteered: 0, active_shifts: [] })
        } else {
          throw error
        }
      } else {
        // Parse active_shifts if it's a JSON string
        const parsedActiveShifts = Array.isArray(data.active_shifts)
          ? data.active_shifts
          : typeof data.active_shifts === 'string'
            ? JSON.parse(data.active_shifts)
            : []

        setUserInfo({
          hours_volunteered: data.hours_volunteered,
          active_shifts: parsedActiveShifts
        })
      }
    } catch (error) {
      console.error('Error fetching user info:', error)
      setUserInfo({ hours_volunteered: 0, active_shifts: [] }) // fallback
    }
  }

  const updateActiveShifts = async (shift: Shift) => {
    if (!userSession?.user || !userInfo) return
    try {
      // Create shift description
      const shiftDescription = `${shift.role} - ${shift.time}`

      // Check if already signed up for this shift (optional)
      if (userInfo.active_shifts.includes(shiftDescription)) {
        setErrorMessage('You are already signed up for this shift.')
        return
      }

      // Add new shift to the list
      const newActiveShifts = [...userInfo.active_shifts, shiftDescription]

      const { error } = await supabase
        .from('user_info')
        .update({ active_shifts: newActiveShifts })
        .eq('user_id', userSession.user.id)

      if (error) throw error

      // Update local state
      setUserInfo(prev => {
        if (!prev) return null
        return { ...prev, active_shifts: newActiveShifts }
      })
    } catch (error) {
      console.error('Error updating active shifts:', error)
      setErrorMessage('Failed to update your shift list. Please try again.')
    }
  }

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setInfoMessage(null)
    setAuthLoading(true)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { first_name: firstName },
            emailRedirectTo: window.location.origin
          }
        })
        if (error) throw error

        if (data.user && data.session === null) {
          setInfoMessage('Registration initiated! Please check your inbox for a verification email to activate your account before logging in.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        })
        if (error) throw error
      }

      setEmail('')
      setFirstName('')
      setPassword('')
    } catch (error: any) {
      console.error('Auth error:', error)
      if (error.message?.includes('rate limit')) {
        setErrorMessage('Too many attempts. Please wait a few minutes before trying again.')
      } else {
        setErrorMessage(error.message || 'An operational error occurred.')
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUserSession(null)
    setShifts([])
    setUserInfo(null)
    setInfoMessage(null)
  }

  const fetchShifts = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setShifts([...SHIFTS_DB])
    } catch (error) {
      console.error('Error fetching shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUserName = () => {
    return userSession?.user?.user_metadata?.first_name || userSession?.user?.email || 'Volunteer'
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-container">
          <div className="logo-wrapper">
            <img
              src={logoGreen}
              alt="Hope's Corner Logo"
              className="app-logo"
            />
          </div>
          <div className="header-text">
            <h1>Hope's Corner Volunteering Hub</h1>
            <p className="subtitle">Sharing hope, one meal and one shower at a time.</p>
          </div>
        </div>
      </header>

      <main className="main-content">
        {!userSession ? (
          <div className="auth-card">
            <div className="auth-toggle-tabs">
              <button
                type="button"
                className={`tab-btn ${isSignUp ? 'active' : ''}`}
                onClick={() => { setIsSignUp(true); setErrorMessage(null); setInfoMessage(null); }}
              >
                New Volunteer
              </button>
              <button
                type="button"
                className={`tab-btn ${!isSignUp ? 'active' : ''}`}
                onClick={() => { setIsSignUp(false); setErrorMessage(null); setInfoMessage(null); }}
              >
                Returning Volunteer
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="auth-form">
              <h2>{isSignUp ? 'Create an Account' : 'Welcome Back'}</h2>
              <p className="form-instructions">
                {isSignUp
                  ? 'Sign up to view, manage, and claim active volunteering shifts.'
                  : 'Log in with your email and password to coordinate your current schedule.'}
              </p>

              {isSignUp && (
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️ Hide' : '👁️ Show'}
                  </button>
                </div>
              </div>

              {errorMessage && <div className="error-banner">{errorMessage}</div>}
              {infoMessage && <div className="info-banner">{infoMessage}</div>}

              <button type="submit" className="btn-primary" disabled={authLoading}>
                {authLoading ? 'Processing...' : (isSignUp ? 'Register & Apply' : 'Sign In')}
              </button>
            </form>
          </div>
        ) : (
          <div className="dashboard-container">
            <div className="welcome-banner">
              <div>
                <h2>Welcome back, {getUserName()}!</h2>
                <p>Thank you for contributing your time and energy to Hope's Corner.</p>
                {userInfo && (
                  <>
                    <p className="user-stats">
                      Hours Volunteered: {userInfo.hours_volunteered}
                    </p>
                    {userInfo.active_shifts.length > 0 && (
                      <div className="active-shifts-list">
                        <h4>Your Active Shifts:</h4>
                        <ul>
                          {userInfo.active_shifts.map((shift, index) => (
                            <li key={index}>{shift}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
              <button onClick={handleSignOut} className="btn-secondary logout-btn">
                Log Out
              </button>
            </div>

            <div className="shifts-section">
              <div className="section-header">
                <h3>Available Volunteering Shifts</h3>
                <button onClick={fetchShifts} className="btn-refresh" disabled={loading}>
                  {loading ? 'Refreshing...' : '🔄 Refresh List'}
                </button>
              </div>

              {loading ? (
                <div className="loading-spinner">Loading shift schedule matrix...</div>
              ) : shifts.length > 0 ? (
                <div className="shifts-grid">
                  {shifts.map((shift: Shift) => (
                    <div key={shift.id} className="shift-card">
                      <div className="shift-card-header">
                        <h4>{shift.role}</h4>
                        <span className="spots-badge">
                          {shift.spotsLeft} {shift.spotsLeft === 1 ? 'spot' : 'spots'} left
                        </span>
                      </div>
                      <div className="shift-card-body">
                        <p className="shift-detail"><strong>📅 Time:</strong> {shift.time}</p>
                        <p className="shift-detail"><strong>📍 Location:</strong> {shift.location}</p>
                        <div className="shift-requirements">
                          <strong>⚠️ Requirements:</strong> {shift.requirements}
                        </div>
                      </div>
                      <div className="shift-card-footer">
                        <button
                          className="btn-accent"
                          onClick={async () => {
                            await updateActiveShifts(shift)
                            alert(`Successfully requested to join the "${shift.role}" shift!`)
                          }}
                        >
                          Claim This Shift
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-shifts">No shifts available right now. Check back shortly!</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App