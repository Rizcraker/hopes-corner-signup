import { useState, useEffect } from 'react'
import type { FormEvent, RefObject } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { UserInfo } from '../types/userInfo'
import { useGroups } from './useGroups'

// The auth listener and sign-out have to drive the shifts / user-info hooks, but those hooks in
// turn need setErrorMessage from this one. Passing them through a ref breaks that cycle: App fills
// the ref in during render, so it is always populated before the effect below (or any event
// handler) can run.
export interface AuthDataBridge {
  fetchShifts: () => Promise<void>
  fetchUserInfo: (session: any) => Promise<void>
  clearShifts: () => void
  clearUserInfo: () => void
  updateShiftSpotsLeft: (shiftId: string, change: number) => Promise<void>
  setUserInfo: (info: UserInfo | null) => void
}

export function useVolunteerAuth(bridge: RefObject<AuthDataBridge>) {
  // Auth & Portal State
  const [isSignUp, setIsSignUp] = useState(true)
  const [userSession, setUserSession] = useState<any>(null)

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [authLoading, setAuthLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  // Admin status
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(true)

  // Registration flow state
  const [registrationStep, setRegistrationStep] = useState(1);

  // profile fields
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState('');        // optional now
  const [ageRange, setAgeRange] = useState('');         // operational eligibility field
  const [parentEmail, setParentEmail] = useState('');   // linked parent/guardian (minors)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [employer, setEmployer] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [organization, setOrganization] = useState('');
  const [customGroup, setCustomGroup] = useState('');

  // Organizations come from the admin-managed `groups` table (readable pre-auth).
  const { groups, fetchGroups } = useGroups();
  useEffect(() => { fetchGroups(); }, [fetchGroups]);
  const groupOptions = [...groups.map(g => g.name), 'Other'];

  const resetProfileFields = () => {
    setFirstName('');
    setLastName('');
    setBirthday('');
    setAgeRange('');
    setParentEmail('');
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

  const checkAdminStatus = async (userId: string) => {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        // A record means this user is an admin
        setIsAdmin(!!data);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session)
      if (session) {
        bridge.current.fetchShifts()
        bridge.current.fetchUserInfo(session)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession(session)
      if (session) {
        bridge.current.fetchShifts()
        bridge.current.fetchUserInfo(session)
      } else {
        bridge.current.clearUserInfo()
        bridge.current.clearShifts()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Admin status check whenever user session changes
  useEffect(() => {
    if (userSession?.user) {
      checkAdminStatus(userSession.user.id);
    } else {
      setIsAdmin(false);
      setAdminLoading(false);
    }
  }, [userSession?.user?.id]);

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
          // 14–15 volunteers must link a parent/guardian.
          if (ageRange === '14_15' && !parentEmail.trim()) {
            setErrorMessage('14–15 volunteers must provide a parent/guardian volunteer email to sign up.')
            return
          }
          // Perform sign up with profile data
          const finalOrganization = organization === 'Other' ? customGroup : organization;
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: firstName,
                last_name: lastName,
                birthday: birthday || null,
                age_range: ageRange || null,
                parent_email: parentEmail || null,
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
            // The user_info row is NOT inserted here: with email confirmation enabled there is no
            // session yet, so RLS would reject it. useUserInfo.fetchUserInfo creates the row from
            // the auth user_metadata (set above) on the user's first confirmed login instead.
            setInfoMessage('Registration successful! Please check your email for verification.')
            // Reset form for next registration
            setEmail('')
            setPassword('')
            setFirstName('')
            setLastName('')
            setBirthday('')
            setAgeRange('')
            setParentEmail('')
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

  // Send a Supabase password-recovery email. The link lands on /reset-password,
  // where the temporary recovery session lets the user set a new password.
  const handleForgotPassword = async () => {
    setErrorMessage(null)
    setInfoMessage(null)
    if (!email.trim()) {
      setErrorMessage('Enter your email above first, then click "Forgot password?".')
      return
    }
    setAuthLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setInfoMessage('Password reset email sent. Check your inbox for the link.')
    } catch (error: any) {
      setErrorMessage(error.message || 'Could not send reset email.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUserSession(null)
    bridge.current.clearShifts()
    bridge.current.clearUserInfo()
    setInfoMessage(null)
    setRegistrationStep(1)
    resetProfileFields()
  }

  const getUserName = () => {
    return userSession?.user?.user_metadata?.first_name || userSession?.user?.email || 'Volunteer'
  }

  return {
    isSignUp, setIsSignUp,
    userSession,
    email, setEmail,
    firstName, setFirstName,
    password, setPassword,
    showPassword, setShowPassword,
    authLoading,
    errorMessage, setErrorMessage,
    infoMessage, setInfoMessage,
    registrationStep, setRegistrationStep,
    lastName, setLastName,
    birthday, setBirthday,
    ageRange, setAgeRange,
    parentEmail, setParentEmail,
    phoneNumber, setPhoneNumber,
    emergencyContactName, setEmergencyContactName,
    emergencyContactPhone, setEmergencyContactPhone,
    employer, setEmployer,
    streetAddress, setStreetAddress,
    city, setCity,
    zipCode, setZipCode,
    organization, setOrganization,
    customGroup, setCustomGroup,
    groupOptions,
    resetProfileFields,
    handleAuthSubmit,
    handleForgotPassword,
    handleSignOut,
    getUserName,
    isAdmin,
    adminLoading,
  }
}