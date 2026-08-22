import { useState, useEffect } from 'react'
import type { FormEvent, RefObject } from 'react'
import { supabase } from '../lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
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
  setTokenLogin: (isTokenLogin: boolean) => void
  setShifts: (shifts: Shift[]) => void
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
  const navigate = useNavigate()

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
        bridge.current.setTokenLogin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check for volunteer token login (sessionStorage)
  useEffect(() => {
    const volId = sessionStorage.getItem('hc_volunteer_id');
    if (volId && !userSession) {
      supabase
        .from('user_info')
        .select('*')
        .eq('user_id', volId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            const fakeSession = {
              user: {
                id: data.user_id,
                user_metadata: {
                  first_name: data.first_name,
                  last_name: data.last_name,
                  email: data.email,
                }
              }
            };
            setUserSession(fakeSession);
            bridge.current.fetchShifts();
            bridge.current.fetchUserInfo(fakeSession);
          }
        });
    }
  }, []); // run once

  // Check for volunteer token login (URL parameter)
  useEffect(() => {
    // If we already have a session from normal auth or sessionStorage, don't override it
    if (userSession) return;

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (!token) return;

    // Call the get-volunteer-data function to validate token and get volunteer data
    supabase.functions.invoke('get-volunteer-data', { body: { token } })
      .then(({ data, error }) => {
        if (error) {
          console.error('Volunteer token error:', error);
          return;
        }

        // Handle error in data (similar to VolunteerProfilePage)
        if ((data as any)?.error) {
          console.error('Volunteer token error:', (data as any).error);
          return;
        }

        if (data.profile) {
          const p = data.profile;
          // Create fake session for auth purposes
          const fakeSession = {
            user: {
              id: p.user_id,
              user_metadata: {
                first_name: p.first_name ?? '',
                last_name: p.last_name ?? '',
                email: p.email ?? '',
                birthday: p.birthday || null,
                age_range: p.age_range || null,
                parent_email: p.parent_email || null,
                phone_number: p.phone_number ?? '',
                emergency_contact_name: p.emergency_contact_name ?? '',
                emergency_contact_phone: p.emergency_contact_phone ?? '',
                employer: p.employer ?? '',
                street_address: p.street_address ?? '',
                city: p.city ?? '',
                zip_code: p.zip_code ?? '',
                organization: p.organization ?? '',
              }
            }
          };
          setUserSession(fakeSession);

          // Also populate userInfo store directly to avoid RLS issues with INSERT
          const userInfoData: UserInfo = {
            user_id: p.user_id,
            hours_volunteered: p.hours_volunteered ?? 0,
            active_shifts: Array.isArray(p.active_shifts) ? p.active_shifts : (typeof p.active_shifts === 'string' ? JSON.parse(p.active_shifts) : []),
            first_name: p.first_name ?? '',
            last_name: p.last_name ?? '',
            birthday: p.birthday || null,
            phone_number: p.phone_number ?? '',
            emergency_contact_name: p.emergency_contact_name ?? '',
            emergency_contact_phone: p.emergency_contact_phone ?? '',
            employer: p.employer ?? '',
            street_address: p.street_address ?? '',
            city: p.city ?? '',
            zip_code: p.zip_code ?? '',
            organization: p.organization ?? '',
            email: p.email ?? '',
            age_range: p.age_range || null,
            parent_email: p.parent_email || null,
            // Optional fields with defaults
            can_self_report: false,
            first_volunteered_at: null
          };

          bridge.current.setUserInfo(userInfoData);
          bridge.current.setShifts(p.shifts ?? []);
          bridge.current.setTokenLogin(true);
          // Clean up the URL by removing the token parameter
          navigate('/volunteer', { replace: true });
        }
      })
      .catch(err => {
        console.error('Error invoking get-volunteer-data:', err);
      });
  }, []); // run once

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
    // Clear volunteer login token
    sessionStorage.removeItem('hc_volunteer_id')
    bridge.current.clearShifts()
    bridge.current.clearUserInfo()
    // Reset token login state
    bridge.current.setTokenLogin(false)
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