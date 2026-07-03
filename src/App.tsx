import './App.css'
import { useState, useEffect } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { createClient } from '@supabase/supabase-js'
import logoGreen from './assets/Hopes_Corner_Logo_Green.png'
import sponsorsImg from './assets/hopes-corner-sponsors.png'
import lentesImg from './assets/lentes-gratis.png'

// Supabase Initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/.*$/, '') || import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Shift {
  id: number
  role: string
  time: string
  location: string
  description: string
  requirements: string
  spotsLeft: number
}

function App() {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<string>('home')
  const [communityTab, setCommunityTab] = useState<string>('stories')
  const [newsTab, setNewsTab] = useState<string>('press')
  
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
      const { data, error } = await supabase
        .from('shifts')
        .select('id, title, description, spots_left, shift_start, shift_end, location, requirements')

      if (error) throw error

      const mappedShifts = data
        .map(shift => {
          // Validate required fields
          if (!shift.title || !shift.shift_start || !shift.shift_end) {
            return null
          }

          const startDate = new Date(shift.shift_start)
          const endDate = new Date(shift.shift_end)

          // Check for invalid dates
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return null
          }

          const formattedDate = startDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          } as const)

          const startTime = startDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })

          const endTime = endDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })

          return {
            id: shift.id,
            role: shift.title,
            time: `${formattedDate} · ${startTime} - ${endTime}`,
            location: shift.location || 'Location TBD',
            description: shift.description || 'Description not available',
            requirements: shift.requirements || 'Requirements TBD',
            spotsLeft: shift.spots_left ?? 0
          }
        })
        .filter((shift): shift is Shift => shift !== null)

      setShifts(mappedShifts)
    } catch (error) {
      console.error('Error fetching shifts:', error)
      setErrorMessage('Failed to fetch shifts. Please try again.')
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
            <button onClick={() => setActiveTab('community')} className={`nav-tab ${activeTab === 'community' ? 'active' : ''}`}>Community</button>
            <button onClick={() => setActiveTab('news')} className={`nav-tab ${activeTab === 'news' ? 'active' : ''}`}>News</button>
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
                      {shifts.map((shift, index) => (
                        <div key={index} className="shift-card">
                          <div className="shift-card-header">
                            <h4>{shift.role}</h4>
                            <span className="spots-badge">{shift.spotsLeft} spots left</span>
                          </div>
                          <div className="shift-card-body">
                            <p><strong>📅 Time:</strong> {shift.time}</p>
                            <p><strong>📍 Location:</strong> {shift.location}</p>
                            <p><strong>📝 Description:</strong> {shift.description}</p>
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
          <div className="tab-fade-in content-page-layout">
            <div className="program-block" style={{ borderLeft: '4px solid var(--hc-danger)', backgroundColor: '#fdf2f2' }}>
              <h3 style={{ color: 'var(--hc-danger)', fontSize: '1.2rem', marginTop: 0 }}>IMPORTANT INFORMATION FOR UNDOCUMENTED GUESTS:</h3>
              <p style={{ marginBottom: 0 }}>We want to remind our community that Hope’s Corner provides a welcoming community for all, regardless of immigration status. We have never asked our community members for their immigration status, and our stance has not changed despite potential changes to immigration enforcement at the federal level.</p>
            </div>

            <h2>Mission, Vision, & Values</h2>
            <p>Hope's Corner became an independent 501 (c)(3) non-profit in 2015. Hope's Corner began as a joint ministry of Mountain View Trinity and Los Altos United Methodist Churches. Our wonderful volunteers include members of many different faith communities, youth and adults from other service organizations and members of the community.</p>

            <div className="services-grid">
              <div className="service-card">
                <h3>Mission</h3>
                <p>We create a community that promotes the well-being of all by providing nutritious meals and warm showers in a caring and collaborative manner</p>
              </div>
              <div className="service-card">
                <h3>Vision</h3>
                <p>We envision a community where no one is hungry</p>
              </div>
            </div>

            <div className="hours-box" style={{ textAlign: 'center' }}>
              <h4 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Values</h4>
              <p style={{ fontWeight: 'bold', margin: '0' }}>Sustainability &nbsp;-&nbsp; Community &nbsp;-&nbsp; Collaboration &nbsp;-&nbsp; Well-Being</p>
            </div>

            <h2>Who We Serve</h2>
            <p>We welcome anyone in need of a nutritious meal, warm shower, and caring community</p>

            <div style={{ margin: '20px 0', borderRadius: '12px', overflow: 'hidden' }}>
              <iframe 
                width="100%" 
                height="400" 
                src="https://www.youtube.com/embed/N1uraOliTGE" 
                title="Food For Thought || A Short Documentary Film on Food Insecurity" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen>
              </iframe>
            </div>

            <h2>Our Programs and Services</h2>
            <ul>
              <li><strong>Hot breakfast and bag lunch</strong> – Monday, Wednesday & Saturday</li>
              <li><strong>Showers and laundry service</strong> – Monday, Wednesday & Saturday</li>
              <li><strong>Referrals, Advocacy, Bicycle assistance, Clothing & Toiletries, Holiday events</strong></li>
            </ul>

            <p>People are hungry in our community. Even if employed, people earning minimum wage cannot afford both rent and food. People who are unhoused need not only a meal, but a place to feel welcomed. Hope’s Corner is addressing these needs every Monday & Wednesday 8am to 9am and Saturday between 8:00 a.m. and 10:00 a.m. by providing a nutritious breakfast and providing a bag lunch for each person to take. In addition, we offer free showers on Monday, Wednesday and Saturday mornings. Our numbers have grown from a few dozen in our beginning in 2011 to now serving over 1,000 people every month. Besides food, we provide a place for people to feel welcomed and build community. We collaborate with Second Harvest Food Bank, Community Services Agency, Peninsula Food Runners, Silicon Valley Bicycle Exchange and others to help the people we serve connect with other available services.</p>

            <div style={{ fontSize: '0.85rem', color: 'var(--hc-text-muted)', backgroundColor: 'var(--hc-white)', padding: '15px', border: '1px solid var(--hc-border)', borderRadius: '8px', margin: '20px 0' }}>
              <p>In accordance with Federal civil rights law and U.S. Department of Agriculture (USDA) civil rights regulations and policies, the USDA, its Agencies, offices, and employees, and institutions participating in or administering USDA programs are prohibited from discriminating based on race, color, national origin, sex, disability, age, or reprisal or retaliation for prior civil rights activity in any program or activity conducted or funded by USDA.</p>
              <p>Persons with disabilities who require alternative means of communication for program information (e.g. Braille, large print, audiotape, American Sign Language, etc.), should contact the Agency (State or local) where they applied for benefits. Individuals who are deaf, hard of hearing or have speech disabilities may contact USDA through the Federal Relay Service at (800) 877-8339. Additionally, program information may be made available in languages other than English.</p>
              <p>To file a program complaint of discrimination, complete the USDA Program Discrimination Complaint Form, (AD-3027) found online at: How to File a Complaint, and at any USDA office, or write a letter addressed to USDA and provide in the letter all of the information requested in the form. To request a copy of the complaint form, call (866) 632-9992. Submit your completed form or letter to USDA by:</p>
              <ul style={{ margin: '5px 0' }}>
                <li><strong>mail:</strong> U.S. Department of Agriculture, Office of the Assistant Secretary for Civil Rights, 1400 Independence Avenue, SW, Washington, D.C. 20250-9410;</li>
                <li><strong>fax:</strong> (202) 690-7442; or</li>
                <li><strong>email:</strong> program.intake@usda.gov.</li>
              </ul>
              <p style={{ marginBottom: 0 }}>This institution is an equal opportunity provider.</p>
            </div>

            <h2>2024 Demographics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '20px 0' }}>
              <img src="/src/assets/hopes1.png" alt="2024 Demographics Profile 1" style={{ width: '100%', height: 'auto', borderRadius: '8px', boxShadow: 'var(--shadow)' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=hopes1.png' }} />
              <img src="/src/assets/hopes2.png" alt="2024 Demographics Profile 2" style={{ width: '100%', height: 'auto', borderRadius: '8px', boxShadow: 'var(--shadow)' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=hopes2.png' }} />
            </div>

            <h2>Annual Reports</h2>
            <div className="program-block">
              <h3>Hope’s Corner 2024 Annual Report</h3>
              <p>2024 was a momentous year for Hope’s Corner. For the first time ever, we surpassed serving 50,000 hot meals in one year. We have provided 266,748 hot meals cumulatively since the meal program began in 2011. In 2024, Hope’s Corner:</p>
              <ul>
                <li>Served <strong>50,189 hot meals</strong> to 1,209 unduplicated individuals (a 15% increase in program usage from the prior year).</li>
                <li>Washed <strong>850 loads of laundry</strong> for 174 unduplicated individuals (a 9% increase in program usage from the prior year).</li>
                <li>Provided <strong>2,902 warm showers</strong> to 350 unduplicated individuals (a 21% increase in program usage from the prior year).</li>
              </ul>
              <p>In addition to increasing our impact in all of our core service areas, we:</p>
              <ul>
                <li>Provided 140+ haircuts for guests thanks to a partnership with Seeds of Hope Silicon Valley.</li>
                <li>Repaired 400+ bicycles thanks to volunteer bicycle mechanics and Silicon Valley Bicycle Exchange.</li>
                <li>Supplied 600+ children with toys during our Children’s Holiday Event thanks to generous community members.</li>
              </ul>
              <p>We could not have provided so much support for our community members without the generous and compassionate help provided by the 989 volunteers donating an outstanding 12,538 hours of time in 2024. We are honored and humbled that so many people chose to give their time to our organization.</p>
              <a href="https://www.hopes-corner.org/s/Hopes-Corner-2024-Annual-Report.pdf" target="_blank" rel="noreferrer" style={{ color: 'var(--hc-green-primary)', fontWeight: 'bold' }}>The full report [PDF version] can be found here.</a>
            </div>

            <p style={{ margin: '15px 0 5px 0' }}><strong>2023 Annual Report</strong></p>
            <p style={{ marginTop: 0 }}><a href="https://www.hopes-corner.org/s/2023-Infographic-Final.pdf" target="_blank" rel="noreferrer" style={{ color: 'var(--hc-green-primary)' }}>A summary of our 2023 Annual Report can be found here.</a></p>

            <p style={{ margin: '15px 0 5px 0' }}><strong>2022 Annual Report</strong></p>
            <p style={{ marginTop: 0 }}><a href="https://www.hopes-corner.org/s/2022-Infographic-Final-yasd.pdf" target="_blank" rel="noreferrer" style={{ color: 'var(--hc-green-primary)' }}>A summary of our 2022 Annual Report can be found here.</a></p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', margin: '40px 0 20px 0' }}>
              <div>
                <h3 style={{ color: 'var(--hc-green-primary)', borderBottom: '2px solid var(--hc-border)', paddingBottom: '10px' }}>2026 Board Members</h3>
                <ul style={{ listStyleType: 'none', paddingLeft: 0, lineHeight: '1.8' }}>
                  <li><strong>Leslie Carmichael</strong>, President</li>
                  <li><strong>Alice Cota</strong>, Vice President</li>
                  <li><strong>Judy Ho</strong>, Treasurer</li>
                  <li><strong>Phil Marcoux</strong>, Secretary</li>
                  <li>Dave Arnone, Member</li>
                  <li>Leslie Berlin, Member</li>
                  <li>Gwen Chong, Member</li>
                  <li>Mike Hacker, Member</li>
                  <li>Shari Kipp, Member</li>
                  <li>Sudhir Pendse, Member</li>
                  <li>Jana Powell, Member</li>
                  <li>Claire Yang, Member</li>
                  <li>Tom Myers, Member</li>
                </ul>
              </div>
              
              <div>
                <h3 style={{ color: 'var(--hc-green-primary)', borderBottom: '2px solid var(--hc-border)', paddingBottom: '10px' }}>Staff Members</h3>
                <ul style={{ listStyleType: 'none', paddingLeft: 0, lineHeight: '1.8' }}>
                  <li><strong>Caleb A</strong>, Meal Program Assistant</li>
                  <li><strong>Ariana B</strong>, Volunteer Coordinator</li>
                  <li><strong>Araceli B</strong>, Senior Shower and Laundry Program Assistant</li>
                  <li><strong>Miguel MC</strong>, Kitchen Manager</li>
                  <li><strong>Isabelle F</strong>, Shower and Laundry Program Assistant</li>
                  <li><strong>Maddy L</strong>, Corporate Engagement Program Manager</li>
                  <li><strong>John R</strong>, Executive Director</li>
                  <li><strong>Tori R</strong>, Donations and Bicycle Program Assistant</li>
                  <li><strong>Priscilla V</strong>, Volunteer and Operations Manager</li>
                </ul>
              </div>
            </div>

            <h2>Hope's Corner's Collaborations</h2>
            <p>Hope’s Corner collaborates with other agencies and organizations in order to connect our guests with available services without attempting to duplicate services already being provided. These collaborations include:</p>
            <ul>
              <li><strong>Community Services Agency</strong> provides case managers on-site every Thursday during Hope’s Corner’s shower program hours so that guests can meet with a case manager when they are waiting for a shower.</li>
              <li><strong>UCSF Nurse Interns</strong> visit during Hope’s Corner’s Thursday shower program hours to check basic health conditions, such as blood pressure, blood sugar, heart rate, etc.</li>
              <li><strong>HomeFirst</strong> provides a Cold Weather Shelter during the winter at the site shared with Hope’s Corner. Hope’s Corner adjusted the timing of the setup for Saturday breakfast to accommodate the shelter, provides a volunteer every night to ensure that showers are available and helps to coordinate basic logistics between the uses.</li>
              <li><strong>Silicon Valley Bicycle Exchange</strong> provides bicycles upon request by the Hope’s Corner bicycle liaison so that our homeless guests who need bicycles can obtain them. Hope’s Corner purchases lights and locks through the Bicycle Exchange. The Silicon Valley Bicycle Exchange also provides children’s bicycles for the annual Hope’s Corner Children’s Party.</li>
              <li><strong>Walgreens and Stanford Hospital</strong> have provided free flu shot clinics during the Saturday breakfast once each year.</li>
              <li>Hope’s Corner collaborates with the <strong>Day Worker Center</strong> and <strong>CHAC Family Resource Center</strong> to host a Children’s Christmas Party each year to provide crafts for the kids and a place for parents to shop for holiday gifts.</li>
              <li><strong>Second Harvest Food Bank</strong> provides food, plus representatives come to Hope’s Corner occasionally to screen guests for CalFresh benefits.</li>
              <li><strong>Santa Clara County Health Department</strong> provides monthly healthy eating and fitness literature in multiple languages that Hope’s Corner prints and provides to guests.</li>
              <li><strong>Valley Homeless Healthcare Program</strong> operated by Santa Clara Valley Medical Center provides a mobile medical van in North County at the Community Service Agency and the Sunnyvale Winter Shelter. Hope’s Corner makes referrals to these two sites.</li>
              <li><strong>MayView Community Health Center</strong> provides medical care to Hope’s Corner clients regardless of ability to pay. In addition, a dental van comes to MayView Mountain View clinics to which guests can be referred.</li>
              <li><strong>El Camino Healthcare District</strong> has provided generous grants since 2015 that help Hope's Corner purchase fresh, healthy food.</li>
            </ul>

            <h2>Job Opportunities</h2>
            <p className="note-text">Thank you for your interest in working at Hope’s Corner. At this time, we do not currently have any paid opportunities available.</p>
          </div>
        )}

        {/* ================= COMMUNITY TAB ================= */}
        {activeTab === 'community' && (
          <div className="tab-fade-in text-section">
            <div className="community-sub-tabs">
              <button
                onClick={() => setCommunityTab('stories')}
                className={`community-sub-btn ${communityTab === 'stories' ? 'active' : ''}`}
              >Stories</button>
              <button
                onClick={() => setCommunityTab('sponsors')}
                className={`community-sub-btn ${communityTab === 'sponsors' ? 'active' : ''}`}
              >Sponsors &amp; Partners</button>
              <button
                onClick={() => setCommunityTab('resources')}
                className={`community-sub-btn ${communityTab === 'resources' ? 'active' : ''}`}
              >Resources</button>
            </div>

            {communityTab === 'stories' && (
              <div>
                <h2>Stories</h2>
                <p>Real stories from the people who make Hope's Corner what it is — volunteers, guests, and neighbors.</p>
                <div className="story-card">
                  <h3>Mikey</h3>
                  <p>Mikey found his way back to what he lost — and someone who is very dear to him, his mother.</p>
                  <a href="https://www.hopes-corner.org/lost-and-foundhope-for-a-better-future" target="_blank" rel="noreferrer" className="story-link">Read Mikey's story →</a>
                </div>
                <div className="story-card">
                  <h3>Saint Claire</h3>
                  <p>To family, friends, and neighbors she's Claire Hubel — a mother, wife, and Mountain View resident. But to the guests who come to Hope's Corner on Thursdays to shower, she's "Saint Claire," one of the most dedicated volunteers Hope's Corner has.</p>
                  <a href="https://www.hopes-corner.org/saint-claire" target="_blank" rel="noreferrer" className="story-link">Read Saint Claire's story →</a>
                </div>
                <div className="story-card">
                  <h3>Bill and Elsa</h3>
                  <p>Bill explains how Hope's Corner has provided a safe place to find community as well as a meal and a shower. Video generously provided by KMTV.</p>
                  <a href="https://youtu.be/EVyqX03VF_U" target="_blank" rel="noreferrer" className="story-link">Watch Bill and Elsa's video →</a>
                </div>
                <div className="story-card">
                  <h3>Susan and Alex Dole</h3>
                  <p>"How can we have anyone with food insecurity HERE?" — Susan and Alex share what they learned volunteering in downtown Mountain View and why Hope's Corner's mission stayed with them.</p>
                  <a href="https://www.hopes-corner.org/enlightening-and-inspriring-" target="_blank" rel="noreferrer" className="story-link">Read Susan and Alex's story →</a>
                </div>
                <div className="story-card">
                  <h3>In Remembrance of Edward Lee Hamm</h3>
                  <p>Edward was a long-time client at Hope's Corner, often arriving with his Stanford Continuation Studies book. Born in Marion, South Carolina, he was an enigma — until we became friends.</p>
                  <a href="https://www.hopes-corner.org/in-remembrance-of-edward-lee-hamm" target="_blank" rel="noreferrer" className="story-link">Read Marilyn Winkleby's remembrance →</a>
                </div>
                <p style={{ marginTop: '30px', color: 'var(--hc-text-muted)', fontSize: '0.95rem' }}>
                  Want to share your own story as a volunteer or guest? Email us at{' '}
                  <a href="mailto:info@hopes-corner.org" style={{ color: 'var(--hc-green-primary)' }}>info@hopes-corner.org</a>.
                </p>
              </div>
            )}

            {communityTab === 'sponsors' && (
              <div>
                <h2>Sponsors &amp; Partners</h2>
                <p>Hope's Corner is made possible through the generous support of these organizations and community partners.</p>
                <img
                  src={sponsorsImg}
                  alt="Hope's Corner Sponsors and Partners"
                  style={{ width: '100%', maxWidth: '760px', height: 'auto', display: 'block', margin: '24px auto', borderRadius: '8px', border: '1px solid var(--hc-border)' }}
                  onError={(e) => { (e.target as HTMLImageElement).alt = 'Sponsors image unavailable' }}
                />
              </div>
            )}

            {communityTab === 'resources' && (
              <div>
                <h2>Resources</h2>

                <div className="program-block">
                  <h3>City of Mountain View — Homeless Services</h3>
                  <p>The City collaborates with local agencies, nonprofits, and volunteers to maintain a broad range of support for community members. They also maintain a resource list for low-income and unhoused individuals.</p>
                  <a href="https://www.mountainview.gov/our-city/departments/city-managers-office/human-services/homeless-services" target="_blank" rel="noreferrer" style={{ color: 'var(--hc-green-primary)', fontWeight: 600 }}>
                    View City Resources →
                  </a>
                </div>

                <div className="program-block">
                  <h3>The United Effort Organization</h3>
                  <p>748 Mercy Street, Mountain View · (650) 209-0850</p>
                  <p>Services include Public Assistance Programs, Resources, Mentors, and phones. Representatives are available at Hope's Corner on Wednesdays 8am–9am and Saturdays 8:30am–10:30am.</p>
                  <a href="http://theunitedeffort.org" target="_blank" rel="noreferrer" style={{ color: 'var(--hc-green-primary)', fontWeight: 600 }}>
                    theunitedeffort.org →
                  </a>
                  <br /><br />
                  <a href="https://www.theunitedeffort.org/housing/affordable-housing/" target="_blank" rel="noreferrer" style={{ color: 'var(--hc-green-primary)' }}>
                    Find affordable housing →
                  </a>
                </div>

                <div className="program-block">
                  <h3>Adult Eyeglasses — Free, 1st Saturday of Each Month</h3>
                  <div className="hours-box">
                    <h4>8:00 AM – 10:00 AM · First Saturday of every month</h4>
                    <p style={{ margin: 0 }}>At Hope's Corner · 748 Mercy Street, Mountain View</p>
                  </div>
                  <p>In partnership with the <strong>Stanford Housing Equity Project (SHEP)</strong>, The United Effort Organization provides free glasses for unhoused individuals or recipients of public benefits. Bring your prescription if you have one!</p>
                  <img
                    src={lentesImg}
                    alt="Lentes Gratis — Free Eyeglasses flyer"
                    style={{ width: '100%', maxWidth: '420px', height: 'auto', display: 'block', marginTop: '16px', borderRadius: '8px', border: '1px solid var(--hc-border)' }}
                    onError={(e) => { (e.target as HTMLImageElement).alt = 'Flyer unavailable' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= NEWS TAB ================= */}
        {activeTab === 'news' && (
          <div className="tab-fade-in text-section">
            <div className="community-sub-tabs">
              <button
                onClick={() => setNewsTab('press')}
                className={`community-sub-btn ${newsTab === 'press' ? 'active' : ''}`}
              >Press</button>
              <button
                onClick={() => setNewsTab('newsletters')}
                className={`community-sub-btn ${newsTab === 'newsletters' ? 'active' : ''}`}
              >Newsletters</button>
            </div>

            {newsTab === 'press' && (
              <div>
                <h2>Press</h2>
                <ul className="press-list">
                  <li><a href="https://www.cbsnews.com/sanfrancisco/news/peninsula-couple-found-joint-ministry-to-feed-support-homeless-residents/" target="_blank" rel="noreferrer">Peninsula couple found joint ministry to feed, support homeless residents</a></li>
                  <li><a href="https://www.mv-voice.com/transportation/2026/02/17/changing-gears-local-nonprofits-provide-bikes-to-low-income-residents/" target="_blank" rel="noreferrer">Changing Gears: Local Nonprofits Provide Bikes To Low-Income Residents <span className="press-date">(Mountain View Voice, Feb 2026)</span></a></li>
                  <li><a href="https://www.mv-voice.com/community/2025/08/29/community-briefs-art-and-wine-festival-free-bike-repairs-and-mvhs-25-year-reunion/#h-hope-s-corner-expands-free-bicycle-repair-service" target="_blank" rel="noreferrer">Hope's Corner expands free bicycle repair service <span className="press-date">(Aug 2025)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/schools/los-altos-teens-reducing-food-waste-by-collecting-produce-for-hope-s-corner/article_4fc53a04-011d-4a0a-a7e4-d9ed0e0b79b9.html" target="_blank" rel="noreferrer">Los Altos teens reducing food waste by collecting produce for Hope's Corner <span className="press-date">(Los Altos Town Crier, Aug 2025)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/community/hope-s-corner-building-community-one-meal-and-shower-at-a-time/article_d2c7f398-a146-11ef-8b24-0f8688af63b3.html" target="_blank" rel="noreferrer">Hope's Corner: Building community one meal and shower at a time <span className="press-date">(Nov 2024)</span></a></li>
                  <li><a href="https://bikex.org/15-about/partners/275-hopes-corner-beacon-of-support" target="_blank" rel="noreferrer">Hope's Corner: A Beacon of Support in Mountain View <span className="press-date">(Oct 2024)</span></a></li>
                  <li><a href="https://www.mv-voice.com/community/2024/07/26/community-briefs-hopes-corner-fundraiser-national-night-out-and-a-library-book-sale/" target="_blank" rel="noreferrer">Tour de Hope raises over $15K for Mountain View nonprofit Hope's Corner <span className="press-date">(Jul 2024)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/community/foundation-prioritizes-economic-uncertainty-in-round-of-grants/article_d34d02c2-439f-11ef-8866-e7a65b93021f.html" target="_blank" rel="noreferrer">Foundation prioritizes 'economic uncertainty' in round of grants <span className="press-date">(Jul 2024)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/community/tour-de-hope-2024-turning-wheels-into-meals/article_da721632-3e27-11ef-82d7-a7ade41b5ba3.html" target="_blank" rel="noreferrer">Tour de Hope 2024: Turning wheels into meals <span className="press-date">(Jul 2024)</span></a></li>
                  <li><a href="https://www.mv-voice.com/news/2024/01/05/holiday-fund-hopes-corner-mountain-views-local-weekend-meal-service-strives-to-help-those-in-need" target="_blank" rel="noreferrer">Holiday Fund: Hope's Corner, Mountain View's local weekend meal service <span className="press-date">(Jan 2024)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/holidayfund/hope-s-corner-providing-hot-meals-showers-for-vulnerable-residents/article_9df50702-7daf-11ee-adc5-4b20b17e338b.html" target="_blank" rel="noreferrer">Hope's Corner: Providing hot meals, showers for vulnerable residents <span className="press-date">(Nov 2023)</span></a></li>
                  <li><a href="https://www.mv-voice.com/news/2023/09/18/hopes-corner-in-mountain-view-offers-first-sit-down-meal-service-since-the-start-of-the-pandemic" target="_blank" rel="noreferrer">Hope's Corner in Mountain View offers first sit-down meal service since the pandemic <span className="press-date">(Sep 2023)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/news/hope-s-corner-marks-milestone-with-200-000th-meal-served/article_ccb30fb0-46a2-11ee-a841-4ffc7947beaa.html" target="_blank" rel="noreferrer">Hope's Corner marks milestone with 200,000th meal served <span className="press-date">(Aug 2023)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/community/hope-s-corner-tour-de-hope-fundraiser-returns-july-21/article_bc95ca22-0239-11ed-a0b0-1366cda783c3.html" target="_blank" rel="noreferrer">Hope's Corner Tour de Hope fundraiser returns July 21 <span className="press-date">(Jul 2022)</span></a></li>
                  <li><a href="https://www.mv-voice.com/news/2022/07/07/tour-de-hope-bike-fundraiser-is-full-speed-ahead-after-two-year-hiatus" target="_blank" rel="noreferrer">Tour de Hope bike fundraiser is full speed ahead after two-year hiatus <span className="press-date">(Jul 2022)</span></a></li>
                  <li><a href="https://lavozdeanza.com/features/2022/06/18/a-de-anza-student-reflects-on-finding-power-and-community/" target="_blank" rel="noreferrer">A De Anza student reflects on finding power and community <span className="press-date">(Jun 2022)</span></a></li>
                  <li><a href="https://mv-voice.com/news/2022/03/11/mountain-view-fire-department-offers-helping-hand-after-resident-was-struck-by-a-car" target="_blank" rel="noreferrer">Mountain View Fire Department offers helping hand after resident was struck by a car <span className="press-date">(Mar 2022)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/community/a-cut-above-mtn-view-s-hope-s-corner-offers-free-spa-day-for-the/article_27f9a222-c337-11eb-b6f8-c3e90a293584.html" target="_blank" rel="noreferrer">Haircuts for the homeless at Spa Day <span className="press-date">(Jun 2021)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/news/sections/community/177-features/64226-hope-s-corner-showers-reopen-for-homeless" target="_blank" rel="noreferrer">Hope's Corner reopens showers for the homeless <span className="press-date">(Mar 2021)</span></a></li>
                  <li><a href="https://www.mv-voice.com/news/2021/02/12/hopes-corner-serves-its-100000th-meal" target="_blank" rel="noreferrer">Hope's Corner serves its 100,000th meal <span className="press-date">(Mountain View Voice, Feb 2021)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/news/sections/community/177-features/63913-hope-s-corner-serves-100-000th-meal" target="_blank" rel="noreferrer">Hope's Corner serves 100,000th meal <span className="press-date">(Los Altos Town Crier, Feb 2021)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/news/sections/community/178-upcoming-events/63723-hope-s-corner-seeks-toy-gift-card-donations" target="_blank" rel="noreferrer">Hope's Corner seeks toy, gift-card donations <span className="press-date">(Dec 2020)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/news/sections/community/177-features/63554-local-boy-scouts-decorate-grocery-bags-for-nonprofit-group" target="_blank" rel="noreferrer">Local Boy Scouts decorate grocery bags for nonprofit group <span className="press-date">(Nov 2020)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/news/sections/community/177-features/63109-high-school-volunteer-hosts-virtual-fundraiser-for-hope-s-corner" target="_blank" rel="noreferrer">High school volunteer hosts virtual fundraiser for Hope's Corner <span className="press-date">(Sep 2020)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/news/sections/community/177-features/62925-hope-s-corner-hosts-virtual-5k-fundraiser-for-one-more-week" target="_blank" rel="noreferrer">Hope's Corner hosts virtual 5K fundraiser for one more week <span className="press-date">(Jul 2020)</span></a></li>
                  <li><a href="https://mv-voice.com/news/2020/06/07/guest-opinion-hopes-corner-launches-new-services-in-response-to-coronavirus-pandemic" target="_blank" rel="noreferrer">Guest opinion: Hope's Corner launches new services in response to coronavirus pandemic <span className="press-date">(Jun 2020)</span></a></li>
                  <li><a href="https://www.losaltosonline.com/news/sections/community/177-features/62370-homeless-at-hope-s-corner-get-empowered-with-chargers" target="_blank" rel="noreferrer">Homeless at Hope's Corner get 'empowered' with chargers <span className="press-date">(Apr 2020)</span></a></li>
                  <li><a href="https://www.mv-voice.com/news/2019/05/15/major-upgrades-transform-downtown-church-into-hub-of-homeless-services" target="_blank" rel="noreferrer">Major upgrades transform downtown church into hub of homeless services <span className="press-date">(May 2019)</span></a></li>
                </ul>
              </div>
            )}

            {newsTab === 'newsletters' && (
              <div>
                <h2>Newsletters</h2>
                <p>Read our past newsletters to stay connected with Hope's Corner's community and programs.</p>
                <div className="newsletter-grid">
                  {[
                    { label: 'April 2026', url: 'https://www.hopes-corner.org/s/Email-Marketing-April-2026-Newsletter.pdf' },
                    { label: 'March 2026', url: 'https://www.hopes-corner.org/s/Email-Marketing-March-2026-Newsletter.pdf' },
                    { label: 'February 2026', url: 'https://www.hopes-corner.org/s/Hopes-Corner-Newsletter-February-2026.pdf' },
                    { label: 'January 2026', url: 'https://www.hopes-corner.org/s/Email-Marketing-January-2026-Newsletter.pdf' },
                    { label: 'December 2025', url: 'https://www.hopes-corner.org/s/Email-Marketing-December-2025-Newsletter-2.pdf' },
                    { label: 'November 2025', url: 'https://www.hopes-corner.org/s/November-2025-Newsletter.pdf' },
                    { label: 'October 2025', url: 'https://www.hopes-corner.org/s/Email-Marketing-October-2025-Newsletter.pdf' },
                    { label: 'September 2025', url: 'https://www.hopes-corner.org/s/Email-Marketing-September-2025-Newsletter.pdf' },
                    { label: 'August 2025', url: 'https://www.hopes-corner.org/s/August-2025' },
                    { label: 'July 2025', url: 'https://www.hopes-corner.org/s/Email-Marketing-July-2025-Newsletter.pdf' },
                    { label: 'June 2025', url: 'https://www.hopes-corner.org/s/Email-Marketing-June-2025-Newsletter.pdf' },
                    { label: 'May 2025', url: 'https://www.hopes-corner.org/s/May-2025-Newsletter.pdf' },
                    { label: 'April 2025', url: 'https://www.hopes-corner.org/s/Email-Marketing-April-2025-Newsletter.pdf' },
                    { label: 'March 2025', url: 'https://www.hopes-corner.org/s/Email-Marketing-March-2025-Newsletter.pdf' },
                    { label: 'February 2025', url: 'https://www.hopes-corner.org/s/Email-Marketing-February-2025-Newsletter.pdf' },
                    { label: 'January 2025', url: 'https://www.hopes-corner.org/s/Email-Marketing-January-2025-Newsletter.pdf' },
                    { label: 'December 2024', url: 'https://www.hopes-corner.org/s/Email-Marketing-December-2024-Newsletter.pdf' },
                    { label: 'November 2024', url: 'https://www.hopes-corner.org/s/Email-Marketing-November-2024-Newsletter.pdf' },
                    { label: 'October 2024', url: 'https://www.hopes-corner.org/s/Email-Marketing-October-2024-Newsletter.pdf' },
                    { label: 'September 2024', url: 'https://www.hopes-corner.org/s/September-2024' },
                    { label: 'June 2024', url: 'https://www.hopes-corner.org/s/June-2024-Newsletter.pdf' },
                    { label: 'May 2024', url: 'https://www.hopes-corner.org/s/Email-Marketing-May-2024-Newsletter-2.pdf' },
                    { label: 'April 2024', url: 'https://www.hopes-corner.org/s/Email-Marketing-April-2024-Newsletter.pdf' },
                    { label: 'March 2024', url: 'https://www.hopes-corner.org/s/Email-Marketing-March-2024-Newletter.pdf' },
                    { label: 'February 2024', url: 'https://www.hopes-corner.org/s/February-2024-Newsletter.pdf' },
                    { label: 'January 2024', url: 'https://www.hopes-corner.org/s/Email-Marketing-January-2024-Newsletter.pdf' },
                    { label: 'December 2023', url: 'https://www.hopes-corner.org/s/Email-Marketing-December-Newsletter.pdf' },
                    { label: 'November 2023', url: 'https://www.hopes-corner.org/s/Email-Marketing-November-2023-Hope-s-Corner-Newsletter-compressed.pdf' },
                    { label: 'October 2023', url: 'https://vr2.verticalresponse.com/emails/23089744256053?contact_id=23089754268655&sk=a24oB2JgVjBLE21VaAOoF5KCF37GSfLI' },
                    { label: 'September 2023', url: 'https://vr2.verticalresponse.com/emails/23089744255875?contact_id=23089746500771&sk=a24oB2JgVjBJEyFtaAOoF5E3kEnobPRz' },
                    { label: 'August 2023', url: 'https://vr2.verticalresponse.com/emails/23089744255847?contact_id=23089746500771&sk=a24oB2JgVjBJtHFhaAOoF5KySwZG9Rrk' },
                    { label: 'July 2023', url: 'https://vr2.verticalresponse.com/emails/23089744255735?contact_id=23089753846043&sk=a24oB2JgVjBIXcV1aAOoF5DEQ_0BNgUO' },
                    { label: 'June 2023', url: 'https://vr2.verticalresponse.com/emails/23089744255711?contact_id=23089746500771&sk=a24oB2JgVjBJqdSNaAOoF5ENaE1GInoV' },
                    { label: 'May 2023', url: 'https://vr2.verticalresponse.com/emails/23089744255614?contact_id=23089746500771&sk=a24oB2JgVjBJVQiFaAOoF5IhuTRB9gK9' },
                    { label: 'April 2023', url: 'https://vr2.verticalresponse.com/emails/23089744255401?contact_id=23089746500771&sk=a24oB2JgVjBJMNyZaAOoF5OhZI3TMXZY' },
                    { label: 'March 2023', url: 'https://vr2.verticalresponse.com/emails/23089744255369?contact_id=23089746500771&sk=a24oB2JgVjBIZziRaAOoF5LTXjf_LLWd' },
                    { label: 'February 2023', url: 'https://vr2.verticalresponse.com/emails/23089744255361?contact_id=23089746500771&sk=a24oB2JgVjBJAlS9aAOoF5DiDWLbTiS9' },
                    { label: 'January 2023', url: 'https://vr2.verticalresponse.com/emails/23089744255276?contact_id=23089746500771&sk=a24oB2JgVjBLkiC1aAOoF5BeoxnLSguX' },
                    { label: 'December 2022', url: 'https://vr2.verticalresponse.com/emails/23089744255136?contact_id=23089746500771&sk=a24oB2JgVjBKMXTFaAOoF5H1TV1GGAaw' },
                    { label: 'November 2022', url: 'https://vr2.verticalresponse.com/emails/23089744254970?contact_id=23089746500771&sk=a24oB2JgVjBKPOjZaAOoF5P3vOVNTBTh' },
                    { label: 'October 2022', url: 'https://vr2.verticalresponse.com/emails/23089744254844?contact_id=23089746500771&sk=a24oB2JgVjBKUPDlaAOoF5ODRXimeRyG' },
                    { label: 'September 2022', url: 'https://vr2.verticalresponse.com/emails/23089744254685?contact_id=23089746500771&sk=a24oB2JgVjBJC3DhaAOoF5GHFHodzEbt' },
                    { label: 'August 2022', url: 'https://vr2.verticalresponse.com/emails/23089744254603?contact_id=23089746500771&sk=a24oB2JgVjBItHwNaAOoF5AvqB_e29_K' },
                    { label: 'July 2022', url: 'https://vr2.verticalresponse.com/emails/23089744254288?sk=a24oB2JgVjBKtJwZaAOoF5OuhCsfKYyPJNrfwwo8lJRY%3D%2FaHR0cHM6Ly92' },
                    { label: 'June 2022', url: 'https://vr2.verticalresponse.com/emails/23089744254287?contact_id=23089746500771&sk=a24oB2JgVjBJEEwtaAOoF5L_k3ID9_4M' },
                    { label: 'May 2022', url: 'https://vr2.verticalresponse.com/emails/23089744254381?contact_id=23089746500771&sk=a24oB2JgVjBI8XQhaAOoF5L-2Ti29iF9' },
                    { label: 'April 2022', url: 'https://vr2.verticalresponse.com/emails/23089744254285?contact_id=23089746500771&sk=a24oB2JgVjBK4CQ1aAOoF5Cu8JXuVF14' },
                    { label: 'March 2022', url: 'https://vr2.verticalresponse.com/emails/23089744254099?contact_id=23089746500771&sk=a24oB2JgVjBJqgRFaAOoF5I9LrSl10yf' },
                    { label: 'February 2022', url: 'https://vr2.verticalresponse.com/emails/23089744254015?contact_id=23089746500771&sk=a24oB2JgVjBKNcxVaAOoF5IzQUNNboxF' },
                    { label: 'January 2022', url: 'https://vr2.verticalresponse.com/emails/23089744253985?contact_id=23089746500771&sk=a24oB2JgVjBJd8hRaAOoF5O1W2xo3iiz' },
                    { label: 'December 2021', url: 'https://vr2.verticalresponse.com/emails/23089744253847?contact_id=23089746500771&sk=a24oB2JgVjBKx9hhaAOoF5FG9ijqcf_B' },
                    { label: 'November 2021', url: 'https://vr2.verticalresponse.com/emails/23089744253675?contact_id=23089746500771&sk=a24oB2JgVjBJnHeFaAOoF5OSI3aGXAjs' },
                    { label: 'October 2021', url: 'https://vr2.verticalresponse.com/emails/23089744253476?contact_id=23089746500771&sk=a24oB2JgVjBJTwutaAOoF5LzKnyiwieG' },
                    { label: 'December 2020', url: 'https://vr2.verticalresponse.com/emails/23089744251161?sk=a24oB2JgVjBJb4VxZAOoF5AMwRQcy_6WRumIogLcBjr8%3D%2FaHR0cHM6Ly92' },
                    { label: 'November 2020', url: 'https://vr2.verticalresponse.com/emails/23089744250651?sk=a24oB2JgVjBKT7zdZAOoF5IXANwBlCEcuHYP5zdlY2uU%3D%2FaHR0cHM6Ly92' },
                    { label: 'September 2020', url: 'https://vr2.verticalresponse.com/emails/23089744250194?sk=a24oB2JgVjBJnfgBZAOoF5GRUvQTf-DFQNWTRve1I_ac%3D%2FaHR0cHM6Ly92' },
                    { label: 'July 2020', url: 'https://vr2.verticalresponse.com/emails/23089744249776?sk=a24oB2JgVjBJmp-lZAOoF5OgxUrzfNepS7m3ww-Rx1Hw%3D%2FaHR0cHM6Ly92' },
                    { label: 'April 2020', url: 'https://vr2.verticalresponse.com/emails/23089744248649?sk=a24oB2JgVjBIHYWtYAOoF5N98k3KjPqi1wyOcT1p96gU%3D%2FaHR0cHM6Ly92' },
                    { label: 'March 2020', url: 'https://vr2.verticalresponse.com/emails/23089744248278?sk=a24oB2JgVjBKFe1pYAOoF5Cd5PpeKK_9pZd6vCJ7BIJ0%3D%2FaHR0cHM6Ly92' },
                  ].map(({ label, url }) => (
                    <a key={label} href={url} target="_blank" rel="noreferrer" className="newsletter-chip">
                      📄 {label}
                    </a>
                  ))}
                </div>
              </div>
            )}
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

      {/* Conditionally Rendered Badges Row (Home and Donate tabs only) */}
      {(activeTab === 'home' || activeTab === 'donate') && (
        <section className="badges-section" style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap', padding: '20px' }}>
          <img 
            src={new URL('./assets/Four-Star+Rating+Badge+-+Full+Color.png', import.meta.url).href} 
            alt="Four Star Rating Badge" 
            style={{ height: '110px', width: 'auto', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x110?text=Four+Star+Badge' }} 
          />
          <img 
            src={new URL('./assets/image_826ea5.png', import.meta.url).href} 
            alt="Guidestar Platinum Transparency Badge" 
            style={{ height: '110px', width: 'auto', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x110?text=Guidestar+Badge' }} 
          />
          <img 
            src={new URL('./assets/2024-top-rated-awards-badge-hi-res.png', import.meta.url).href} 
            alt="2024 Top Rated Awards Badge" 
            style={{ height: '110px', width: 'auto', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x110?text=2024+Top+Rated' }} 
          />
        </section>
      )}

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