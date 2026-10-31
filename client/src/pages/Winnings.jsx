import { Link } from 'react-router'
import useApi from '../hooks/useApi'
import { AuctionImage } from '../components/AuctionCard'
import { EmptyState, ErrorNotice, Loading } from '../components/Feedback'
import { dateTime, money } from '../lib/auction'

export default function Winnings() {
	const { data, error, loading, refresh } = useApi('/account/winnings', 30000)
	const winnings = data?.data || []
	return <section className="section page-section"><div className="page-heading"><p className="eyebrow">YOUR WINS</p><h1>Won auctions.</h1><p>See every auction you won and complete or review its checkout reference.</p></div><ErrorNotice error={error} retry={refresh} />{loading && !data ? <Loading label="Loading your winnings…" /> : data && (winnings.length ? <div className="winnings-grid">{winnings.map(({ auction, winningBid, payment }) => <article className="winning-card panel" key={auction._id}><Link className="winning-image" to={`/auctions/${auction._id}`}><AuctionImage src={auction.imageUrl} title={auction.title} /></Link><div className="winning-content"><p className="eyebrow">{auction.category}</p><h2><Link to={`/auctions/${auction._id}`}>{auction.title}</Link></h2><p>Won on {dateTime(auction.endsAt)}</p><div className="winning-details"><span>Winning bid<strong>{money(winningBid.amount, auction.currency)}</strong></span><span>Checkout<strong className={payment ? 'paid' : 'pending'}>{payment ? 'Reference recorded' : 'Action needed'}</strong></span></div><Link className="button small" to={`/auctions/${auction._id}/checkout`}>{payment ? 'View receipt' : 'Checkout'}</Link></div></article>)}</div> : <EmptyState title="No winning auctions yet." message="When you hold the highest accepted bid after an auction closes, it will appear here." to="/auctions" action="Browse auctions" />)}</section>
}
