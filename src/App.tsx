import './App.css'
import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/.*$/, '') || import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Define the shape of a shift object
interface Shift {
  id: number
  role: string
  time: string
  location: string
}

// Placeholder database of volunteering shifts
const SHIFTS_DB: Shift[] = [
  { id: 1, role: 'Food Server', time: 'Sat, Jun 22 · 9:00 AM - 1:00 PM', location: 'Community Kitchen' },
  { id: 2, role: 'Event Setup', time: 'Sat, Jun 22 · 2:00 PM - 6:00 PM', location: 'Town Hall' },
  { id: 3, role: 'Cleanup Crew', time: 'Sun, Jun 23 · 10:00 AM - 2:00 PM', location: 'Park Cleanup' },
  { id: 4, role: 'Registration Desk', time: 'Sun, Jun 23 · 3:00 PM - 7:00 PM', location: 'Volunteer Center' },
]

function App() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSignupError(null)
    setSignupLoading(true)

    try {
      // Sign up user with Supabase Auth
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            first_name: firstName
          }
        }
      })

      if (error) {
        throw error
      }

      // Optional: Insert additional user data into a public.users table
      // Uncomment and adjust if you have a users table set up
      /*
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        await supabase.from('users').insert({
          id: userData.user.id,
          email: email,
          first_name: firstName,
          created_at: new Date().toISOString()
        })
      }
      */

      setSubmitted(true)
      setEmail('')
      setFirstName('')
      setPassword('')
      await fetchShifts()
    } catch (error: any) {
      console.error('Signup error:', error)
      setSignupError(error.message || 'An error occurred during signup')
    } finally {
      setSignupLoading(false)
    }
  }

  const fetchShifts = async () => {
    setLoading(true)
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800))
      // In a real app, this would be an API call
      setShifts([...SHIFTS_DB])
    } catch (error) {
      console.error('Failed to fetch shifts:', error)
      setShifts([])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await fetchShifts()
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Volunteer Shift Manager</h1>
        <p>
          Thank you for your interest in Hope's Corner!
          New volunteers: Please enter your name, email, and password below to complete an application and waiver. Once submitted, you can view and sign up for shifts. Please review age and physical requirements for each role, sign-ups may be removed if requirements aren’t met.
          Returning volunteers: Please enter your name and email below to sign up for shifts or view your scheduled shifts.
        </p>
      </header>

      <main>
        {!submitted ? (
          <form onSubmit={handleSubmit} className="sign-in-form">
            <h2>Sign Up</h2>
            <label>
              Email:
              <input
                type="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              First Name:
              <input
                type="text"
                value={firstName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                required
              />
            </label>
            <label>
              Password:
              <input
                type="password"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </label>
            {signupError && <p className="error-message">{signupError}</p>}
            <button type="submit" disabled={signupLoading}>
              {signupLoading ? 'Signing up...' : 'Submit'}
            </button>
          </form>
        ) : (
          <>
            <div className="success-message">
              <p>Thank you, {firstName}! Here are the available volunteering opportunities:</p>
            </div>

            {loading ? (
              <p className="loading">Loading opportunities...</p>
            ) : (
              <>
                {shifts.length > 0 ? (
                  <>
                    <button onClick={handleRefresh} className="refresh-button">
                      Refresh Opportunities
                    </button>
                    <ul className="shifts-list">
                      {shifts.map((shift: Shift) => (
                        <li key={shift.id} className="shift-item">
                          <div className="shift-info">
                            <strong>{shift.role}</strong>
                            <span className="shift-time">{shift.time}</span>
                          </div>
                          <div className="shift-location">📍 {shift.location}</div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="no-shifts">No volunteering opportunities available at the moment.</p>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App