import { useState } from 'react'
import type { Shift } from '../../types/shift'
import ShiftCard from './ShiftCard'

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
}: ShiftBrowserProps) {
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()
  const matches = (s: Shift) =>
    !term ||
    s.role.toLowerCase().includes(term) ||
    s.location.toLowerCase().includes(term) ||
    s.description.toLowerCase().includes(term)

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
            placeholder="Search shifts by job, location, or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search shifts"
          />
          {query && (
            <button type="button" className="shift-search-clear" onClick={() => setQuery('')} aria-label="Clear search">×</button>
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

      {errorMessage && <div className="error-banner">{errorMessage}</div>}

      {loading ? (
        <div className="loading-spinner">Loading shift schedule...</div>
      ) : shifts.length === 0 ? (
        <p className="note-text">No shifts are currently posted. Check back soon!</p>
      ) : !shifts.some(matches) ? (
        <p className="note-text">No shifts match “{query}”. Try a different search.</p>
      ) : sortMode === 'job' ? (
        /* ---------- JOB VIEW: accordion grouped by role, expand to reveal individual dates ---------- */
        <div className="job-accordion">
          {jobGroupNames.map((role, groupIndex) => {
            const group = shiftsByJob[role].filter(matches)
            if (group.length === 0) return null
            const isOpen = expandedJobs.has(role) || !!term
            return (
              <div key={role} className="job-group">
                <button type="button" className="job-group-header" onClick={() => toggleJobGroup(role)}>
                  <span className={`job-group-toggle-icon ${isOpen ? 'open' : ''}`}>▸</span>
                  <span className="job-group-title">{groupIndex + 1}. {role}</span>
                  <span className="spots-badge">{group.length} date{group.length !== 1 ? 's' : ''}</span>
                </button>
                {isOpen && (
                  <div className="job-group-body">
                    {group.map(shift => {
                      const dateKey = `${role}-${shift.id}`
                      const dateOpen = expandedDateKeys.has(dateKey)
                      return (
                        <div key={shift.id} className="job-date-entry">
                          <button type="button" className="job-date-header" onClick={() => toggleDateEntry(dateKey)}>
                            <span className={`job-date-toggle-icon ${dateOpen ? 'open' : ''}`}>+</span>
                            <span className="job-date-label">{shift.dateLabel}</span>
                            <span className="spots-badge">{shift.spotsLeft} spots left</span>
                          </button>
                          {dateOpen && (
                            <div className="job-date-details">
                              <ShiftCard key={shift.id} shift={shift} onSignUp={onSignUp} />
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
          {Array.from(new Set(shiftsByDate.filter(matches).map(s => s.dateLabel))).map(dateLabel => (
            <div key={dateLabel} className="date-block">
              <h4 className="date-block-title">{dateLabel}</h4>
              <div className="shifts-grid">
                {shiftsByDate.filter(s => s.dateLabel === dateLabel && matches(s)).map(shift => (
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
            const monthShifts = allMonthShifts.filter(matches)
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
                {shiftsByDate.filter(s => s.startDate.toDateString() === selectedCalendarDay && matches(s)).map(shift => (
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
