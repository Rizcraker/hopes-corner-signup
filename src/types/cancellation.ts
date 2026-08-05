export interface Cancellation {
  id: string
  user_id: string | null
  shift_id: string | null
  shift_start: string | null
  job_name: string | null
  cancelled_at: string
  hours_before: number | null
  late: boolean
  notified: boolean
}
