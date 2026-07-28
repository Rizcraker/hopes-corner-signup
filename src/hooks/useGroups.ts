import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface Group {
  id: string
  name: string
}

// Organizations volunteers can sign up under. Readable pre-auth; admins manage them.
export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .order('name', { ascending: true })
      if (error) throw error
      setGroups(data as Group[])
    } catch (err: any) {
      console.error('Error fetching groups:', err)
      setError('Failed to load organizations.')
    } finally {
      setLoading(false)
    }
  }, [])

  const addGroup = useCallback(async (name: string) => {
    const { error } = await supabase.from('groups').insert({ name: name.trim() })
    if (error) throw error
    await fetchGroups()
  }, [fetchGroups])

  const removeGroup = useCallback(async (id: string) => {
    const { error } = await supabase.from('groups').delete().eq('id', id)
    if (error) throw error
    await fetchGroups()
  }, [fetchGroups])

  return { groups, loading, error, fetchGroups, addGroup, removeGroup }
}
