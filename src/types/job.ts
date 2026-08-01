export interface Job {
  id: string
  name: string
  description: string | null
  requirements: string | null
  location: string | null
  visible: boolean
  password: string | null
  min_age: number
  self_report: boolean
  created_at: string
}
