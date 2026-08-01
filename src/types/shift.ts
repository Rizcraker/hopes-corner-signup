export interface Shift {
  id: string
  role: string
  time: string
  location: string
  description: string
  requirements: string
  spotsLeft: number
  startDate: Date
  dateLabel: string
  timeLabel: string
  jobId: string | null
  password: string | null
  minAge: number | null
  jobVisible: boolean
  hasJob: boolean
  recurrenceGroup: string | null
}
