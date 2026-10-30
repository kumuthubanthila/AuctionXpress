import { dateTime, isOpen, isUpcoming, money } from '../lib/auction'
import { ErrorNotice, Loading } from './Feedback'
import BidProgressionGraph from './BidProgressionGraph'

export function BiddingGuide() {
	return <details className="bidding-guide"><summary>How does bidding work?</summary><ol>
		<li><strong>The listing goes live.</strong><span>An admin approves the item. Bidding opens at its scheduled start time.</span></li>
		<li><strong>Buyers place higher bids.</strong><span>A bid must be greater than the current price. The +10,000 button is a shortcut; any valid higher amount can be entered.</span></li>
		<li><strong>The highest bid leads.</strong><span>Accepted bids update the price and history. A buyer who loses the lead gets an outbid notification.</span></li>
		<li><strong>The clock reaches zero.</strong><span>Bidding closes and the highest accepted bid wins. The winning buyer can open checkout and message the seller.</span></li>
	</ol></details>
}

export default function BidOverview({ auction, bids, loading, error, refresh, now = Date.now(), userId, hideBidderIdentity = false }) {
	const history = [...(bids || [])].sort((a, b) => a.amount - b.amount)
	const leader = history.at(-1)
	const closed = Date.parse(auction.endsAt) <= now
	const ownLead = Boolean(leader?.bidderId && leader.bidderId === userId)
	const bidders = new Set(history.map((bid) => bid.bidderId || bid.bidderName)).size
	const state = closed ? 'Bidding closed' : auction.approval && auction.approval !== 'approved' ? 'Waiting for approval' : isUpcoming(auction, now) ? 'Not started yet' : isOpen(auction, now) ? 'Bidding is open' : 'Bidding unavailable'
	const leaderLabel = !leader ? (closed ? 'This auction closed without bids.' : isOpen(auction, now) ? 'No bids yet. The opening move is still available.' : 'No bids yet. Bidding has not opened.') : hideBidderIdentity ? (closed ? 'Winning bid' : 'Current highest bid') : closed ? `Winning bidder: ${leader.bidderName}${ownLead ? ' (you)' : ''}` : `Current leader: ${leader.bidderName}${ownLead ? ' (you)' : ''}`
	return <section className="bid-overview panel" id="bidding-overview" aria-labelledby="bid-overview-title">
		<div className="section-heading"><div><p className="eyebrow">AT A GLANCE</p><h2 id="bid-overview-title">How the bidding is going</h2><p>{state} · Updates every 15 seconds</p></div></div>
		<ErrorNotice error={error} retry={refresh} />
		{loading && !bids ? <Loading label="Loading bid activity…" /> : bids && <>
			<div className="bid-summary-grid">
				<div><span>Starting price</span><strong>{money(auction.startingPrice, auction.currency)}</strong></div>
				<div><span>{closed ? 'Closing price' : 'Current price'}</span><strong>{money(auction.currentPrice, auction.currency)}</strong></div>
				<div><span>Accepted bids</span><strong>{history.length}</strong></div>
				{!hideBidderIdentity && <div><span>Participating buyers</span><strong>{bidders}</strong></div>}
			</div>
			<div className={`bid-leader ${closed && leader ? 'winning' : ''}`}><span className="avatar" aria-hidden="true">{closed ? '★' : '↗'}</span><div><strong>{leaderLabel}</strong><p>{leader ? `${money(leader.amount, auction.currency)} · ${dateTime(leader.createdAt)}` : closed ? 'No winning bidder was recorded.' : `The first bid must exceed ${money(auction.currentPrice, auction.currency)}.`}</p></div></div>
			{history.length > 0 && !hideBidderIdentity && <BidProgressionGraph auction={auction} bids={history} />}
		</>}
		<BiddingGuide />
	</section>
}
