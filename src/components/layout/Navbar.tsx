import { useLocation, useNavigate } from 'react-router-dom'
import logoGreen from '../../assets/Hopes_Corner_Logo_Green.png'

function Navbar({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Build navigation items - add Admin option only if user is an admin
  const NAV_ITEMS: { path: string; label: string }[] = [
    { path: '/', label: 'Home' },
    { path: '/donate', label: 'Donate' },
    { path: '/volunteer', label: 'Volunteer' },
    { path: '/learn', label: 'Learn' },
    { path: '/about', label: 'About' },
    { path: '/community', label: 'Community' },
    { path: '/news', label: 'News' },
    { path: '/contact', label: 'Contact' },
  ]

  // Rendered as <button>, not <a>/NavLink, on purpose: .nav-tab relies on the UA button defaults
  // (no underline, button font-family) that an anchor would not inherit from App.css.
  return (
    <header className="navbar">
      <div className="nav-container">
        <div className="nav-brand-group">
          <img src={logoGreen} alt="Hope's Corner Logo" className="app-logo" />
          <h1 className="header-title">Hope's Corner</h1>
        </div>
        <nav className="nav-tabs">
          {NAV_ITEMS.map(({ path, label }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`nav-tab ${pathname === path ? 'active' : ''}`}
            >
              {label}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className={`nav-tab nav-tab-admin ${pathname === '/admin' ? 'active' : ''}`}
            >
              <span className="nav-tab-admin-icon" aria-hidden="true">🛡️</span>
              Admin
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Navbar
