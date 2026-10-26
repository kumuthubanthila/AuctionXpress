import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { ErrorNotice } from './Feedback'
import Brand from './Brand'
import Footer from './Footer'
import ActivityPanels from './ActivityPanels'
import AccountMenu from './AccountMenu'

export default function Layout() {
  const [menu, setMenu] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const topPane = useRef(null)
  useEffect(() => {
    const pane = topPane.current
    const updateHeight = () => document.documentElement.style.setProperty('--top-pane-height', `${pane.getBoundingClientRect().height}px`)
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(pane)
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--top-pane-height') }
  }, [])
  useEffect(() => {
    setMenu(false); window.scrollTo(0, 0); document.querySelector('main')?.focus()
    const titles = { '/': 'Discover your next great find', '/signup': 'Sign up', '/login': 'Log in', '/admin': 'Admin panel', '/profile': 'Your profile', '/about': 'About us', '/contact': 'Contact us', '/sellers': 'Sellers', '/dashboard': 'Dashboard', '/messages': 'Messages', '/auctions': 'Browse auctions' }
    document.title = `${titles[pathname] || (pathname.includes('edit') ? 'Edit auction' : pathname.endsWith('new') ? 'Create auction' : pathname.endsWith('checkout') ? 'Checkout' : 'Auction details')} | AuctionXpress`
  }, [pathname])
  async function signOut() {
    setPending(true); setError(null)
    try { await logout(); navigate('/login') } catch (failure) { setError(failure) } finally { setPending(false) }
  }
  return <><a className="skip-link" href="#main">Skip to content</a><div className="top-pane" ref={topPane}><div className="announcement">A new home for great finds. <span>Discover. Bid. Make it yours.</span></div><header className="site-header"><div className="container nav-wrap"><Brand /><button className="menu-toggle" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} aria-controls="navigation" onClick={() => setMenu(!menu)}>{menu ? '✕' : '☰'}</button><nav id="navigation" className={menu ? 'nav open' : 'nav'} aria-label="Main navigation"><NavLink to="/" end>Home</NavLink><NavLink to="/auctions" end>Auctions</NavLink>{user ? <>{['buyer','seller'].includes(user.role) && <ActivityPanels key={user._id} />}{user.role === 'seller' && <NavLink to="/auctions/new" className="button small">List an item +</NavLink>}<AccountMenu user={user} pending={pending} onLogout={signOut} /></> : <><NavLink to="/login">Log in</NavLink><NavLink to="/signup" className="button small">Sign up ↗</NavLink></>}</nav></div></header></div><main id="main" className="container main" tabIndex="-1">{error && <ErrorNotice error={error} />}<Outlet key={user?._id || 'guest'} /></main><Footer /></>
}
