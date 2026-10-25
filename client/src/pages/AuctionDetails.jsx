import { Link, useLocation, useNavigate, useParams } from 'react-router'
import useApi from '../hooks/useApi'
import useNow from '../hooks/useNow'
import { AuctionImage, StatusBadge } from '../components/AuctionCard'
import BidForm from '../components/BidForm'
import DeleteAuction from '../components/DeleteAuction'
import { EmptyState, ErrorNotice, Loading } from '../components/Feedback'
import { countdown, dateTime, isOpen, money } from '../lib/auction'

export default function AuctionDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const auction = useApi(`/auctions/${id}`, 15000)
  const history = useApi(`/auctions/${id}/bids`, 15000)
  const now = useNow()
  const item = auction.data?.data
  const refresh = () => { auction.refresh(); history.refresh() }
  if (!item) return <section className="section"><Link className="back-link" to="/auctions">← Back to auctions</Link>{auction.loading ? <Loading label="Loading auction…" /> : <><ErrorNotice error={auction.error} retry={auction.refresh} />{auction.error?.status === 404 && <EmptyState title="This auction is no longer available." message="There are more discoveries waiting in the marketplace." to="/auctions" action="Browse auctions" />}</>}</section>
  const open = isOpen(item, now)
  return <section className="section page-section"><div className="detail-toolbar"><Link className="back-link" to="/auctions">← Back to auctions</Link><div className="action-row"><Link className="button secondary small" to={`/auctions/${id}/edit`}>Edit auction</Link><DeleteAuction auction={item} onDeleted={() => navigate('/dashboard', { replace: true })} /></div></div>
    {location.state?.message && <div className="notice success" role="status">{location.state.message}</div>}<ErrorNotice error={auction.error} retry={auction.refresh} />
    <div className="detail-layout"><div><div className="detail-image"><AuctionImage src={item.imageUrl} title={item.title} /><span className="card-status"><StatusBadge auction={item} now={now} /></span></div><div className="detail-description"><p className="eyebrow">{item.category}</p><h1>{item.title}</h1><h2>About this item</h2><p className="description-text">{item.description}</p><div className="item-meta"><div><span>Listed</span><strong>{item.createdAt ? dateTime(item.createdAt) : '—'}</strong></div><div><span>Last updated</span><strong>{item.updatedAt ? dateTime(item.updatedAt) : '—'}</strong></div></div></div></div>
      <aside className="bidding-panel panel"><div className="price-heading"><span>{open ? 'Current price' : 'Closing price'}</span><StatusBadge auction={item} now={now} /></div><strong className="detail-price">{money(item.currentPrice)}</strong><p className="starting-price">Starting price <b>{money(item.startingPrice)}</b></p><div className={`countdown ${!open ? 'ended' : ''}`}><span>{open ? 'TIME LEFT TO BID' : 'BIDDING CLOSED'}</span><strong>{countdown(item.endsAt, now)}</strong><small>{open ? 'Ends' : 'Ended'} {dateTime(item.endsAt)}</small></div><BidForm key={id} auction={item} open={open} blocked={auction.loading || Boolean(auction.error)} onRefresh={refresh} /><div className="refresh-note"><span>{auction.loading || history.loading ? 'Refreshing…' : 'Updates every 15 seconds'}</span><button className="text-button" onClick={refresh} disabled={auction.loading || history.loading}>Refresh ↻</button></div></aside>
    </div>
    <section className="history-section"><div className="section-heading"><div><p className="eyebrow">FOLLOW THE ACTION</p><h2>Bid history {history.data && <span className="count-pill">{history.data.count}</span>}</h2><p>Every accepted bid, most recent first.</p></div></div><ErrorNotice error={history.error} retry={history.refresh} />{history.loading && !history.data ? <Loading label="Loading bid history…" /> : history.data && (history.data.data.length ? <div className="panel table-wrap"><table><caption className="sr-only">Accepted bids for {item.title}</caption><thead><tr><th scope="col">Bidder</th><th scope="col">Bid amount</th><th scope="col">Placed at</th></tr></thead><tbody>{history.data.data.map((bid) => <tr key={bid._id}><td><div className="bidder"><span className="avatar" aria-hidden="true">{bid.bidderName.slice(0, 1).toUpperCase()}</span><strong>{bid.bidderName}</strong></div></td><td><strong>{money(bid.amount)}</strong></td><td><time dateTime={bid.createdAt}>{dateTime(bid.createdAt)}</time></td></tr>)}</tbody></table></div> : <EmptyState title={open ? 'The first move is yours.' : 'No bids were placed.'} message={open ? 'No bids yet. Place the first bid using the form above.' : 'This auction closed without any bids.'} to={null} />)}</section>
  </section>
}
