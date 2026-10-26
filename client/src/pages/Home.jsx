import { Link } from 'react-router'
import useApi from '../hooks/useApi'
import useNow from '../hooks/useNow'
import AuctionCard, { AuctionImage, StatusBadge } from '../components/AuctionCard'
import { EmptyState, ErrorNotice, Loading } from '../components/Feedback'
import { isOpen, isUpcoming, money } from '../lib/auction'

export default function Home() {
  const { data, error, loading, refresh } = useApi('/auctions?sort=endsAt', 30000)
  const now = useNow()
  const auctions = data?.data || []
  const open = auctions.filter((auction) => isOpen(auction, now))
  const featured = open[0]
  return <>
    <section className="hero"><div className="hero-copy"><p className="eyebrow"><span className="live-dot" /> THE NEXT GREAT FIND IS YOURS</p><h1>Extraordinary finds.<br /><em>One winning bid.</em></h1><p className="hero-intro">Discover something worth bidding for. Explore unique items, follow the action, and give great finds their next chapter.</p><div className="action-row"><Link className="button" to="/auctions">Explore auctions <span aria-hidden="true">↗</span></Link><Link className="text-link" to="/auctions/new">Have something to sell? →</Link></div><div className="hero-footnote"><span aria-hidden="true">◇</span> Discover the unexpected. Bid with a little excitement.</div></div>
      <div className="hero-feature">{featured ? <Link to={`/auctions/${featured._id}`} className="featured-item"><div className="featured-top"><span>IN THE SPOTLIGHT</span><StatusBadge auction={featured} now={now} /></div><AuctionImage src={featured.imageUrl} title={featured.title} /><div className="featured-bottom"><div><small>{featured.category}</small><h2>{featured.title}</h2></div><div><small>Current price</small><strong>{money(featured.currentPrice, featured.currency)}</strong></div><span className="feature-arrow" aria-hidden="true">↗</span></div></Link> : <div className="hero-art"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><svg viewBox="0 0 220 200" aria-hidden="true"><g transform="rotate(-32 110 100)" fill="currentColor"><rect x="53" y="38" width="88" height="52" rx="10" /><rect x="94" y="83" width="18" height="100" rx="8" /><rect x="43" y="34" width="14" height="60" rx="5" /><rect x="137" y="34" width="14" height="60" rx="5" /></g></svg><span className="art-caption">Something special is just a bid away.</span></div>}</div>
    </section>
    <div className="value-strip"><div><span>01</span><p><strong>Find your next favorite</strong>Browse items from the community.</p></div><div><span>02</span><p><strong>Join the bidding</strong>Watch the price. Make your move.</p></div><div><span>03</span><p><strong>Put your finds on the map</strong>Create a listing in a few simple steps.</p></div></div>
    <section className="section"><div className="section-heading"><div><p className="eyebrow">ON THE BLOCK</p><h2>Closing soon. Worth a look.</h2><p>Fresh opportunities, with the clock ticking.</p></div><Link className="text-link" to="/auctions?status=open&sort=endsAt">View all open auctions ↗</Link></div><ErrorNotice error={error} retry={refresh} />{loading && !data ? <Loading /> : data && (open.length ? <div className="auction-grid">{open.slice(0, 3).map((auction) => <AuctionCard key={auction._id} auction={auction} now={now} />)}</div> : <EmptyState title="The next great find starts with you." message="There are no open auctions right now. Create a listing or explore past auctions." />)}</section>
    <section className="seller-banner"><div><p className="eyebrow">MAKE ROOM FOR SOMETHING NEW</p><h2>Your next chapter starts here.</h2><p>Turn something you own into someone else’s great discovery.</p></div><Link to="/auctions/new" className="button light">Create your first auction ↗</Link></section>
    {data && <section className="section"><div className="section-heading"><div><p className="eyebrow">PLAN YOUR NEXT MOVE</p><h2>Upcoming auctions</h2></div><Link className="text-link" to="/auctions?status=upcoming">View upcoming auctions ↗</Link></div>{auctions.some((item) => isUpcoming(item, now)) ? <div className="auction-grid">{auctions.filter((item) => isUpcoming(item, now)).slice(0,3).map((auction) => <AuctionCard key={auction._id} auction={auction} now={now} />)}</div> : <p>No scheduled auctions yet. Check back for the next discovery.</p>}<div className="category-links">{[...new Set(auctions.map((item) => item.category))].map((category) => <Link className="button secondary small" key={category} to={`/auctions?category=${encodeURIComponent(category)}`}>{category} ↗</Link>)}</div></section>}
  </>
}
