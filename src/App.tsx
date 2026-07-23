import './App.css'
import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useVolunteerAuth } from './hooks/useVolunteerAuth'
import type { AuthDataBridge } from './hooks/useVolunteerAuth'
import { useUserInfo } from './hooks/useUserInfo'
import { useShifts } from './hooks/useShifts'
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

  // Every hook below is called here, above <Routes>, and its result passed down as props.
  // Route elements unmount on navigation, so state owned further down would reset each time you
  // left the tab — today it survives, and it has to keep surviving.
  const dataBridge = useRef<AuthDataBridge>({
    fetchShifts: async () => {},
    fetchUserInfo: async () => {},
    clearShifts: () => {},
    clearUserInfo: () => {},
  })

  const auth = useVolunteerAuth(dataBridge)
  const userInfoApi = useUserInfo({
    userSession: auth.userSession,
    isBypassActive: auth.isBypassActive,
    setErrorMessage: auth.setErrorMessage,
  })
  const shiftsApi = useShifts({
    isBypassActive: auth.isBypassActive,
    setErrorMessage: auth.setErrorMessage,
    userInfo: userInfoApi.userInfo,
    setUserInfo: userInfoApi.setUserInfo,
  })
  const navigate = useNavigate()

  // Populate the data bridge so hooks can call each other
  useLayoutEffect(() => {
    dataBridge.current = {
      fetchShifts: shiftsApi.fetchShifts,
      fetchUserInfo: userInfoApi.fetchUserInfo,
      clearShifts: shiftsApi.clearShifts,
      clearUserInfo: userInfoApi.clearUserInfo,
    }
  }, [shiftsApi, userInfoApi])

  // Track if we've already handled redirection after login
  const [redirected, setRedirected] = useState(false)

  // Handle post-login redirection - only run once after successful login
  useEffect(() => {
    // Only redirect if:
    // 1. Auth has completed (no longer loading)
    // 2. User is authenticated (has a session)
    // 3. Admin status has been loaded
    // 4. We haven't redirected yet
    if (!auth.authLoading && auth.userSession && !auth.adminLoading && !redirected && !auth.isBypassActive) {
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
  }, [auth.authLoading, auth.userSession, auth.adminLoading, redirected, auth.isBypassActive, navigate])

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

          {/* ================= ABOUT TAB ================= */}
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