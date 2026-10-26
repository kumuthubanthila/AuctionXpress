import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'

export default function AccountMenu({ user, pending, onLogout }) {
  const menu = useRef(null)
  const { pathname } = useLocation()
  useEffect(() => { menu.current?.removeAttribute('open') }, [pathname])
  useEffect(() => {
    function outside(event) { if (!menu.current?.contains(event.target)) menu.current?.removeAttribute('open') }
    function escape(event) {
      if (event.key === 'Escape' && menu.current?.open) {
        menu.current.removeAttribute('open')
        menu.current.querySelector('summary')?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [])
  return <details className="account-menu" ref={menu}>
    <summary><span className="account-avatar" aria-hidden="true">{user.username[0].toUpperCase()}</span>Account <span className="account-chevron" aria-hidden="true">⌄</span></summary>
    <div className="account-menu-panel">
      <div className="account-menu-identity"><strong>{user.username}</strong><small>{user.role} account</small></div>
      <Link to={user.role === 'admin' ? '/admin' : '/dashboard'}>{user.role === 'admin' ? 'Admin panel' : user.role === 'seller' ? 'My listings' : 'My bids'}</Link>
      <Link to="/profile">Profile settings</Link>
      {['seller', 'admin'].includes(user.role) && <Link to="/auctions/new">Create auction</Link>}
      <button type="button" disabled={pending} onClick={onLogout}>{pending ? 'Logging out…' : 'Log out'}</button>
    </div>
  </details>
}
