import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function VolunteerProfile() {
  const [token, setToken] = useState<string | null>(null)
  const [volunteer, setVolunteer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search)
    const t = urlParams.get('token')
    if (t) {
      setToken(t)
    } else {
      setError('No token provided')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!token) return

    let isMounted = true

    const loadVolunteer = async () => {
      try {
        // Verify token via Edge Function
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
          'verify-volunteer-token',
          { body: { token } }
        )
        if (verifyError) throw verifyError
        if (!verifyData || !verifyData.volunteer_id) {
          throw new Error('Invalid token')
        }

        // Fetch volunteer data
        const { data: volunteerData, error: fetchError } = await supabase
          .from('user_info')
          .select('*')
          .eq('user_id', verifyData.volunteer_id)
          .single()
        if (fetchError) throw fetchError
        if (!volunteerData) {
          throw new Error('Volunteer not found')
        }

        if (isMounted) {
          setVolunteer(volunteerData)
          setError(null)
        }
      } catch (e: any) {
        if (isMounted) {
          setError(e.message ?? 'Unknown error')
          setVolunteer(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadVolunteer()

    return () => {
      isMounted = false
    }
  }, [token])

  if (loading) {
    return <div className="container">Loading...</div>
  }

  if (error) {
    return (
      <div className="container">
        <h2>Error</h2>
        <p>{error}</p>
        <p>
          This link may have expired or is invalid. Please request a new link from an administrator.
        </p>
      </div>
    )
  }

  if (!volunteer) {
    return <div className="container">Unexpected state</div>
  }

  const { first_name, last_name, email, organization, active_shifts, hours_volunteered } = volunteer

  return (
    <div className="container">
      <h2>Volunteer Profile</h2>
      <div className="profile-card">
        <p><strong>Name:</strong> {first_name ?? ''} {last_name ?? ''}</p>
        <p><strong>Email:</strong> {email ?? ''}</p>
        <p><strong>Organization:</strong> {organization ?? ''}</p>
        <p><strong>Hours Volunteered:</strong> {hours_volunteered ?? 0}</p>
        <p><strong>Active Shifts:</strong> {(active_shifts ?? []).join(', ') || 'None'}</p>
      </div>
    </div>
  )
}