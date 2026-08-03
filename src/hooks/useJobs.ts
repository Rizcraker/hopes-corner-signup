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
      requirements: fields.requirements ?? null,
      location: fields.location ?? null,
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
    for (const k of ['name', 'description', 'requirements', 'location', 'visible', 'password', 'min_age', 'self_report'] as const) {
      if (k in fields) patch[k] = k === 'password' ? (fields[k] || null) : fields[k]
    }
    const { error } = await supabase.from('jobs').update(patch).eq('id', id)
    if (error) throw error
    await fetchJobs()
  }, [fetchJobs])

  const deleteJob = useCallback(async (id: string) => {
    try {
      // 1. Get shifts for this job with job name for description
      const { data: shifts, error: shiftError } = await supabase
        .from('shifts')
        .select(`
          id,
          jobs!inner(name),
          shift_start,
          shift_end,
          spots_left
        `)
        .eq('jobs.id', id)
      if (shiftError) throw shiftError

      // Helper to format time label like in ShiftCard
      const PT_TZ = 'America/Los_Angeles'
      const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: PT_TZ,
        })
      }
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: PT_TZ,
        })
      }

      // 2. For each shift, mimic user deleting a shift
      for (const shift of shifts ?? []) {
        const role = shift.jobs?.name ?? 'General'
        const start = shift.shift_start
        const end = shift.shift_end
        const timeLabel = `${formatDate(start)} · ${formatTime(start)} - ${formatTime(end)}`
        const description = `${role} - ${timeLabel}`

        // Get signups for this shift
        const { data: signups, error: signupError } = await supabase
          .from('signups')
          .select('user_id')
          .eq('shift_id', shift.id)
        if (signupError) throw signupError

        // Process each signup
        for (const su of signups ?? []) {
          if (su.user_id) {
            // Remove from active_shifts array
            const { data: userInfo, error: fetchError } = await supabase
              .from('user_info')
              .select('active_shifts')
              .eq('user_id', su.user_id)
              .single()
            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError
            const currentArray = (userInfo && Array.isArray(userInfo.active_shifts))
              ? userInfo.active_shifts
              : []
            const updated = currentArray.filter((s: string) => s !== description)
            const { error: updateError } = await supabase
              .from('user_info')
              .update({ active_shifts: updated })
              .eq('user_id', su.user_id)
            if (updateError) throw updateError

            // Increment spots_left
            const { error: incrementError } = await supabase
              .from('shifts')
              .update({ spots_left: shift.spots_left + 1 })
              .eq('id', shift.id)
            if (incrementError) throw incrementError

            // Delete the signup
            const { error: deleteSignupError } = await supabase
              .from('signups')
              .delete()
              .eq('shift_id', shift.id)
              .eq('user_id', su.user_id)
            if (deleteSignupError) throw deleteSignupError
          }
        }

        // Delete any remaining signups (walk-ins) where user_id is null
        const { error: deleteWalkinsError } = await supabase
          .from('signups')
          .delete()
          .eq('shift_id', shift.id)
          .is('user_id', null)
        if (deleteWalkinsError) throw deleteWalkinsError

        // Finally delete the shift
        const { error: deleteShiftError } = await supabase
          .from('shifts')
          .delete()
          .eq('id', shift.id)
        if (deleteShiftError) throw deleteShiftError
      }

      // 3. Delete the job (should now have no remaining shifts)
      const { error: jobError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id)
      if (jobError) throw jobError

      await fetchJobs()
    } catch (e: any) {
      console.error('Error deleting job and its shifts:', e)
      throw e
    }
  }, [fetchJobs])

  return { jobs, loading, error, fetchJobs, createJob, updateJob, deleteJob }
}
