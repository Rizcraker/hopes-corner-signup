import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Job } from '../types/job'

// CRUD + admin controls for volunteer "jobs" (opportunities). Shifts belong to a job.
export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      setJobs(data as Job[])
    } catch (err: any) {
      console.error('Error fetching jobs:', err)
      setError('Failed to load jobs.')
    } finally {
      setLoading(false)
    }
  }, [])

  const createJob = useCallback(async (fields: Partial<Job> & { name: string }) => {
    const { error } = await supabase.from('jobs').insert({
      name: fields.name,
      description: fields.description ?? null,
      visible: fields.visible ?? true,
      password: fields.password || null,
      min_age: fields.min_age ?? 16,
      self_report: fields.self_report ?? false,
    })
    if (error) throw error
    await fetchJobs()
  }, [fetchJobs])

  const updateJob = useCallback(async (id: string, fields: Partial<Job>) => {
    const patch: Record<string, unknown> = {}
    for (const k of ['name', 'description', 'visible', 'password', 'min_age', 'self_report'] as const) {
      if (k in fields) patch[k] = k === 'password' ? (fields[k] || null) : fields[k]
    }
    const { error } = await supabase.from('jobs').update(patch).eq('id', id)
    if (error) throw error
    await fetchJobs()
  }, [fetchJobs])

  const deleteJob = useCallback(async (id: string) => {
    // ON DELETE CASCADE removes the job's shifts (and their signups) too.
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) throw error
    await fetchJobs()
  }, [fetchJobs])

  return { jobs, loading, error, fetchJobs, createJob, updateJob, deleteJob }
}
