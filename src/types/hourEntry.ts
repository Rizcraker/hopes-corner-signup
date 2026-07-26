export type HourStatus = 'pending' | 'approved' | 'denied'

export interface HourEntry {
  id: string
  user_id: string
  hours: number
  task: string | null
  reason: string | null
  status: HourStatus
  created_at: string
  decided_at: string | null
  decided_by: string | null
}
