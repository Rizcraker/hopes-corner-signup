import type { Shift } from '../../types/shift'

interface ShiftCardProps {
  shift: Shift
  onSignUp: (shift: Shift) => Promise<void>
}

// Shared shift card used across the Job / Date / Calendar views so signup behaves identically
// everywhere. With title/description/requirements gone from the shifts table (sourced from the
// parent job now), the card shows the job title, time, and open spots only.
function ShiftCard({ shift, onSignUp }: ShiftCardProps) {
  return (
    <div className="shift-card">
      <div className="shift-card-header">
        <h4>{shift.role}</h4>
        <span className="spots-badge">{shift.spotsLeft} spots left</span>
      </div>
      <div className="shift-card-body">
        <p><strong>📅 Time:</strong> {shift.dateLabel} · {shift.timeLabel}</p>
        {shift.jobDescription && (
          <p className="shift-card-desc">{shift.jobDescription}</p>
        )}
        {shift.jobRequirements && (
          <p className="shift-card-reqs"><strong>Requirements:</strong> {shift.jobRequirements}</p>
        )}
      </div>
      <div className="shift-card-footer">
        <button
          className="btn-accent"
          onClick={async () => {
            await onSignUp(shift)
          }}
        >
          Sign Up To Volunteer
        </button>
      </div>
    </div>
  )
}

export default ShiftCard
