import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import Brand from './Brand'

export default function Footer() {
  const { user } = useAuth()
  return <footer className="site-footer">
    <div className="container footer-main">
      <div className="footer-intro">
        <Brand footer />
        <p>A new home for extraordinary finds.<br />Discover, bid, and give great things their next chapter.</p>
      </div>
      <nav className="footer-column" aria-label="Explore the marketplace">
        <h2>Explore</h2>
        <Link to="/auctions">Browse auctions</Link>
        <Link to="/sellers">Meet the sellers</Link>
        <Link to="/about">About us</Link>
        <Link to="/contact">Contact us</Link>
      </nav>
      <nav className="footer-column" aria-label="Your account">
        <h2>Your account</h2>
        {user ? <>
          <Link to={user.role === 'admin' ? '/admin' : '/dashboard'}>{user.role === 'admin' ? 'Admin panel' : user.role === 'seller' ? 'My listings' : 'My bids'}</Link>
          <Link to="/profile">Profile settings</Link>
        </> : <>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Create an account</Link>
        </>}
        {(!user || user.role !== 'buyer') && <Link to="/auctions/new">Start an auction</Link>}
      </nav>
    </div>
    <div className="container footer-bottom">
      <p>AuctionXpress <span aria-hidden="true">·</span> Great finds. New stories.</p>
    </div>
  </footer>
}
