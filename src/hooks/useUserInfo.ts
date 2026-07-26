import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Shift } from '../types/shift'
import type { UserInfo } from '../types/userInfo'

interface UseUserInfoDeps {
  userSession: any
  isBypassActive: boolean
  setErrorMessage: Dispatch<SetStateAction<string | null>>
  updateShiftSpotsLeft: (shiftId: string, change: number) => Promise<void>
  shifts: Shift[]
}

export function useUserInfo({ userSession, isBypassActive, setErrorMessage, updateShiftSpotsLeft, shifts }: UseUserInfoDeps) {
  // User info data from user_info supabase tracking matrix
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  const fetchUserInfo = async (session = userSession) => {
    if (!session?.user) return
    try {
      const { data, error } = await supabase
        .from('user_info')
        .select('user_id, hours_volunteered, active_shifts, first_name, last_name, birthday, phone_number, emergency_contact_name, emergency_contact_phone, employer, street_address, city, zip_code, organization, email')
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
            email: meta.email ?? ''
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
          email: data.email ?? ''
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
      // Update shift spots left via the shift updater (will update state via useShifts hook)
      await updateShiftSpotsLeft(shift.id, -1)
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

      // Update the shift's spots left (decrement by 1)
      await updateShiftSpotsLeft(shift.id, -1)
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
          active_shifts: prev.active_shifts.filter(s => s !== shiftDescription)
        }
      })
      // Find the shift by description to get its id for updating spots left
      const shift = shifts.find(s => `${s.role} - ${s.time}` === shiftDescription)
      if (shift) {
        // Update shift spots left via the shift updater (will update state via useShifts hook)
        await updateShiftSpotsLeft(shift.id, 1)
      }
      return
    }

    if (!userSession?.user || !userInfo) return
    try {
      setErrorMessage(null)
      const newActiveShifts = userInfo.active_shifts.filter(s => s !== shiftDescription)

      const { error } = await supabase
        .from('user_info')
        .update({ active_shifts: newActiveShifts })
        .eq('user_id', userSession.user.id)

      if (error) throw error

      setUserInfo(prev => {
        if (!prev) return null
        return { ...prev, active_shifts: newActiveShifts }
      })

      // Find the shift by description to get its id for updating spots left
      const shift = shifts.find(s => `${s.role} - ${s.time}` === shiftDescription)
      if (shift) {
        // Update the shift's spots left (increment by 1)
        await updateShiftSpotsLeft(shift.id, 1)
      }
    } catch (error) {
      console.error('Error removing active shift:', error)
      setErrorMessage('Failed to remove shift. Please try again.')
    }
  }

  const addHoursVolunteered = async (userId: string, hours: number) => {
    // If inside Developer bypass mode, update locally
    if (isBypassActive) {
      setUserInfo(prev => {
        if (!prev) return null
        // Only update if this is the current user
        if (prev.user_id === userId) {
          return {
            ...prev,
            hours_volunteered: prev.hours_volunteered + hours
          }
        }
        return prev
      })
      return
    }

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

  const clearUserInfo = () => {
    setUserInfo(null)
  }

  return { userInfo, setUserInfo, fetchUserInfo, updateActiveShifts, removeActiveShift, addHoursVolunteered, clearUserInfo }
}
