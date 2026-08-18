import { useState, useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Shift } from '../types/shift'
import { getOrdinalDay } from '../utils/shiftUtils'

// Hope's Corner operates in Pacific time; all shift times are displayed in PT.
export const PT_TZ = 'America/Los_Angeles'

interface UseShiftsDeps {
  setErrorMessage: Dispatch<SetStateAction<string | null>>
}

export function useShifts({ setErrorMessage }: UseShiftsDeps) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)

  // Shift browser: sorting mode + which accordion rows/dates are expanded.
  // This lives here (a hook called from App) rather than inside ShiftBrowser on purpose: the
  // /volunteer route element unmounts on navigation, so state held inside the browser would
  // reset every time you left the tab. Today it survives, so it has to stay above the route.
  const [sortMode, setSortMode] = useState<'job' | 'date' | 'calendar'>('job')
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set())
  const [expandedDateKeys, setExpandedDateKeys] = useState<Set<string>>(new Set())
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null)
  const [isRefreshSpinning, setIsRefreshSpinning] = useState(false)

  const toggleJobGroup = (role: string) => {
    setExpandedJobs(prev => {
      const next = new Set(prev)
      next.has(role) ? next.delete(role) : next.add(role)
      return next
    })
  }

  const toggleDateEntry = (key: string) => {
    setExpandedDateKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleRefreshShifts = () => {
    setIsRefreshSpinning(true)
    fetchShifts().finally(() => {
      window.setTimeout(() => setIsRefreshSpinning(false), 500)
    })
  }

  // Group shifts by job title (role), preserving chronological order within each group
  const { shiftsByJob, jobGroupNames } = useMemo(() => {
    const byJob = shifts.reduce((acc, shift) => {
      if (!acc[shift.role]) acc[shift.role] = []
      acc[shift.role].push(shift)
      return acc
    }, {} as Record<string, Shift[]>)
    Object.values(byJob).forEach(group => group.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()))
    const names = Object.keys(byJob).sort((a, b) =>
      byJob[a][0].startDate.getTime() - byJob[b][0].startDate.getTime()
    )
    return { shiftsByJob: byJob, jobGroupNames: names }
  }, [shifts])

  // Flat chronological order, used by both the Date list and the Calendar view
  const shiftsByDate = useMemo(
    () => [...shifts].sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    [shifts]
  )

  // Group shifts by calendar month for the Calendar view
  const shiftsByMonth = useMemo(
    () => shiftsByDate.reduce((acc, shift) => {
      const monthKey = shift.startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: PT_TZ })
      if (!acc[monthKey]) acc[monthKey] = []
      acc[monthKey].push(shift)
      return acc
    }, {} as Record<string, Shift[]>),
    [shiftsByDate]
  )

  const fetchShifts = async () => {
    setLoading(true)
    try {
      // title/description/requirements were dropped from the shifts table; a shift's
      // heading and eligibility metadata come from its parent job. One query with an
      // embedded join: RLS on `jobs` hides invisible jobs from non-admins, in which
      // case the embed is null and the browser filters that shift out via `hasJob`.
      const { data, error } = await supabase
        .from('shifts')
        .select('id, spots_left, shift_start, shift_end, job_id, recurrence_group, hours_awarded, jobs ( name, min_age, visible, description, requirements )')

      if (error) throw error

      const mappedShifts = (data ?? [])
        .map((shift: any) => {
          // A shift needs valid times; its descriptive info lives on the job.
          if (!shift.shift_start || !shift.shift_end) {
            return null
          }
          // Supabase returns the embedded job as an object (may be null if the job
          // is hidden from this viewer via RLS, or the shift has no job).
          const job = Array.isArray(shift.jobs) ? shift.jobs[0] : shift.jobs

          const startDate = new Date(shift.shift_start)
          const endDate = new Date(shift.shift_end)

          // Check for invalid dates
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return null
          }

          // Operations run in Pacific — render every shift time/date in PT so it's
          // consistent for all viewers regardless of their own timezone.
          const formattedDate = startDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            timeZone: PT_TZ
          } as const)

          const startTime = startDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: PT_TZ
          })

          const endTime = endDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: PT_TZ
          })

          // Full "Weekday, Month Xth" label used by the Job / Calendar accordions
          const weekdayLong = startDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: PT_TZ })
          const monthLong = startDate.toLocaleDateString('en-US', { month: 'long', timeZone: PT_TZ })
          const dayNum = Number(startDate.toLocaleDateString('en-US', { day: 'numeric', timeZone: PT_TZ }))
          const dateLabel = `${weekdayLong}, ${monthLong} ${getOrdinalDay(dayNum)}`

          return {
            id: shift.id,
            role: job?.name || 'General',
            time: `${formattedDate} · ${startTime} - ${endTime}`,
            spotsLeft: shift.spots_left ?? 0,
            startDate,
            endDate,
            dateLabel,
            timeLabel: `${startTime} - ${endTime}`,
            jobId: shift.job_id ?? null,
            // Not selected client-side on purpose — job passwords stay admin-only.
            password: null as string | null,
            minAge: job?.min_age ?? null,
            jobVisible: job?.visible ?? false,
            jobDescription: job?.description ?? null,
            jobRequirements: job?.requirements ?? null,
            hasJob: !!job,
            recurrenceGroup: shift.recurrence_group ?? null,
            hoursAwarded: shift.hours_awarded ?? false,
          }
        })
        .filter((shift): shift is Shift => shift !== null)

      setShifts(mappedShifts)
    } catch (error) {
      console.error('Error fetching shifts:', error)
      setErrorMessage('Failed to fetch shifts. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const clearShifts = () => {
    setShifts([])
  }

  const updateShiftSpotsLeft = async (shiftId: string, change: number) => {
    if (!shiftId) return

    try {
      setErrorMessage(null)
      // First, get the current shift to update
      const { data: shiftData, error: fetchError } = await supabase
        .from('shifts')
        .select('spots_left')
        .eq('id', shiftId)
        .single()

      if (fetchError) throw fetchError

      const newSpotsLeft = Math.max(0, shiftData.spots_left + change)

      const { error } = await supabase
        .from('shifts')
        .update({ spots_left: newSpotsLeft })
        .eq('id', shiftId)

      if (error) throw error

      // Update local state optimistically
      setShifts(prev => {
        return prev.map(shift => {
          if (shift.id === shiftId) {
            return { ...shift, spotsLeft: newSpotsLeft }
          }
          return shift
        })
      })
    } catch (error) {
      console.error('Error updating shift spots left:', error)
      setErrorMessage('Failed to update shift. Please try again.')
    }
  }

  /**
   * Refresh shift data so the UI reflects hours awarded server-side.
   * Awarding itself is done by pg_cron (award_all_completed_shifts, migration 0013),
   * not the client — that runs every minute regardless of who's online and avoids the
   * RLS/permission issues of writing to other users' rows from the browser.
   */
  const processExpiredShifts = async () => {
    await fetchShifts()
  }

  return {
    shifts, setShifts,
    loading,
    fetchShifts,
    handleRefreshShifts,
    clearShifts,
    isRefreshSpinning,
    sortMode, setSortMode,
    expandedJobs, toggleJobGroup,
    expandedDateKeys, toggleDateEntry,
    selectedCalendarDay, setSelectedCalendarDay,
    shiftsByJob,
    jobGroupNames,
    shiftsByDate,
    shiftsByMonth,
    updateShiftSpotsLeft,
    processExpiredShifts
  }
}
