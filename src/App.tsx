import './App.css'
import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useVolunteerAuth } from './hooks/useVolunteerAuth'
import type { AuthDataBridge } from './hooks/useVolunteerAuth'
import { useUserInfo } from './hooks/useUserInfo'
import { useShifts } from './hooks/useShifts'
import type { Shift } from './types/shift'
import type { UserInfo } from './types/userInfo'
import type { Dispatch, SetStateAction } from 'react'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import BadgesRow from './components/layout/BadgesRow'
import HomePage from './pages/HomePage'
import DonatePage from './pages/DonatePage'
import VolunteerPage from './pages/VolunteerPage'
import LearnPage from './pages/LearnPage'
import AboutPage from './pages/AboutPage'
import CommunityPage from './pages/CommunityPage'
import NewsPage from './pages/NewsPage'
import ContactPage from './pages/ContactPage'
import AdminPage from './pages/AdminPage'

function App() {
  const { pathname } = useLocation()

  // Navigation tabs state
  const [communityTab, setCommunityTab] = useState<string>('stories')
  const [newsTab, setNewsTab] = useState<string>('press')

  // State for shared data
  const [shifts, setShiftsState] = useState<Shift[]>([])

  // Refs for functions that are passed between hooks to break circular dependencies
  const updateShiftSpotsLeftRef = useRef<(shiftId: string, change: number) => Promise<void>>(async () => {})
  const setUserInfoRef = useRef<Dispatch<SetStateAction<UserInfo | null>>>((_) => {})
  const setShiftsRef = useRef<Dispatch<SetStateAction<Shift[]>>>((_) => {})

  // Initialize the auth hook with a bridge ref (we'll update it later)
  const authBridgeRef = useRef<AuthDataBridge>({
    fetchShifts: async () => {},
    fetchUserInfo: async () => {},
    clearShifts: () => {},
    clearUserInfo: () => {},
    updateShiftSpotsLeft: async () => {},
    setUserInfo: () => {}
  })
  const auth = useVolunteerAuth(authBridgeRef)

  // Initialize the other hooks with current values (using refs for inter-hook functions)
  const userInfoApi = useUserInfo({
    userSession: auth.userSession,
    setErrorMessage: auth.setErrorMessage,
    updateShiftSpotsLeft: updateShiftSpotsLeftRef.current,
    shifts
  })

  const shiftsApi = useShifts({
    setErrorMessage: auth.setErrorMessage
  })

  // Update the refs with the real functions from the hooks (after they have initialized)
  useLayoutEffect(() => {
    updateShiftSpotsLeftRef.current = shiftsApi.updateShiftSpotsLeft
    setUserInfoRef.current = userInfoApi.setUserInfo
    setShiftsRef.current = shiftsApi.setShifts
  }, [shiftsApi, userInfoApi])

  // Update the auth bridge ref with the real functions from the hooks
  useLayoutEffect(() => {
    authBridgeRef.current = {
      fetchShifts: shiftsApi.fetchShifts,
      fetchUserInfo: userInfoApi.fetchUserInfo,
      clearShifts: shiftsApi.clearShifts,
      clearUserInfo: userInfoApi.clearUserInfo,
      updateShiftSpotsLeft: shiftsApi.updateShiftSpotsLeft,
      setUserInfo: userInfoApi.setUserInfo
    }
  }, [shiftsApi, userInfoApi])

  // Sync local state with the hooks' state
  useEffect(() => {
    setShiftsState(shiftsApi.shifts)
  }, [shiftsApi.shifts])

  const navigate = useNavigate()

  // Track if we've already handled redirection after login
  const [redirected, setRedirected] = useState(false)

  // Handle post-login redirection - only run once after successful login
  useEffect(() => {
    // Only redirect if:
    // 1. Auth has completed (no longer loading)
    // 2. User is authenticated (has a session)
    // 3. Admin status has been loaded
    // 4. We haven't redirected yet
    if (!auth.authLoading && auth.userSession && !auth.adminLoading && !redirected) {
      setRedirected(true)
      // Redirect based on admin status
      if (auth.isAdmin) {
        // Admins go to admin dashboard
        navigate('/admin', { replace: true })
      } else {
        // Regular users go to volunteer page
        navigate('/volunteer', { replace: true })
      }
    }
  }, [auth.authLoading, auth.userSession, auth.adminLoading, redirected, navigate])

  // Reset redirect flag when user logs out
  useEffect(() => {
    if (!auth.userSession) {
      setRedirected(false)
    }
  }, [auth.userSession, setRedirected])

  return (
    <div className="App">
      {/* Universal Top Navigation Header */}
      <Navbar isAdmin={auth.isAdmin} />

      {/* Primary Display Content Grid */}
      <main className="main-content">
        <Routes>

          {/* ================= HOME TAB ================= */}
          <Route path="/" element={<HomePage />} />

          {/* ================= DONATE TAB ================= */}
          <Route path="/donate" element={<DonatePage />} />

          {/* ================= VOLUNTEER PORTAL TAB ================= */}
          <Route path="/volunteer" element={<VolunteerPage auth={auth} userInfoApi={userInfoApi} shiftsApi={shiftsApi} />} />

          {/* ================= LEARN TAB ================= */}
          <Route path="/learn" element={<LearnPage />} />

          {/* ================= ABOVE TAB ================= */}
          <Route path="/about" element={<AboutPage />} />

          {/* ================= COMMUNITY TAB ================= */}
          <Route path="/community" element={<CommunityPage communityTab={communityTab} setCommunityTab={setCommunityTab} />} />

          {/* ================= NEWS TAB ================= */}
          <Route path="/news" element={<NewsPage newsTab={newsTab} setNewsTab={setNewsTab} />} />

          {/* ================= CONTACT TAB ================= */}
          <Route path="/contact" element={<ContactPage />} />

          {/* ================= ADMIN DASHBOARD (ACCESSIBLE ONLY TO ADMINS) ================= */}
          <Route
            path="/admin"
            element={
              !auth.adminLoading && auth.isAdmin ? (
                <AdminPage
                  getUserName={auth.getUserName}
                  shiftsApi={shiftsApi}
                  userInfoApi={userInfoApi}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Unknown paths fall back to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </main>

      {/* Conditionally Rendered Badges Row (Home and Donate tabs only) */}
      {(pathname === '/' || pathname === '/donate') && <BadgesRow />}

      {/* Footer component */}
      <Footer />
    </div>
  )
}

export default App