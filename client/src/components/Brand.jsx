import { Link } from 'react-router'

export default function Brand({ footer = false }) {
	return <Link to="/" className={footer ? 'footer-brand' : 'brand'} aria-label="AuctionXpress — The online auction house, home">
		<img className="brand-logo" src="/reference/logo.png" alt="" width="58" height="58" />
		<span className="brand-copy">
			<span className="brand-title">Auction<span className="brand-accent">Xpress</span></span>
			<small className="brand-subtitle">THE ONLINE AUCTION HOUSE</small>
		</span>
	</Link>
}
