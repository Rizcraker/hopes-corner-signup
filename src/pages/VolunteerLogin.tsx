import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function VolunteerLogin() {
  const navigate = useNavigate()

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    if (!token) {
      navigate('/')
      return
    }

    ;(async () => {
      try {
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
          'verify-volunteer-token',
          { body: { token } }
        )
        if (verifyError) throw verifyError
        if (!verifyData || !verifyData.volunteer_id) {
          throw new Error('Invalid token')
        }

        // Store volunteer ID in sessionStorage for temporary auth
        sessionStorage.setItem('hc_volunteer_id', verifyData.volunteer_id)
        // Optionally, remove token from URL to clean up
        window.history.replaceState({}, document.title, window.location.pathname)
        navigate('/volunteer')
      } catch (e: any) {
        console.error('Volunteer login error:', e)
        navigate('/')
      }
    })()
  }, [navigate])

  return <div>Redirecting...</div>
}