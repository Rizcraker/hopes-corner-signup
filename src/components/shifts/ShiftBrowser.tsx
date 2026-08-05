import { useState } from 'react'
import type { Shift } from '../../types/shift'
import ShiftCard from './ShiftCard'
import { meetsAgeRequirement } from '../../utils/ageRange'
import { PT_TZ } from '../../hooks/useShifts'

// Every piece of state here is owned by useShifts (called in App), not by this component:
// the /volunteer route element unmounts on navigation, so local state would reset each visit.
interface ShiftBrowserProps {
  shifts: Shift[]
  loading: boolean
  errorMessage: string | null
  onRefresh: () => void
  isRefreshSpinning: boolean
  sortMode: 'job' | 'date' | 'calendar'
  setSortMode: (mode: 'job' | 'date' | 'calendar') => void
  expandedJobs: Set<string>
  toggleJobGroup: (role: string) => void
  expandedDateKeys: Set<string>
  toggleDateEntry: (key: string) => void
  selectedCalendarDay: string | null
  setSelectedCalendarDay: (day: string | null) => void
  shiftsByJob: Record<string, Shift[]>
  jobGroupNames: string[]
  shiftsByDate: Shift[]
  shiftsByMonth: Record<string, Shift[]>
  onSignUp: (shift: Shift) => Promise<void>
  userAgeRange: string | null  // User's age range for eligibility filtering
}

