import './App.css'
import { useState, useRef, useLayoutEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
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

  // This is what lets the auth listener reach the shifts / user-info hooks without the three
  // hooks depending on each other in a cycle. It runs in a layout effect, which React fires
  // before any passive effect — including useVolunteerAuth's — so the bridge is always populated
  // before the auth listener subscribes or getSession() resolves.
  useLayoutEffect(() => {
    dataBridge.current = {
      fetchShifts: shiftsApi.fetchShifts,
      fetchUserInfo: userInfoApi.fetchUserInfo,
      clearShifts: () => shiftsApi.setShifts([]),
      clearUserInfo: () => userInfoApi.setUserInfo(null),
    }
  })

  return (
    <div className="App">
      {/* Universal Top Navigation Header */}
      <Navbar />

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
