import type { Shift } from '../../types/shift'

interface ShiftCardProps {
  shift: Shift
  onSignUp: (shift: Shift) => Promise<void>
}

// Shared shift detail card used across the Job / Date / Calendar views so signup behaves identically everywhere
function ShiftCard({ shift, onSignUp }: ShiftCardProps) {
  return (
    <div className="shift-card">
      <div className="shift-card-header">
        <h4>{shift.role}</h4>
        <span className="spots-badge">{shift.spotsLeft} spots left</span>
      </div>
      <div className="shift-card-body">
        <p><strong>📅 Time:</strong> {shift.dateLabel} · {shift.timeLabel}</p>
        <p><strong>📍 Location:</strong> {shift.location}</p>
        <p><strong>📝 Description:</strong> {shift.description}</p>
        <div className="shift-requirements"><strong>⚠️ Requirements:</strong> {shift.requirements}</div>
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