function ShiftBrowser({
  shifts,
  loading,
  errorMessage,
  onRefresh,
  isRefreshSpinning,
  sortMode,
  setSortMode,
  expandedJobs,
  toggleJobGroup,
  expandedDateKeys,
  toggleDateEntry,
  selectedCalendarDay,
  setSelectedCalendarDay,
  shiftsByJob,
  jobGroupNames,
  shiftsByDate,
  shiftsByMonth,
  onSignUp,
  userAgeRange,  // User's age range for eligibility filtering
}: ShiftBrowserProps) {
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const term = query.trim().toLowerCase()
  // A shift's calendar day in Pacific time as YYYY-MM-DD (to compare with the date input).
  const ptDate = (s: Shift) => s.startDate.toLocaleDateString('en-CA', { timeZone: PT_TZ })
  const matchesDate = (s: Shift) => !dateFilter || ptDate(s) === dateFilter
  const matches = (s: Shift) =>
    !term ||
    s.role.toLowerCase().includes(term) ||
    s.dateLabel.toLowerCase().includes(term) ||
    s.timeLabel.toLowerCase().includes(term)
  // A shift renders only if it belongs to a visible job (hidden/team-lead jobs are
  // filtered out by RLS, but guard here too), matches the search, meets age requirements,
  // and still has open spots (spots_left <= 0 hides full shifts). `shifts` itself is NOT filtered to drop
  // full shifts: it's owned by useShifts and shared with admins, and removeActiveShift
  // searches it by description to find the shift whose spots to restore on cancel — a
  // just-went-to-0 shift has to stay findable. Keep this filter at the presentation layer.
  const isAvailable = (s: Shift) => {
    // If no job or job not visible, filter out
    if (!s.hasJob || !s.jobVisible) return false

    // Check search match first (needed for all cases)
    const matchesSearch = matches(s)
    if (!matchesSearch) return false

    // Date filter (if a specific day is chosen)
    if (!matchesDate(s)) return false

    // If no age restriction on the job (minAge is null), allow all ages
    if (s.minAge === null) return true

    // Check if user meets the minimum age requirement
    return meetsAgeRequirement(userAgeRange, s.minAge)
  }
  const showShift = (s: Shift) => isAvailable(s) && s.spotsLeft > 0

  return (
    <div className="shifts-section">
      <div className="section-header">
        <h3>Available Volunteering Shifts</h3>
        <button
          onClick={onRefresh}
          className={`btn-refresh ${isRefreshSpinning ? 'is-spinning' : ''}`}
          disabled={loading}
        >
          <span className="btn-refresh-icon">🔄</span>
          {loading ? 'Refreshing...' : 'Refresh List'}
        </button>
      </div>

      <div className="shift-controls-row">
        <div className="shift-search">
          <input
            type="text"
            placeholder="Search shifts by job, date, or time…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search shifts"
          />
          {query && (
            <button type="button" className="shift-search-clear" onClick={() => setQuery('')} aria-label="Clear search">×</button>
          )}
        </div>
        <div className="shift-date-filter">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filter shifts by date"
          />
          {dateFilter && (
            <button type="button" className="btn-secondary btn-sm" onClick={() => setDateFilter('')}>Clear date</button>
          )}
        </div>
        <div className="sort-controls">
          <span className="sort-label">Sort by:</span>
          <div className="sort-btn-group">
            <button type="button" className={`sort-btn ${sortMode === 'job' ? 'active' : ''}`} onClick={() => setSortMode('job')}>Job</button>
            <button type="button" className={`sort-btn ${sortMode === 'date' ? 'active' : ''}`} onClick={() => setSortMode('date')}>Date</button>
            <button type="button" className={`sort-btn ${sortMode === 'calendar' ? 'active' : ''}`} onClick={() => setSortMode('calendar')}>Calendar</button>
          </div>
        </div>
      </div>

      <p className="tz-note">🕒 All shift times are shown in Pacific Time (PT)</p>

      {errorMessage && <div className="error-banner">{errorMessage}</div>}

      {loading ? (
        <div className="loading-spinner">Loading shift schedule...</div>
      ) : shifts.length === 0 ? (
        <p className="note-text">No shifts are currently posted. Check back soon!</p>
      ) : !shifts.some(showShift) ? (
        // No shift passed the filter. Distinguish "everything matching is full" from
        // "nothing matched the search/visibility" so the empty state isn't misleading.
        shifts.some(isAvailable) ? (
          <p className="note-text">All matching shifts are full. Try a different search or check back soon!</p>
        ) : (
          <p className="note-text">No shifts match “{query}”. Try a different search.</p>
        )
      ) : sortMode === 'job' ? (
        /* ---------- JOB VIEW: job → date (all shifts that day, incl. double shifts) ---------- */
        <div className="job-accordion">
          {jobGroupNames.map((role, groupIndex) => {
            const group = shiftsByJob[role].filter(showShift)
            if (group.length === 0) return null
            const isOpen = expandedJobs.has(role) || !!term
            const dayLabels = Array.from(new Set(group.map(s => s.dateLabel)))
            return (
              <div key={role} className="job-group">
                <button type="button" className="job-group-header" onClick={() => toggleJobGroup(role)}>
                  <span className={`job-group-toggle-icon ${isOpen ? 'open' : ''}`}>▸</span>
                  <span className="job-group-title">{groupIndex + 1}. {role}</span>
                  <span className="spots-badge">{dayLabels.length} date{dayLabels.length !== 1 ? 's' : ''}</span>
                </button>
                {isOpen && (
                  <div className="job-group-body">
                    {dayLabels.map(dayLabel => {
                      const dayShifts = group.filter(s => s.dateLabel === dayLabel)
                      const dateKey = `${role}-${dayLabel}`
                      const dateOpen = expandedDateKeys.has(dateKey) || !!term
                      const totalSpots = dayShifts.reduce((n, s) => n + s.spotsLeft, 0)
                      return (
                        <div key={dateKey} className="job-date-entry">
                          <button type="button" className="job-date-header" onClick={() => toggleDateEntry(dateKey)}>
                            <span className={`job-date-toggle-icon ${dateOpen ? 'open' : ''}`}>+</span>
                            <span className="job-date-label">{dayLabel}</span>
                            <span className="spots-badge">
                              {dayShifts.length > 1 ? `${dayShifts.length} shifts · ` : ''}{totalSpots} spots left
                            </span>
                          </button>
                          {dateOpen && (
                            <div className="job-date-details">
                              <div className="shifts-grid">
                                {dayShifts.map(shift => (
                                  <ShiftCard key={shift.id} shift={shift} onSignUp={onSignUp} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : sortMode === 'date' ? (
        /* ---------- DATE VIEW: flat chronological list, grouped by day ---------- */
        <div className="date-view">
          {Array.from(new Set(shiftsByDate.filter(showShift).map(s => s.dateLabel))).map(dateLabel => (
            <div key={dateLabel} className="date-block">
              <h4 className="date-block-title">{dateLabel}</h4>
              <div className="shifts-grid">
                {shiftsByDate.filter(s => s.dateLabel === dateLabel && showShift(s)).map(shift => (
                  <ShiftCard key={shift.id} shift={shift} onSignUp={onSignUp} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ---------- CALENDAR VIEW: pick a day, see what's available ---------- */
        <div className="calendar-view">
          {Object.entries(shiftsByMonth).map(([month, allMonthShifts]) => {
            const monthShifts = allMonthShifts.filter(showShift)
            if (monthShifts.length === 0) return null
            const uniqueDayKeys = Array.from(new Set(monthShifts.map(s => s.startDate.toDateString())))
            return (
              <div key={month} className="calendar-month-block">
                <h4 className="calendar-month-title">{month}</h4>
                <div className="calendar-day-chips">
                  {uniqueDayKeys.map(dayKey => {
                    const sample = monthShifts.find(s => s.startDate.toDateString() === dayKey)!
                    const isSelected = selectedCalendarDay === dayKey
                    return (
                      <button
                        key={dayKey}
                        type="button"
                        className={`calendar-day-chip ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedCalendarDay(isSelected ? null : dayKey)}
                      >
                        <span className="calendar-day-weekday">{sample.startDate.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className="calendar-day-num">{sample.startDate.getDate()}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {selectedCalendarDay ? (
            <div className="calendar-selected-shifts">
              <h4>
                Shifts on {shiftsByDate.find(s => s.startDate.toDateString() === selectedCalendarDay)?.dateLabel}
              </h4>
              <div className="shifts-grid">
                {shiftsByDate.filter(s => s.startDate.toDateString() === selectedCalendarDay && showShift(s)).map(shift => (
                  <ShiftCard key={shift.id} shift={shift} onSignUp={onSignUp} />
                ))}
              </div>
            </div>
          ) : (
            <p className="note-text">Select a day above to see available shifts.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default ShiftBrowser
