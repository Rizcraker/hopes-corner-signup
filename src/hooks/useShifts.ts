import { useState, useEffect, useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Shift } from '../types/shift'
import type { UserInfo } from '../types/userInfo'
import { getOrdinalDay, generateSampleShifts } from '../utils/shiftUtils'

interface UseShiftsDeps {
  isBypassActive: boolean
  setErrorMessage: Dispatch<SetStateAction<string | null>>
  userInfo: UserInfo | null
  setUserInfo: Dispatch<SetStateAction<UserInfo | null>>
}

export function useShifts({ isBypassActive, setErrorMessage, userInfo, setUserInfo }: UseShiftsDeps) {
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
    if (isBypassActive) {
      setShifts(generateSampleShifts())
      window.setTimeout(() => setIsRefreshSpinning(false), 500)
    } else {
      fetchShifts().finally(() => {
        window.setTimeout(() => setIsRefreshSpinning(false), 500)
      })
    }
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
      const monthKey = shift.startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      if (!acc[monthKey]) acc[monthKey] = []
      acc[monthKey].push(shift)
      return acc
    }, {} as Record<string, Shift[]>),
    [shiftsByDate]
  )

  const fetchShifts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('id, title, description, spots_left, shift_start, shift_end, location, requirements')

      if (error) throw error

      const mappedShifts = data
        .map(shift => {
          // Validate required fields
          if (!shift.title || !shift.shift_start || !shift.shift_end) {
            return null
          }

          const startDate = new Date(shift.shift_start)
          const endDate = new Date(shift.shift_end)

          // Check for invalid dates
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return null
          }

          const formattedDate = startDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          } as const)

          const startTime = startDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })

          const endTime = endDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })

          // Full "Weekday, Month Xth" label used by the Job / Calendar accordions
          const weekdayLong = startDate.toLocaleDateString('en-US', { weekday: 'long' })
          const monthLong = startDate.toLocaleDateString('en-US', { month: 'long' })
          const dateLabel = `${weekdayLong}, ${monthLong} ${getOrdinalDay(startDate.getDate())}`

          return {
            id: shift.id,
            role: shift.title,
            time: `${formattedDate} · ${startTime} - ${endTime}`,
            location: shift.location || 'Location TBD',
            description: shift.description || 'Description not available',
            requirements: shift.requirements || 'Requirements TBD',
            spotsLeft: shift.spots_left ?? 0,
            startDate,
            dateLabel,
            timeLabel: `${startTime} - ${endTime}`
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

  useEffect(() => {
    if (isBypassActive) {
      setShifts(generateSampleShifts())
      if (!userInfo) {
        setUserInfo({
          user_id: 'bypass-user-id',
          hours_volunteered: 8,
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
          organization: '',
          email: 'bypass@example.com'
        })
      }
    }
  }, [isBypassActive])

  const clearShifts = () => {
    setShifts([])
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
  }
}
