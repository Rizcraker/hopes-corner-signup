export interface Shift {
  id: string
  // Sourced from the parent job's `name` (the shifts table no longer carries
  // title/description/requirements). Used for job-view grouping, the card
  // heading, and matching a volunteer's stored active-shift strings.
  role: string
  time: string
  spotsLeft: number
  startDate: Date
  dateLabel: string
  timeLabel: string
  jobId: string | null
  capacity: number | null
  password: string | null
}
