import { Link } from 'react-router'
import useApi from '../hooks/useApi'
import useNow from '../hooks/useNow'
import { AuctionImage, StatusBadge } from '../components/AuctionCard'
import DeleteAuction from '../components/DeleteAuction'
import { EmptyState, ErrorNotice, Loading } from '../components/Feedback'
import { dateTime, isOpen, money } from '../lib/auction'
import { useAuth } from '../context/AuthContext'
import { BiddingGuide } from '../components/BidOverview'

function BuyerDashboard() {
  const { data, error, loading, refresh } = useApi('/account/bids', 15000)
  return <section className="section page-section"><div className="page-heading"><p className="eyebrow">YOUR BUYER WORKSPACE</p><h1>Every bid. Every possibility.</h1><p>Follow your accepted bids and open each auction to see its latest result.</p></div><ErrorNotice error={error} retry={refresh} />{loading && !data ? <Loading label="Loading your bids…" /> : data && (data.data.length ? <div className="table-wrap panel"><table><thead><tr><th>Auction</th><th>Your bid</th><th>Current price</th><th>Closes</th></tr></thead><tbody>{data.data.map((bid) => <tr key={bid._id}><td><Link className="text-link" to={`/auctions/${bid.auctionId?._id}`}>{bid.auctionId?.title || 'Auction unavailable'}</Link></td><td>{money(bid.amount, bid.auctionId?.currency)}</td><td>{bid.auctionId ? money(bid.auctionId.currentPrice, bid.auctionId.currency) : '—'}</td><td>{bid.auctionId ? dateTime(bid.auctionId.endsAt) : '—'}</td></tr>)}</tbody></table></div> : <EmptyState title="Your bidding story starts here." message="Explore approved auctions and place your first bid." to="/auctions" action="Browse auctions" />)}</section>
}

export default function Dashboard(props) {
  const { user } = useAuth()
  if (user?.role === 'buyer') return <BuyerDashboard />
  return <SellerDashboard {...props} />
}
function SellerDashboard({ admin = false, sellerFilter }) {
  const { user } = useAuth()
  const scope = admin || user?.role === 'admin' ? 'all' : 'mine'
  const { data, error, loading, refresh } = useApi(`/auctions?scope=${scope}&sort=-createdAt${sellerFilter ? `&seller=${encodeURIComponent(sellerFilter)}` : ''}`, 30000)
  const now = useNow()
  const auctions = data?.data || []
  const open = auctions.filter((auction) => isOpen(auction, now)).length
  const closed = auctions.filter((auction) => Date.parse(auction.endsAt) <= now).length
  return <section className="section page-section"><div className="section-heading"><div className="page-heading"><p className="eyebrow">THE BIG PICTURE</p><h1>{scope === 'all' ? 'Marketplace items.' : 'Your auction dashboard.'}</h1><p>{scope === 'all' ? `Manage marketplace listings${sellerFilter ? ` by ${sellerFilter}` : ''}.` : 'Your listings, approval status, and bid activity in one place.'}</p></div><Link className="button" to="/auctions/new">Create auction ＋</Link></div>
    <BiddingGuide /><ErrorNotice error={error} retry={refresh} />{loading && !data ? <Loading /> : data && <><div className="stats-grid">{[['Total auctions', auctions.length, 'In this workspace'], ['Open for bids', open, 'Ready for the next bid'], ['Closed auctions', closed, 'Bidding has ended']].map(([label, value, caption]) => <div className="stat panel" key={label}><span>{label}</span><strong>{value}</strong><small>{caption}</small></div>)}</div><div className="section-heading compact"><div><h2>Manage listings</h2><p>View, edit, or remove an auction. Listings with bids stay on record.</p></div><button className="button secondary small" disabled={loading} onClick={refresh}>{loading ? 'Refreshing…' : 'Refresh ↻'}</button></div>{auctions.length ? <div className="table-wrap panel"><table><caption className="sr-only">All marketplace auctions</caption><thead><tr><th scope="col">Auction</th><th scope="col">Current / starting price</th><th scope="col">Status</th><th scope="col">End date</th><th scope="col">Actions</th></tr></thead><tbody>{auctions.map((auction) => <tr key={auction._id}><td><div className="table-item"><AuctionImage src={auction.imageUrl} title={auction.title} /><div><Link to={`/auctions/${auction._id}`}>{auction.title}</Link><small>{auction.category}</small></div></div></td><td><strong>{money(auction.currentPrice, auction.currency)}</strong><small>Starting {money(auction.startingPrice, auction.currency)}</small></td><td><StatusBadge auction={auction} now={now} /></td><td><time dateTime={auction.endsAt}>{dateTime(auction.endsAt)}</time></td><td><div className="table-actions"><Link className="button secondary small" to={`/auctions/${auction._id}#bidding-overview`}>Bid activity</Link><Link className="button secondary small" to={`/auctions/${auction._id}/edit`}>Edit</Link><DeleteAuction auction={auction} onDeleted={refresh} /></div></td></tr>)}</tbody></table></div> : <EmptyState />}</>}
  </section>
}
