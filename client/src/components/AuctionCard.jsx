import { useState } from 'react'
import { Link } from 'react-router'
import { dateTime, isOpen, isUpcoming, money } from '../lib/auction'

export function AuctionImage({ src, title, className = '' }) {
  const [failed, setFailed] = useState(null)
  if (!src || failed === src) return <div className={`image-placeholder ${className}`} role="img" aria-label={`No image available for ${title}`}><span aria-hidden="true">◇</span><small>Image unavailable</small></div>
  return <img className={`auction-image ${className}`} src={src} alt={title} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(src)} />
}
export function StatusBadge({ auction, now }) {
  const open = isOpen(auction, now)
  const label = auction.approval && auction.approval !== 'approved' ? auction.approval === 'waiting' ? 'Awaiting approval' : 'Not approved' : isUpcoming(auction, now) ? 'Upcoming' : open ? 'Open for bids' : 'Closed'
  return <span className={`badge ${open ? 'open' : 'closed'}`}><span aria-hidden="true">●</span> {label}</span>
}
export default function AuctionCard({ auction, now }) {
  return <article className="auction-card"><Link className="card-image-link" to={`/auctions/${auction._id}`} aria-label={`View ${auction.title}`}><AuctionImage src={auction.imageUrl} title={auction.title} /><span className="card-status"><StatusBadge auction={auction} now={now} /></span><span className="card-arrow" aria-hidden="true">↗</span></Link><div className="card-body"><p className="eyebrow">{auction.category}</p><h3><Link to={`/auctions/${auction._id}`}>{auction.title}</Link></h3><div className="card-prices"><div><span>Current price</span><strong>{money(auction.currentPrice, auction.currency)}</strong></div><div><span>Starting at</span><b>{money(auction.startingPrice, auction.currency)}</b></div></div><div className="card-end"><span aria-hidden="true">◷</span> {isOpen(auction, now) ? 'Ends' : 'Ended'} <time dateTime={auction.endsAt}>{dateTime(auction.endsAt)}</time></div></div></article>
}
