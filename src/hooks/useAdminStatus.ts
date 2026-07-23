import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

interface UserSession {
  user: {
    id: string
  }
}

interface UseAdminStatusDeps {
  userSession: UserSession | null
  isBypassActive: boolean
}

interface AdminStatus {
  isAdmin: boolean
  loading: boolean
}

function useAdminStatus({ userSession, isBypassActive }: UseAdminStatusDeps): AdminStatus {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkAdminStatus = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } else {
        // A record means this user is an admin
        setIsAdmin(!!data)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check if user is an admin
    if (userSession?.user) {
      checkAdminStatus(userSession.user.id)
    } else {
      // No user session, so not an admin
      setIsAdmin(false)
      setLoading(false)
    }
  }, [userSession?.user?.id, isBypassActive, checkAdminStatus])

  return { isAdmin, loading }
}

export { useAdminStatus }
export type { AdminStatus }
