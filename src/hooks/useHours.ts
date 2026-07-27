import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { HourEntry } from '../types/hourEntry'

// A pending request joined with the volunteer's name/email for the admin queue.
export interface PendingRequest extends HourEntry {
  display_name: string
  email: string | null
}

// Ledger operations for the hour_entries table: volunteer timesheet + requests,
// and admin approve / deny / add-hours logging.
export function useHours() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // --- Volunteer side ---------------------------------------------------------
  const fetchMyEntries = useCallback(async (userId: string): Promise<HourEntry[]> => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('hour_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as HourEntry[]
    } catch (err: any) {
      console.error('Error fetching hour entries:', err)
      setError('Failed to load your timesheet.')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const requestHours = useCallback(async (userId: string, hours: number, reason: string) => {
    const { error } = await supabase.from('hour_entries').insert({
      user_id: userId, hours, reason, status: 'pending',
    })
    if (error) throw error
  }, [])

  // --- Admin side -------------------------------------------------------------
  const fetchPending = useCallback(async (): Promise<PendingRequest[]> => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('hour_entries')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      if (error) throw error
      const rows = (data ?? []) as HourEntry[]
      const ids = [...new Set(rows.map(r => r.user_id))]
      let lookup: Record<string, { first_name: string; last_name: string; email: string }> = {}
      if (ids.length) {
        const { data: users } = await supabase
          .from('user_info')
          .select('user_id, first_name, last_name, email')
          .in('user_id', ids)
        lookup = Object.fromEntries((users ?? []).map((u: any) => [u.user_id, u]))
      }
      return rows.map(r => {
        const u = lookup[r.user_id]
        const name = u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : ''
        return { ...r, display_name: name || 'Unknown volunteer', email: u?.email ?? null }
      })
    } catch (err: any) {
      console.error('Error fetching pending requests:', err)
      setError('Failed to load hour requests.')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const approveEntry = useCallback(async (entry: HourEntry) => {
    const { error } = await supabase.rpc('approve_hour_request', { entry_id: entry.id })
    if (error) throw error
  }, [])

  const denyEntry = useCallback(async (id: string) => {
    const { error } = await supabase.rpc('deny_hour_request', { entry_id: id })
    if (error) throw error
  }, [])

  // Admin directly logs a (signed) hours change with a task note — approved on the spot.
  // Runs in one atomic SECURITY DEFINER function; returns the volunteer's new total.
  const logHours = useCallback(async (userId: string, hours: number, task: string) => {
    const { data, error } = await supabase.rpc('admin_log_hours', {
      target: userId, delta: hours, note: task || '',
    })
    if (error) throw error
    return data as number
  }, [])

  return { loading, error, fetchMyEntries, requestHours, fetchPending, approveEntry, denyEntry, logHours }
}
