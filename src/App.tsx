import './App.css'
import { useState, useEffect } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { createClient } from '@supabase/supabase-js'
import logoGreen from './assets/Hopes_Corner_Logo_Green.png'

// Supabase Initialization
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
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<string>('home')
  
  // Auth & Portal State
  const [isSignUp, setIsSignUp] = useState(true)
  const [userSession, setUserSession] = useState<any>(null)
  const [isBypassActive, setIsBypassActive] = useState(false)
  
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  // User info data from user_info supabase tracking matrix
  const [userInfo, setUserInfo] = useState<{
    hours_volunteered: number;
    active_shifts: string[];
    first_name: string;
    last_name: string;
    birthday: string | null;
    phone_number: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    employer: string;
    street_address: string;
    city: string;
    zip_code: string;
    organization: string;
  } | null>(null)

  // Registration flow state
  const [registrationStep, setRegistrationStep] = useState(1);

  // profile fields
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [employer, setEmployer] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [organization, setOrganization] = useState('');
  const [customGroup, setCustomGroup] = useState('');
  const [groupOptions, setGroupOptions] = useState<string[]>(["Hope's Corner", "Local Church", "Community Group", "Other"]);

  const resetProfileFields = () => {
    setFirstName('');
    setLastName('');
    setBirthday('');
    setPhoneNumber('');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setEmployer('');
    setStreetAddress('');
    setCity('');
    setZipCode('');
    setOrganization('');
    setCustomGroup('');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session)
      if (session) {
        fetchShifts()
        fetchUserInfo(session)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession(session)
      if (session) {
        fetchShifts()
        fetchUserInfo(session)
      } else {
        setUserInfo(null)
        setShifts([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserInfo = async (session = userSession) => {
    if (!session?.user) return
    try {
      const { data, error } = await supabase
        .from('user_info')
        .select('hours_volunteered, active_shifts, first_name, last_name, birthday, phone_number, emergency_contact_name, emergency_contact_phone, employer, street_address, city, zip_code, organization')
        .eq('user_id', session.user.id)
        .single()

      if (error) {
        // If no record exists, create one with default values
        if (error.code === 'PGRST116') {
          await supabase.from('user_info').insert({
            user_id: session.user.id,
            hours_volunteered: 0,
            active_shifts: [],
            first_name: '',
            last_name: '',
            birthday: null,
            phone_number: '',
            emergency_contact_name: '',
            emergency_contact_phone: '',
            employer: '',
            street_address: '',
            city: '',
            zip_code: '',
            organization: ''
          })
          setUserInfo({
            hours_volunteered: 0,
            active_shifts: [],
            first_name: '',
            last_name: '',
            birthday: null,
            phone_number: '',
            emergency_contact_name: '',
            emergency_contact_phone: '',
            employer: '',
            street_address: '',
            city: '',
            zip_code: '',
            organization: ''
          })
        } else {
          throw error
        }
      } else {
        const parsedActiveShifts = Array.isArray(data.active_shifts)
          ? data.active_shifts
          : typeof data.active_shifts === 'string'
            ? JSON.parse(data.active_shifts)
            : []

        setUserInfo({
          hours_volunteered: data.hours_volunteered,
          active_shifts: parsedActiveShifts,
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          birthday: data.birthday ?? null,
          phone_number: data.phone_number ?? '',
          emergency_contact_name: data.emergency_contact_name ?? '',
          emergency_contact_phone: data.emergency_contact_phone ?? '',
          employer: data.employer ?? '',
          street_address: data.street_address ?? '',
          city: data.city ?? '',
          zip_code: data.zip_code ?? '',
          organization: data.organization ?? ''
        })
      }
    } catch (error) {
      console.error('Error fetching user info:', error)
      setUserInfo({
        hours_volunteered: 0,
        active_shifts: [],
        first_name: '',
        last_name: '',
        birthday: null,
        phone_number: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        employer: '',
        street_address: '',
        city: '',
        zip_code: '',
        organization: ''
      })
    }
  }

  const updateActiveShifts = async (shift: Shift) => {
    // If inside Developer bypass mode, mimic the state transition gracefully
    if (isBypassActive) {
      const shiftDescription = `${shift.role} - ${shift.time}`
      setUserInfo(prev => {
        if (!prev) return null
        const currentShifts = prev.active_shifts
        if (currentShifts.includes(shiftDescription)) return prev
        return {
          ...prev,
          active_shifts: [...currentShifts, shiftDescription]
        }
      })
      return
    }

    if (!userSession?.user || !userInfo) return
    try {
      setErrorMessage(null)
      const shiftDescription = `${shift.role} - ${shift.time}`

      if (userInfo.active_shifts.includes(shiftDescription)) {
        setErrorMessage('You are already signed up for this shift.')
        return
      }

      const newActiveShifts = [...userInfo.active_shifts, shiftDescription]

      const { error } = await supabase
        .from('user_info')
        .update({ active_shifts: newActiveShifts })
        .eq('user_id', userSession.user.id)

      if (error) throw error

      setUserInfo(prev => {
        if (!prev) return null
        return { ...prev, active_shifts: newActiveShifts }
      })
    } catch (error) {
      console.error('Error updating active shifts:', error)
      setErrorMessage('Failed to update your shift list. Please try again.')
    }
  }

  const removeActiveShift = async (shiftDescription: string) => {
    // If inside Developer bypass mode, mimic the state transition gracefully
    if (isBypassActive) {
      setUserInfo(prev => {
        if (!prev) return null
        return {
          ...prev,
          active_shifts: prev.active_shifts.filter(shift => shift !== shiftDescription)
        }
      })
      return
    }

    if (!userSession?.user || !userInfo) return
    try {
      setErrorMessage(null)
      const newActiveShifts = userInfo.active_shifts.filter(shift => shift !== shiftDescription)

      const { error } = await supabase
        .from('user_info')
        .update({ active_shifts: newActiveShifts })
        .eq('user_id', userSession.user.id)

      if (error) throw error

      setUserInfo(prev => {
        if (!prev) return null
        return { ...prev, active_shifts: newActiveShifts }
      })
    } catch (error) {
      console.error('Error removing active shift:', error)
      setErrorMessage('Failed to remove shift. Please try again.')
    }
  }

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setInfoMessage(null)
    setAuthLoading(true)

    try {
      if (isSignUp) {
        if (registrationStep === 1) {
          // Move to next step (profile info)
          setRegistrationStep(2)
        } else if (registrationStep === 2) {
          // Perform sign up with profile data
          const finalOrganization = organization === 'Other' ? customGroup : organization;
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: firstName,
                last_name: lastName,
                birthday: birthday,
                phone_number: phoneNumber,
                emergency_contact_name: emergencyContactName,
                emergency_contact_phone: emergencyContactPhone,
                employer: employer,
                street_address: streetAddress,
                city: city,
                zip_code: zipCode,
                organization: finalOrganization
              },
              emailRedirectTo: window.location.origin
            }
          })
          if (error) throw error
          if (data.user) {
            // Create corresponding row in user_info table
            await supabase.from('user_info').insert({
              user_id: data.user.id,
              hours_volunteered: 0,
              active_shifts: [],
              first_name: firstName,
              last_name: lastName,
              birthday: birthday || null,
              phone_number: phoneNumber,
              emergency_contact_name: emergencyContactName,
              emergency_contact_phone: emergencyContactPhone,
              employer: employer,
              street_address: streetAddress,
              city: city,
              zip_code: zipCode,
              organization: finalOrganization
            })
            setInfoMessage('Registration successful! Please check your email for verification.')
            // Reset form for next registration
            setEmail('')
            setPassword('')
            setFirstName('')
            setLastName('')
            setBirthday('')
            setPhoneNumber('')
            setEmergencyContactName('')
            setEmergencyContactPhone('')
            setEmployer('')
            setStreetAddress('')
            setCity('')
            setZipCode('')
            setOrganization('')
            setCustomGroup('')
            setRegistrationStep(1)
          }
          // If email verification required, show message (already covered by data.session === null)
          if (data.user && data.session === null) {
            setInfoMessage('Registration initiated! Please check your inbox for a verification email.')
          }
        }
      } else {
        // Login flow unchanged
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'An operational error occurred.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUserSession(null)
    setIsBypassActive(false)
    setShifts([])
    setUserInfo(null)
    setInfoMessage(null)
    setRegistrationStep(1)
    resetProfileFields()
  }

  const fetchShifts = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setShifts([...SHIFTS_DB])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isBypassActive) {
      fetchShifts()
      if (!userInfo) {
        setUserInfo({
          hours_volunteered: 8,
          active_shifts: [],
          first_name: '',
          last_name: '',
          birthday: null,
          phone_number: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          employer: '',
          street_address: '',
          city: '',
          zip_code: '',
          organization: ''
        })
      }
    }
  }, [isBypassActive])

  const getUserName = () => {
    if (isBypassActive) return 'Sandbox Dev'
    return userSession?.user?.user_metadata?.first_name || userSession?.user?.email || 'Volunteer'
  }

  return (
    <div className="App">
      {/* Universal Top Navigation Header */}
      <header className="navbar">
        <div className="nav-container">
          <div className="nav-brand-group">
            <img src={logoGreen} alt="Hope's Corner Logo" className="app-logo" />
            <h1 className="header-title">Hope's Corner</h1>
          </div>
          <nav className="nav-tabs">
            <button onClick={() => setActiveTab('home')} className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`}>Home</button>
            <button onClick={() => setActiveTab('donate')} className={`nav-tab ${activeTab === 'donate' ? 'active' : ''}`}>Donate</button>
            <button onClick={() => setActiveTab('volunteer')} className={`nav-tab ${activeTab === 'volunteer' ? 'active' : ''}`}>Volunteer</button>
            <button onClick={() => setActiveTab('learn')} className={`nav-tab ${activeTab === 'learn' ? 'active' : ''}`}>Learn</button>
            <button onClick={() => setActiveTab('about')} className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`}>About</button>
            <button className="nav-tab disabled-tab" disabled title="Coming soon">Community</button>
            <button className="nav-tab disabled-tab" disabled title="Coming soon">News</button>
            <button onClick={() => setActiveTab('contact')} className={`nav-tab ${activeTab === 'contact' ? 'active' : ''}`}>Contact</button>
          </nav>
        </div>
      </header>

      {/* Primary Display Content Grid */}
      <main className="main-content">
        
        {/* ================= HOME TAB ================= */}
        {activeTab === 'home' && (
          <div className="tab-fade-in">
            <section className="hero-section">
              <div className="image-wrapper">
                <img 
                  src={new URL('./assets/Website+photo+1.jpeg', import.meta.url).href} 
                  alt="Hope's Corner community" 
                  className="hero-image" 
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=1100' }} 
                />
              </div>
              <div className="hero-text-box">
                <p className="intro-text">
                  Hope’s Corner meets the needs of our community by providing free nutritious meals and warm showers to anyone in need. We believe in one inclusive community that cares for all of its people.
                </p>
              </div>
            </section>

            <section className="services-section">
              <h2>Our Essential Services</h2>
              <div className="services-grid">
                <div className="service-card">
                  <h3>Free Hot Breakfast & Bag Lunches</h3>
                  <p>Served every Monday 8am-9am, Wednesday 8am-9am and Saturday 8am-10am.</p>
                </div>
                <div className="service-card">
                  <h3>Free Shower & Laundry Program</h3>
                  <p>Operating hours are Monday 8:30am – noon, Wednesday 8:30am-noon and Saturday 8:30am-2pm.</p>
                </div>
              </div>
            </section>

            <section className="location-section">
              <h2>Where to Find Us</h2>
              <p className="location-text">748 Mercy Street in downtown Mountain View. We are at the corner of Hope and Mercy Streets, one block from Castro Street.</p>
              <div className="section-barrier"></div>
              <div className="image-wrapper">
                <img 
                  src={new URL('./assets/Website+photo+2+(1).jpeg', import.meta.url).href} 
                  alt="Location Map" 
                  className="map-image" 
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1100' }} 
                />
              </div>
            </section>
          </div>
        )}

        {/* ================= DONATE TAB ================= */}
        {activeTab === 'donate' && (
          <div className="tab-fade-in text-section">
            <h2>Support Our Mission</h2>
            <p>We are a tax-exempt nonprofit supported entirely by donations and community grants from individuals and organizations alike.</p>
            <div style={{ margin: '30px 0' }}>
              <a href="https://give-usa.keela.co/general-donations20" target="_blank" rel="noreferrer" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-block', width: 'auto' }}>
                Make a General Donation via Keela
              </a>
            </div>
          </div>
        )}

        {/* ================= VOLUNTEER PORTAL TAB ================= */}
        {activeTab === 'volunteer' && (
          <div className="tab-fade-in">
            <div className="portal-header-box">
              <h2>Hope's Corner Volunteering Hub</h2>
              <p>Join hands with our community. Sign up for active operations, food service duties, and support shifts below.</p>
            </div>

            {!userSession && !isBypassActive ? (
              <div className="auth-card">
                <div className="dev-testing-banner">
                  <span>🛠️ Sandbox Testing Mode Active</span>
                  <button type="button" className="btn-bypass" onClick={() => setIsBypassActive(true)}>
                    ⏩ Jump Straight to Shift Selection Page
                  </button>
                </div>

                <div className="auth-toggle-tabs">
                  <button type="button" className={`tab-btn ${isSignUp ? 'active' : ''}`} onClick={() => { setIsSignUp(true); setErrorMessage(null); setInfoMessage(null); setRegistrationStep(1); resetProfileFields(); }}>
                    New Volunteer
                  </button>
                  <button type="button" className={`tab-btn ${!isSignUp ? 'active' : ''}`} onClick={() => { setIsSignUp(false); setErrorMessage(null); setInfoMessage(null); setRegistrationStep(1); resetProfileFields(); }}>
                    Returning Volunteer
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="auth-form">
                  <h3>{isSignUp ? 'Create an Account' : 'Welcome Back'}</h3>
                  <p className="form-instructions">
                    {isSignUp
                      ? 'Sign up to view, manage, and claim active volunteering shifts.'
                      : 'Log in with your email and password to coordinate your current schedule.'}
                  </p>

                  {/* Always show email and password */}
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">Password *</label>
                    <div className="password-input-wrapper">
                      <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                      <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {/* Error and Info messages - always show */}
                  {errorMessage && <div className="error-banner">{errorMessage}</div>}
                  {infoMessage && <div className="info-banner">{infoMessage}</div>}

                  {/* Conditional content based on isSignUp and registrationStep */}
                  {isSignUp ? (
                    <> 
                      {registrationStep === 1 && (
                        <>
                          <button type="submit" className="btn-primary" disabled={authLoading}>
                            {authLoading ? 'Processing...' : 'Next'}
                          </button>
                        </>
                      )}
                      {registrationStep === 2 && (
                        <>
                          <div className="form-group">
                            <label htmlFor="firstName">First Name *</label>
                            <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                          </div>
                          <div className="form-group">
                            <label htmlFor="lastName">Last Name *</label>
                            <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                          </div>
                          <div className="form-group">
                            <label htmlFor="birthday">Birthday *</label>
                            <input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} required />
                          </div>
                          <div className="form-group">
                            <label htmlFor="phoneNumber">Phone Number *</label>
                            <input id="phoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
                          </div>
                          <div className="form-group">
                            <label htmlFor="emergencyContactName">Emergency Contact Name *</label>
                            <input id="emergencyContactName" type="text" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} required />
                          </div>
                          <div className="form-group">
                            <label htmlFor="emergencyContactPhone">Emergency Contact Phone # *</label>
                            <input id="emergencyContactPhone" type="tel" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} required />
                          </div>
                          <div className="form-group">
                            <label htmlFor="employer">Employer</label>
                            <input id="employer" type="text" value={employer} onChange={(e) => setEmployer(e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label htmlFor="streetAddress">Street Address</label>
                            <input id="streetAddress" type="text" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label htmlFor="city">City</label>
                            <input id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label htmlFor="zipCode">Zip Code</label>
                            <input id="zipCode" type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label htmlFor="organization">Organization/Group</label>
                            <select id="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} >
                              <option value="">Select or type</option>
                              {groupOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label htmlFor="customGroup">Or add your own group</label>
                            <input id="customGroup" type="text" value={customGroup} onChange={(e) => setCustomGroup(e.target.value)} />
                            <p style={{fontSize: '0.8rem', color: '#666'}}>If you select "Other" above, you can type your group here.</p>
                          </div>
                          <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '1rem'}}>
                            <button type="button" className="btn-secondary" onClick={() => setRegistrationStep(1)}>
                              Back
                            </button>
                            <button type="submit" className="btn-primary" disabled={authLoading}>
                              {authLoading ? 'Creating Account...' : 'Register'}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <button type="submit" className="btn-primary" disabled={authLoading}>
                        {authLoading ? 'Signing In...' : 'Sign In'}
                      </button>
                    </>
                  )}
                </form>
              </div>
            ) : (
              <div className="dashboard-container">
                <div className="welcome-banner">
                  <div>
                    <h3>Welcome back, {getUserName()}!</h3>
                    <p>Thank you for contributing your time and energy to Hope's Corner.</p>
                    
                    {/* Database metric stats display */}
                    {userInfo && (
                      <div className="user-db-stats">
                        <p className="user-stats">
                          <strong>Hours Volunteered:</strong> {userInfo.hours_volunteered}
                        </p>
                        {userInfo.active_shifts.length > 0 && (
                          <div className="active-shifts-list">
                            <h4>Your Active Scheduled Shifts:</h4>
                            <ul>
                              {userInfo.active_shifts.map((shift, idx) => (
                                <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span>✅ {shift}</span>
                                  <button
                                    onClick={() => removeActiveShift(shift)}
                                    className="trash-btn"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#ff6b6b',
                                      cursor: 'pointer',
                                      fontSize: '1.2rem',
                                      padding: '0',
                                      marginLeft: '0.5rem'
                                    }}
                                    title="Remove shift"
                                  >
                                    ✕
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={handleSignOut} className="btn-secondary logout-btn">Log Out</button>
                </div>

                <div className="shifts-section">
                  <div className="section-header">
                    <h3>Available Volunteering Shifts</h3>
                    <button onClick={fetchShifts} className="btn-refresh" disabled={loading}>
                      {loading ? 'Refreshing...' : '🔄 Refresh List'}
                    </button>
                  </div>

                  {errorMessage && <div className="error-banner">{errorMessage}</div>}

                  {loading ? (
                    <div className="loading-spinner">Loading shift schedule...</div>
                  ) : (
                    <div className="shifts-grid">
                      {shifts.map((shift) => (
                        <div key={shift.id} className="shift-card">
                          <div className="shift-card-header">
                            <h4>{shift.role}</h4>
                            <span className="spots-badge">{shift.spotsLeft} spots left</span>
                          </div>
                          <div className="shift-card-body">
                            <p><strong>📅 Time:</strong> {shift.time}</p>
                            <p><strong>📍 Location:</strong> {shift.location}</p>
                            <div className="shift-requirements"><strong>⚠️ Requirements:</strong> {shift.requirements}</div>
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
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= LEARN TAB ================= */}
        {activeTab === 'learn' && (
          <div className="tab-fade-in content-page-layout">
            <h2>Our Programs & Services</h2>
            
            <section className="program-block">
              <h3>Meal Program</h3>
              <p>Our meal program is relied upon by unhoused, low-income, and vulnerable adults, seniors, and children from Mountain View and surrounding communities who are hungry. All welcome – no one is turned away!</p>
              <p>Hope’s Corner serves hot, nutritious meals every Monday, Wednesday and Saturday on site. In addition to providing hot meals, we always provide guests with a substantial lunch bag that includes items like beef jerky, sandwiches, fruit, granola bars, etc. This program offer a reliable source of substantial, balanced, and nutritious meals that improves the health of our meal guests.</p>
              <div className="hours-box">
                <h4>Hours of Operation for on-site meal program:</h4>
                <ul>
                  <li><strong>Monday and Wednesday:</strong> 8:00am - 9:00am (to-go style)</li>
                  <li><strong>Saturdays:</strong> 8:00am - 9:00am (seated service)</li>
                </ul>
              </div>
              <p>In addition to serving meals every Monday, Wednesday, and Saturday on site, we also provide:</p>
              <ul>
                <li>Hot meals to neighbors living in vehicles every Monday, Wednesday, Thursday, and Saturday.</li>
                <li>A light breakfast on Friday mornings (consisting of a bagel, breakfast sandwich, or pastry).</li>
              </ul>
            </section>

            <section className="program-block">
              <h3>Shower & Laundry Program</h3>
              <p>Hope’s Corner provides showers and laundry services to unhoused guests every Monday, Wednesday and Saturday. Guests sign up for a shower or laundry slot during our meal service and are offered on a first-come, first serve basis.</p>
              <div className="hours-box">
                <h4>Hours of Operation:</h4>
                <ul>
                  <li><strong>Mondays and Wednesdays:</strong> 8:30am - 12:00pm</li>
                  <li><strong>Saturdays:</strong> 8:30am - 2:00pm</li>
                </ul>
              </div>
            </section>

            <section className="program-block">
              <h3>Bicycle Program</h3>
              <p>Hope’s Corner repairs guest bicycles and provides refurbished bikes to guests when available. This program operates on Saturday mornings and is on a first-come, first-serve basis based on the complexity of repairs and volunteer availability.</p>
              <div className="hours-box">
                <h4>Hours of Operation:</h4>
                <ul>
                  <li><strong>Saturdays:</strong> 8:00am - 11:00am*</li>
                </ul>
              </div>
              <p className="note-text"><em>*Note: the Bicycle Program typically repairs between 10-15 bikes every Saturday. Although we have volunteers on site repairing bikes until 11:00am, it does not mean that we will repair bicycles brought to the program up until 11am. Our suggestion is that guests bring their bike before 9:30am so we can guarantee it will be repaired.</em></p>
            </section>

            <section className="program-block">
              <h3>Holiday Program</h3>
              <p>Every December, Hope’s Corner invites local community members to our site to participate in our Holiday Program. Parents and guardians must register their children prior to the Holiday Program (information will be posted on our website). We typically serve the parents and guardians of about 600 children during this popular event!</p>
            </section>
          </div>
        )}

        {/* ================= ABOUT TAB ================= */}
        {activeTab === 'about' && (
          <div className="tab-fade-in text-section">
            <h2>About Hope's Corner</h2>
            <p>Read about our mission, vision, and core structural values, in addition to learning about who we serve and the essential community protection operations we offer daily.</p>
          </div>
        )}

        {/* ================= CONTACT TAB ================= */}
        {activeTab === 'contact' && (
          <div className="tab-fade-in text-section">
            <h2>Want to know more?</h2>
            <p>Send us an email using the form below or call us at <strong>650-254-1450</strong>.</p>
            
            <form className="contact-form-placeholder" onSubmit={(e) => e.preventDefault()}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" placeholder="Your Name" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="Your Email" />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea rows={4} placeholder="How can we help you?" style={{ width: '100%', borderRadius: '7px', border: '1px solid var(--hc-border)', padding: '10px', boxSizing: 'border-box' }}></textarea>
              </div>
              <button className="btn btn-primary" type="button" style={{ width: 'auto' }}>Send Message</button>
            </form>
          </div>
        )}

      </main>

      {/* Mini Strategic Badges Row */}
      <section className="badges-section">
        <div className="badge-item">
          <span className="badge-icon">🎖️</span>
          <div className="badge-text"><strong>2024 Top Rated</strong> Non-Profit Award</div>
        </div>
        <div className="badge-item">
          <span className="badge-icon">⭐</span>
          <div className="badge-text"><strong>Four-Star Rating</strong> Choice Presentation</div>
        </div>
        <div className="badge-item">
          <span className="badge-icon">💎</span>
          <div className="badge-text"><strong>GuideStar Platinum</strong> Transparency Standard</div>
        </div>
      </section>

      {/* Footer component */}
      <footer className="footer">
        <div className="social-links-container">
          <ul className="social-links-list">
            <li><a href="https://www.linkedin.com/company/hopes-corner-org/" target="_blank" rel="noreferrer">LinkedIn</a></li>
            <li><a href="https://www.instagram.com/hopescorner_mv" target="_blank" rel="noreferrer">Instagram</a></li>
            <li><a href="https://www.facebook.com/hopescornermv" target="_blank" rel="noreferrer">Facebook</a></li>
          </ul>
        </div>
        <p>&copy; 2026 Hope's Corner. All Rights Reserved.</p>
      </footer>
    </div>
  )
}

export default App