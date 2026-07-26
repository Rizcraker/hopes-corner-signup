export type SignupStatus = 'signed_up' | 'cancelled' | 'no_show' | 'attended'

export interface Signup {
  id: string
  shift_id: string
  user_id: string | null
  manual_name: string | null
  status: SignupStatus
  hours_reported: number | null
  notes: string | null
  created_at: string
}
