import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Cancellation } from '../types/cancellation'

// A cancellation joined with the volunteer's name/email for the admin report.
export interface CancellationRow extends Cancellation {
  display_name: string
  email: string | null
}

export function useCancellations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCancellations = useCallback(async (): Promise<CancellationRow[]> => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('cancellations')
        .select('*')
        .order('cancelled_at', { ascending: false })
      if (error) throw error
      const rows = (data ?? []) as Cancellation[]
      const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))] as string[]
      let lookup: Record<string, { first_name: string; last_name: string; email: string }> = {}
      if (ids.length) {
        const { data: users } = await supabase
          .from('user_info')
          .select('user_id, first_name, last_name, email')
          .in('user_id', ids)
        lookup = Object.fromEntries((users ?? []).map((u: any) => [u.user_id, u]))
      }
      return rows.map(r => {
        const u = r.user_id ? lookup[r.user_id] : undefined
        const name = u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : ''
        return { ...r, display_name: name || 'Unknown volunteer', email: u?.email ?? null }
      })
    } catch (err: any) {
      console.error('Error fetching cancellations:', err)
      setError('Failed to load cancellations.')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const markNotified = useCallback(async (id: string, notified = true) => {
    const { error } = await supabase.from('cancellations').update({ notified }).eq('id', id)
    if (error) throw error
  }, [])

  // Best-effort log written by the volunteer when they cancel a shift. Never throws
  // (a failed log must not block the cancel itself).
  const logCancellation = useCallback(async (fields: {
    userId: string
    shiftId: string
    shiftStart: Date
    jobName: string
  }) => {
    const hoursBefore = (fields.shiftStart.getTime() - Date.now()) / 3_600_000
    try {
      await supabase.from('cancellations').insert({
        user_id: fields.userId,
        shift_id: fields.shiftId,
        shift_start: fields.shiftStart.toISOString(),
        job_name: fields.jobName,
        hours_before: Math.round(hoursBefore * 10) / 10,
        late: hoursBefore < 24,
      })
    } catch (err) {
      console.warn('Could not log cancellation:', err)
    }
  }, [])

  return { loading, error, fetchCancellations, markNotified, logCancellation }
}
