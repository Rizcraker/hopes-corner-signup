import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Shift } from '../types/shift'
import type { UserInfo } from '../types/userInfo'

interface UseUserInfoDeps {
  userSession: any
  isBypassActive: boolean
  setErrorMessage: Dispatch<SetStateAction<string | null>>
}

export function useUserInfo({ userSession, isBypassActive, setErrorMessage }: UseUserInfoDeps) {
  // User info data from user_info supabase tracking matrix
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

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

  return { userInfo, setUserInfo, fetchUserInfo, updateActiveShifts, removeActiveShift }
}
