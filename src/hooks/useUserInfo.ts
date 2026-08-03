import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Shift } from '../types/shift'
import type { UserInfo } from '../types/userInfo'

interface UseUserInfoDeps {
  userSession: any
  setErrorMessage: Dispatch<SetStateAction<string | null>>
  updateShiftSpotsLeft: (shiftId: string, change: number) => Promise<void>
  shifts: Shift[]
}

export function useUserInfo({ userSession, setErrorMessage, updateShiftSpotsLeft, shifts }: UseUserInfoDeps) {
  // User info data from user_info supabase tracking matrix
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  const fetchUserInfo = async (session = userSession) => {
    if (!session?.user) return
    try {
      const { data, error } = await supabase
        .from('user_info')
        .select('user_id, hours_volunteered, active_shifts, first_name, last_name, birthday, phone_number, emergency_contact_name, emergency_contact_phone, employer, street_address, city, zip_code, organization, email, age_range, parent_email')
        .eq('user_id', session.user.id)
        .single()

      if (error) {
        // If no record exists, create one now. This is the reliable creation path: the insert
        // attempted during registration runs before the email is confirmed (no session), so RLS
        // rejects it. The profile fields live in auth user_metadata — build the row from those.
        if (error.code === 'PGRST116') {
          const meta = session.user.user_metadata ?? {}
          const profileRow = {
            user_id: session.user.id,
            hours_volunteered: 0,
            active_shifts: [] as string[],
            first_name: meta.first_name ?? '',
            last_name: meta.last_name ?? '',
            birthday: meta.birthday || null,
            phone_number: meta.phone_number ?? '',
            emergency_contact_name: meta.emergency_contact_name ?? '',
            emergency_contact_phone: meta.emergency_contact_phone ?? '',
            employer: meta.employer ?? '',
            street_address: meta.street_address ?? '',
            city: meta.city ?? '',
            zip_code: meta.zip_code ?? '',
            organization: meta.organization ?? '',
            email: meta.email ?? '',
            age_range: meta.age_range ?? null,
            parent_email: meta.parent_email ?? null
          }
          const { error: insertError } = await supabase
            .from('user_info')
            .insert(profileRow)
          if (insertError) throw insertError
          setUserInfo(profileRow)
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
          user_id: data.user_id,
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
          organization: data.organization ?? '',
          email: data.email ?? '',
          age_range: data.age_range ?? null,
          parent_email: data.parent_email ?? null
        })
      }
    } catch (error) {
      console.error('Error fetching user info:', error)
      setUserInfo({
        user_id: '',
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
        organization: '',
        email: ''
      })
    }
  }

  const updateActiveShifts = async (shift: Shift) => {
    if (!userSession?.user) return
    try {
      setErrorMessage(null)

      // Fetch latest user info from DB
      const { data: freshUserInfo, error: fetchError } = await supabase
        .from('user_info')
        .select('active_shifts, age_range, parent_email')
        .eq('user_id', userSession.user.id)
        .single()
      if (fetchError) throw fetchError

      // Check if the user is currently banned
      const { data: banData, error: banError } = await supabase
        .from('blacklist')
        .select('until')
        .eq('user_id', userSession.user.id)
        .single()
      if (banError && banError.code !== 'PGRST116') {
        // PGRST116 means no row found, which is fine (not banned)
        throw banError
      }
      let isBanned = false
      if (banData) {
        if (banData.until === null) {
          isBanned = true // permanent ban
        } else {
          const untilDate = new Date(banData.until)
          const now = new Date()
          if (untilDate >= now) {
            isBanned = true // active temporary ban
          }
        }
      }
      if (isBanned) {
        setErrorMessage('You are currently banned from signing up for shifts.')
        return
      }

      const parsedActiveShifts = Array.isArray(freshUserInfo.active_shifts)
        ? freshUserInfo.active_shifts
        : typeof freshUserInfo.active_shifts === 'string'
          ? JSON.parse(freshUserInfo.active_shifts)
          : []

      // 14–15 volunteers can only sign up once a parent/guardian volunteer
      // account is linked AND that account actually exists (verified).
      if (freshUserInfo.age_range === '14_15') {
        if (!freshUserInfo.parent_email) {
          setErrorMessage('14–15 volunteers must link a parent/guardian volunteer account before signing up. Add it under "Edit my info".')
          return
        }
        const { data: parentExists, error: pErr } = await supabase
          .rpc('parent_account_exists', { p_email: freshUserInfo.parent_email })
        if (pErr) throw pErr
        if (!parentExists) {
          setErrorMessage('Your linked parent/guardian doesn’t have a volunteer account yet. Ask them to create one with that email, then try again.')
          return
        }
      }

      const shiftDescription = `${shift.role} - ${shift.time}`

      if (parsedActiveShifts.includes(shiftDescription)) {
        setErrorMessage('You are already signed up for this shift.')
        return
      }

      const newActiveShifts = [...parsedActiveShifts, shiftDescription]

      const { error: updateError } = await supabase
        .from('user_info')
        .update({ active_shifts: newActiveShifts })
        .eq('user_id', userSession.user.id)
      if (updateError) throw updateError

      // Update local state optimistically
      setUserInfo(prev => {
        if (!prev) return null
        return { ...prev, active_shifts: newActiveShifts }
      })

      // Update the shift's spots left (decrement by 1)
      await updateShiftSpotsLeft(shift.id, -1)
      // Record signup
      await supabase.from('signups').insert({
        shift_id: shift.id,
        user_id: userSession.user.id,
        status: 'signed_up'
      })
    } catch (error) {
      console.error('Error updating active shifts:', error)
      setErrorMessage('Failed to update your shift list. Please try again.')
    }
  }

  const removeActiveShift = async (shiftDescription: string) => {
    if (!userSession?.user) return
    try {
      setErrorMessage(null)

      // Fetch latest user info from DB
      const { data: freshUserInfo, error: fetchError } = await supabase
        .from('user_info')
        .select('active_shifts')
        .eq('user_id', userSession.user.id)
        .single()
      if (fetchError) throw fetchError

      const parsedActiveShifts = Array.isArray(freshUserInfo.active_shifts)
        ? freshUserInfo.active_shifts
        : typeof freshUserInfo.active_shifts === 'string'
          ? JSON.parse(freshUserInfo.active_shifts)
          : []

      if (!parsedActiveShifts.includes(shiftDescription)) {
        setErrorMessage('You are not signed up for this shift.')
        return
      }

      const newActiveShifts = parsedActiveShifts.filter(s => s !== shiftDescription)

      const { error: updateError } = await supabase
        .from('user_info')
        .update({ active_shifts: newActiveShifts })
        .eq('user_id', userSession.user.id)
      if (updateError) throw updateError

      // Update local state
      setUserInfo(prev => {
        if (!prev) return null
        return { ...prev, active_shifts: newActiveShifts }
      })

      // Find the shift by description to get its id for updating spots left
      const shift = shifts.find(s => `${s.role} - ${s.time}` === shiftDescription)
      if (shift) {
        // Update the shift's spots left (increment by 1)
        await updateShiftSpotsLeft(shift.id, 1)
        // Remove signup record
        await supabase.from('signups').delete().eq('shift_id', shift.id).eq('user_id', userSession.user.id)
      }
    } catch (error) {
      console.error('Error removing active shift:', error)
      setErrorMessage('Failed to remove shift. Please try again.')
    }
  }

  const addHoursVolunteered = async (userId: string, hours: number) => {
    if (!userSession?.user) return
    try {
      setErrorMessage(null)

      // First get the current user info to get the current hours
      const { data: currentUserInfo, error: fetchError } = await supabase
        .from('user_info')
        .select('hours_volunteered')
        .eq('user_id', userId)
        .single()

      if (fetchError) throw fetchError

      const newHours = (currentUserInfo?.hours_volunteered || 0) + hours

      const { error } = await supabase
        .from('user_info')
        .update({ hours_volunteered: newHours })
        .eq('user_id', userId)

      if (error) throw error

      // Update local state if this is the currently viewed user
      setUserInfo(prev => {
        if (!prev) return null
        if (prev.user_id === userId) {
          return { ...prev, hours_volunteered: newHours }
        }
        return prev
      })
    } catch (error) {
      console.error('Error adding hours volunteered:', error)
      setErrorMessage('Failed to add hours volunteered. Please try again.')
    }
  }

  // Volunteer edits their own profile fields (address, birthday, contact, etc.).
  const updateProfile = async (fields: Partial<UserInfo>) => {
    if (!userSession?.user) return
    setErrorMessage(null)
    const editable: (keyof UserInfo)[] = [
      'first_name', 'last_name', 'birthday', 'phone_number',
      'emergency_contact_name', 'emergency_contact_phone',
      'employer', 'street_address', 'city', 'zip_code', 'organization',
      'age_range', 'parent_email',
    ]
    const patch: Record<string, unknown> = {}
    for (const k of editable) {
      if (k in fields) patch[k] = k === 'birthday' ? (fields[k] || null) : fields[k]
    }
    const { data, error } = await supabase
      .from('user_info')
      .update(patch)
      .eq('user_id', userSession.user.id)
      .select()
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Profile not updated (0 rows) — check that the own-row update policy is applied.')
    setUserInfo(prev => (prev ? { ...prev, ...patch } as UserInfo : prev))
  }

  const clearUserInfo = () => {
    setUserInfo(null)
  }

  return { userInfo, setUserInfo, fetchUserInfo, updateActiveShifts, removeActiveShift, addHoursVolunteered, updateProfile, clearUserInfo }
}
