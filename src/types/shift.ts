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
  capacity: number | null
  password: string | null
}
