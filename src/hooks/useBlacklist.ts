import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Database } from '../../types/database'

export type BlacklistEntry = {
  user_id: string
  email: string
  name: string
  reason: string | null
  until: string | null // ISO timestamp or null
  created_at: string
}

export function useBlacklist() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<BlacklistEntry[]>([])

  const fetchBlacklist = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('blacklist')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setEntries(data ?? [])
    } catch (err: any) {
      console.error('Error fetching blacklist:', err)
      setError(err.message ?? 'Failed to load blacklist')
    } finally {
      setLoading(false)
    }
  }, [])

  const addBan = useCallback(async (fields: {
    user_id: string
    email: string
    name: string
    reason: string | null
    until: string | null
  }) => {
    setError(null)
    try {
      const { error } = await supabase
        .from('blacklist')
        .insert([fields])
      if (error) throw error
      await fetchBlacklist()
    } catch (err: any) {
      console.error('Error adding ban:', err)
      setError(err.message ?? 'Failed to add ban')
      throw err
    }
  }, [fetchBlacklist])

  const removeBan = useCallback(async (userId: string) => {
    setError(null)
    try {
      const { error } = await supabase
        .from('blacklist')
        .delete()
        .eq('user_id', userId)
      if (error) throw error
      await fetchBlacklist()
    } catch (err: any) {
      console.error('Error removing ban:', err)
      setError(err.message ?? 'Failed to remove ban')
      throw err
    }
  }, [fetchBlacklist])

  // Initial fetch
  // Note: we call fetchBlacklist in component useEffect elsewhere
  return { loading, error, entries, fetchBlacklist, addBan, removeBan }
}