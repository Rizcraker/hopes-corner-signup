import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Signup, SignupStatus } from '../types/signup'

// A signup joined with the volunteer's display info (name/email) for roster views.
export interface RosterEntry extends Signup {
  display_name: string
  email: string | null
}

// Manage the signups table: rosters, manual add, move, remove, no-show, notes, hours.
export function useSignups() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Attach names/emails from user_info to a batch of signups (no DB FK to embed on).
  const withUserInfo = useCallback(async (rows: Signup[]): Promise<RosterEntry[]> => {
    const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))] as string[]
    let lookup: Record<string, { first_name: string; last_name: string; email: string }> = {}
    if (ids.length) {
      const { data } = await supabase
        .from('user_info')
        .select('user_id, first_name, last_name, email')
        .in('user_id', ids)
      lookup = Object.fromEntries((data ?? []).map((u: any) => [u.user_id, u]))
    }
    return rows.map(r => {
      const u = r.user_id ? lookup[r.user_id] : undefined
      const name = u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : ''
      return {
        ...r,
        display_name: r.manual_name || name || 'Unknown',
        email: u?.email ?? null,
      }
    })
  }, [])

  const fetchRoster = useCallback(async (shiftId: string): Promise<RosterEntry[]> => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('signups')
        .select('*')
        .eq('shift_id', shiftId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return await withUserInfo(data as Signup[])
    } catch (err: any) {
      console.error('Error fetching roster:', err)
      setError('Failed to load roster.')
      return []
    } finally {
      setLoading(false)
    }
  }, [withUserInfo])

  const fetchUserSignups = useCallback(async (userId: string): Promise<Signup[]> => {
    const { data, error } = await supabase
      .from('signups')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) { console.error(error); return [] }
    return data as Signup[]
  }, [])

  const addSignup = useCallback(async (fields: {
    shift_id: string
    user_id?: string | null
    manual_name?: string | null
    notes?: string | null
  }) => {
    const { error } = await supabase.from('signups').insert({
      shift_id: fields.shift_id,
      user_id: fields.user_id ?? null,
      manual_name: fields.manual_name ?? null,
      notes: fields.notes ?? null,
      status: 'signed_up',
    })
    if (error) throw error
  }, [])

  const updateSignup = useCallback(async (id: string, patch: Partial<Signup>) => {
    const { error } = await supabase.from('signups').update(patch).eq('id', id)
    if (error) throw error
  }, [])

  const setStatus = useCallback(async (id: string, status: SignupStatus) => {
    const { error } = await supabase.from('signups').update({ status }).eq('id', id)
    if (error) throw error
  }, [])

  const moveSignup = useCallback(async (id: string, newShiftId: string) => {
    const { error } = await supabase.from('signups').update({ shift_id: newShiftId }).eq('id', id)
    if (error) throw error
  }, [])

  const removeSignup = useCallback(async (id: string) => {
    const { error } = await supabase.from('signups').delete().eq('id', id)
    if (error) throw error
  }, [])

  return {
    loading, error,
    fetchRoster, fetchUserSignups,
    addSignup, updateSignup, setStatus, moveSignup, removeSignup,
  }
}
