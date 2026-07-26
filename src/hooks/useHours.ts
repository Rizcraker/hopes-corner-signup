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

  // Add a signed delta to a user's cached total in user_info (read-modify-write).
  // .select() after the update returns the changed row; if RLS blocked the write it
  // comes back empty (no error), so we surface that instead of failing silently.
  const bumpUserTotal = async (userId: string, delta: number) => {
    const { data, error } = await supabase
      .from('user_info')
      .select('hours_volunteered')
      .eq('user_id', userId)
      .single()
    if (error) throw error
    const next = Math.max(0, (data?.hours_volunteered ?? 0) + delta)
    const { data: updated, error: upErr } = await supabase
      .from('user_info')
      .update({ hours_volunteered: next })
      .eq('user_id', userId)
      .select('hours_volunteered')
      .maybeSingle()
    if (upErr) throw upErr
    if (!updated) {
      throw new Error(
        "Hours total not updated (0 rows). RLS is blocking writes to user_info — " +
        "admins need an UPDATE policy on that table."
      )
    }
    return updated.hours_volunteered as number
  }

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
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('hour_entries')
      .update({ status: 'approved', decided_at: new Date().toISOString(), decided_by: user?.id ?? null })
      .eq('id', entry.id)
    if (error) throw error
    await bumpUserTotal(entry.user_id, entry.hours)
  }, [])

  const denyEntry = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('hour_entries')
      .update({ status: 'denied', decided_at: new Date().toISOString(), decided_by: user?.id ?? null })
      .eq('id', id)
    if (error) throw error
  }, [])

  // Admin directly logs a (signed) hours change with a task note — approved on the spot.
  const logHours = useCallback(async (userId: string, hours: number, task: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('hour_entries').insert({
      user_id: userId, hours, task: task || null,
      status: 'approved', decided_at: new Date().toISOString(), decided_by: user?.id ?? null,
    })
    if (error) throw error
    return await bumpUserTotal(userId, hours)
  }, [])

  return { loading, error, fetchMyEntries, requestHours, fetchPending, approveEntry, denyEntry, logHours }
}
