import type { FormEvent } from 'react'
import { AGE_RANGES, parentLinkMode } from '../../utils/ageRange'

// All state is owned by useVolunteerAuth (called in App) and passed down, so an in-progress
// registration survives navigating away from /volunteer and back, exactly as it does today.
interface AuthPanelProps {
  isSignUp: boolean
  setIsSignUp: (v: boolean) => void
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  showPassword: boolean
  setShowPassword: (v: boolean) => void
  errorMessage: string | null
  setErrorMessage: (v: string | null) => void
  infoMessage: string | null
  setInfoMessage: (v: string | null) => void
  authLoading: boolean
  registrationStep: number
  setRegistrationStep: (v: number) => void
  firstName: string
  setFirstName: (v: string) => void
  lastName: string
  setLastName: (v: string) => void
  birthday: string
  setBirthday: (v: string) => void
  ageRange: string
  setAgeRange: (v: string) => void
  parentEmail: string
  setParentEmail: (v: string) => void
  phoneNumber: string
  setPhoneNumber: (v: string) => void
  emergencyContactName: string
  setEmergencyContactName: (v: string) => void
  emergencyContactPhone: string
  setEmergencyContactPhone: (v: string) => void
  employer: string
  setEmployer: (v: string) => void
  streetAddress: string
  setStreetAddress: (v: string) => void
  city: string
  setCity: (v: string) => void
  zipCode: string
  setZipCode: (v: string) => void
  organization: string
  setOrganization: (v: string) => void
  customGroup: string
  setCustomGroup: (v: string) => void
  groupOptions: string[]
  resetProfileFields: () => void
  handleAuthSubmit: (e: FormEvent) => Promise<void>
}

function AuthPanel({
  isSignUp,
  setIsSignUp,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  errorMessage,
  setErrorMessage,
  infoMessage,
  setInfoMessage,
  authLoading,
  registrationStep,
  setRegistrationStep,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  birthday,
  setBirthday,
  ageRange,
  setAgeRange,
  parentEmail,
  setParentEmail,
  phoneNumber,
  setPhoneNumber,
  emergencyContactName,
  setEmergencyContactName,
  emergencyContactPhone,
  setEmergencyContactPhone,
  employer,
  setEmployer,
  streetAddress,
  setStreetAddress,
  city,
  setCity,
  zipCode,
  setZipCode,
  organization,
  setOrganization,
  customGroup,
  setCustomGroup,
  groupOptions,
  resetProfileFields,
  handleAuthSubmit,
}: AuthPanelProps) {
  return (
    <div className="auth-card">
      <div className="auth-toggle-tabs">
        <button type="button" className={`tab-btn ${isSignUp ? 'active' : ''}`} onClick={() => { setIsSignUp(true); setErrorMessage(null); setInfoMessage(null); setRegistrationStep(1); resetProfileFields(); }}>
          New Volunteer
        </button>
        <button type="button" className={`tab-btn ${!isSignUp ? 'active' : ''}`} onClick={() => { setIsSignUp(false); setErrorMessage(null); setInfoMessage(null); setRegistrationStep(1); resetProfileFields(); }}>
          Returning Volunteer
        </button>
      </div>

      <form onSubmit={handleAuthSubmit} className="auth-form">
        {isSignUp && (
          <span className="step-indicator">
            Step {registrationStep} of 2 · {registrationStep === 1 ? 'Account' : 'Your Details'}
          </span>
        )}
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
                  <label htmlFor="ageRange">Age Range *</label>
                  <select id="ageRange" value={ageRange} onChange={(e) => setAgeRange(e.target.value)} required>
                    <option value="">Select your age range</option>
                    {AGE_RANGES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                {parentLinkMode(ageRange) !== 'none' && (
                  <div className="form-group">
                    <label htmlFor="parentEmail">
                      Parent/Guardian Volunteer Email{parentLinkMode(ageRange) === 'required' ? ' *' : ''}
                    </label>
                    <input
                      id="parentEmail"
                      type="email"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="parent@example.com"
                      required={parentLinkMode(ageRange) === 'required'}
                    />
                    <p className="field-hint">
                      {parentLinkMode(ageRange) === 'required'
                        ? '14–15 volunteers must link a parent/guardian who has a volunteer account — you can’t sign up for shifts without it.'
                        : 'Optional — link a parent or guardian who also volunteers.'}
                    </p>
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="birthday">Birthday <span className="optional-tag">(optional)</span></label>
                  <input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
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
  )
}

export default AuthPanel
