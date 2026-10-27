import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import useApi from '../hooks/useApi'
import useNow from '../hooks/useNow'
import { AuctionImage, StatusBadge } from '../components/AuctionCard'
import BidForm from '../components/BidForm'
import DeleteAuction from '../components/DeleteAuction'
import { EmptyState, ErrorNotice, Loading } from '../components/Feedback'
import { countdown, dateTime, isOpen, isUpcoming, money } from '../lib/auction'
import { manages, useAuth } from '../context/AuthContext'
import BidOverview from '../components/BidOverview'
import { openSellerChat } from '../lib/messaging'

export default function AuctionDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const auction = useApi(`/auctions/${id}`, 15000)
  const history = useApi(`/auctions/${id}/bids`, 15000)
  const now = useNow()
  const { user } = useAuth()
  const result = useApi(`/auctions/${id}/result`, 15000)
  const item = auction.data?.data
  const loaded = Boolean(item)
  useEffect(() => {
    if (loaded && location.hash === '#bidding-overview') document.getElementById('bidding-overview')?.scrollIntoView({ block: 'start' })
  }, [loaded, location.hash])
  const refresh = () => { auction.refresh(); history.refresh(); result.refresh() }
  if (!item) return <section className="section"><Link className="back-link" to="/auctions">← Back to auctions</Link>{auction.loading ? <Loading label="Loading auction…" /> : <><ErrorNotice error={auction.error} retry={auction.refresh} />{auction.error?.status === 404 && <EmptyState title="This auction is no longer available." message="There are more discoveries waiting in the marketplace." to="/auctions" action="Browse auctions" />}</>}</section>
  const open = isOpen(item, now)
  const upcoming = isUpcoming(item, now)
  const pending = item.approval && item.approval !== 'approved'
  const closed = !pending && !upcoming && !open
  const sellerCanEdit = user?.role === 'seller' && manages(user, item)
  return <section className="section page-section"><div className="detail-toolbar"><Link className="back-link" to="/auctions">← Back to auctions</Link>{manages(user, item) && <div className="action-row"><Link className="button secondary small" to={`/auctions/${id}/edit`}>Edit auction</Link><DeleteAuction auction={item} onDeleted={() => navigate('/dashboard', { replace: true })} /></div>}</div>
    {location.state?.message && <div className="notice success" role="status">{location.state.message}</div>}<ErrorNotice error={auction.error} retry={auction.refresh} />
    {pending && <div className="notice" role="status">Approval: {item.approval}. This listing is not public and cannot receive bids.</div>}
    <p className="seller-byline">Listed by {item.sellerName || 'Legacy seller'}{item.startsAt && <> · Starts {dateTime(item.startsAt)}</>}</p>
    {user?.role === 'buyer' && item.sellerId && (!item.approval || item.approval === 'approved') && <button type="button" className="button secondary small message-seller-button" onClick={() => openSellerChat(item)}>Message seller ↗</button>}<ErrorNotice error={result.error} retry={result.refresh} />
    {result.data?.data.ended && <div className="notice success" role="status">{result.data.data.winner ? <>{user ? `Winning bidder: ${result.data.data.winner.bidderName} · ` : 'Winning bid: '}{money(result.data.data.winner.amount, item.currency)}.{result.data.data.won && <Link className="button small" to={`/auctions/${id}/checkout`}>{result.data.data.payment ? 'View receipt' : 'Checkout'}</Link>}</> : 'This auction ended without any bids.'}</div>}
    <div className="detail-layout"><div><div className="detail-image"><AuctionImage src={item.imageUrl} title={item.title} /><span className="card-status"><StatusBadge auction={item} now={now} /></span></div><div className="detail-description"><p className="eyebrow">{item.category}</p><h1>{item.title}</h1><h2>About this item</h2><p className="description-text">{item.description}</p><div className="item-meta"><div><span>Listed</span><strong>{item.createdAt ? dateTime(item.createdAt) : '—'}</strong></div><div><span>Last updated</span><strong>{item.updatedAt ? dateTime(item.updatedAt) : '—'}</strong></div></div></div></div>
      <aside className="bidding-panel panel"><div className="price-heading"><span>{now >= Date.parse(item.endsAt) ? 'Closing price' : 'Current price'}</span><StatusBadge auction={item} now={now} /></div>{sellerCanEdit && <Link className="button secondary small item-panel-edit" to={`/auctions/${id}/edit`}>Edit auction</Link>}<strong className="detail-price">{money(item.currentPrice, item.currency)}</strong><p className="starting-price">Starting price <b>{money(item.startingPrice, item.currency)}</b></p><div className={`countdown ${closed ? 'ended' : ''}`}><span>{pending ? 'AWAITING REVIEW' : upcoming ? 'BIDDING STARTS IN' : open ? 'TIME LEFT TO BID' : 'BIDDING CLOSED'}</span><strong>{pending ? 'Review pending' : countdown(upcoming ? item.startsAt : item.endsAt, now)}</strong><small>Ends {dateTime(item.endsAt)}</small></div><BidForm key={id} auction={item} open={open} unavailableReason={pending ? 'This auction is not approved.' : upcoming ? 'Bidding opens soon.' : undefined} blocked={auction.loading || Boolean(auction.error)} onRefresh={refresh} /><div className="refresh-note"><span>{auction.loading || history.loading ? 'Refreshing…' : 'Updates every 15 seconds'}</span><button className="text-button" onClick={refresh} disabled={auction.loading || history.loading}>Refresh ↻</button></div></aside>
    </div>
    <BidOverview auction={item} bids={history.data?.data} loading={history.loading} error={history.error} refresh={history.refresh} now={now} userId={user?._id} hideBidderIdentity={!user} />
    <section className="history-section"><div className="section-heading"><div><p className="eyebrow">FOLLOW THE ACTION</p><h2>Bid history {history.data && <span className="count-pill">{history.data.count}</span>}</h2><p>Every accepted bid, most recent first.</p></div></div><ErrorNotice error={history.error} retry={history.refresh} />{history.loading && !history.data ? <Loading label="Loading bid history…" /> : history.data && (history.data.data.length ? <div className="panel table-wrap"><table><caption className="sr-only">Accepted bids for {item.title}</caption><thead><tr>{user && <th scope="col">Bidder</th>}<th scope="col">Bid amount</th><th scope="col">Placed at</th></tr></thead><tbody>{history.data.data.map((bid) => <tr key={bid._id}>{user && <td><div className="bidder"><span className="avatar" aria-hidden="true">{bid.bidderName.slice(0, 1).toUpperCase()}</span><strong>{bid.bidderName}</strong></div></td>}<td><strong>{money(bid.amount, item.currency)}</strong></td><td><time dateTime={bid.createdAt}>{dateTime(bid.createdAt)}</time></td></tr>)}</tbody></table></div> : <EmptyState title={open ? 'The first move is yours.' : 'No bids were placed.'} message={open ? 'No bids yet. Place the first bid using the form above.' : 'This auction closed without any bids.'} to={null} />)}</section>
  </section>
}
