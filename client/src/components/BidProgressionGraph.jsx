import { useId, useState } from 'react'
import { currency, dateTime, money } from '../lib/auction'

export default function BidProgressionGraph({ auction, bids, hideBidderIdentity = false }) {
	const chartId = useId()
	const [selectedKey, setSelectedKey] = useState(null)
	const history = [...bids].sort((a, b) => a.amount - b.amount)
	const points = [
		{ key: 'start', amount: auction.startingPrice, label: 'Starting price' },
		...history.map((bid, index) => ({ ...bid, key: bid._id, label: `Bid ${index + 1}` }))
	]
	const selectedIndex = selectedKey === null ? points.length - 1 : Math.max(0, points.findIndex((point) => point.key === selectedKey))
	const selected = points[selectedIndex]
	const left = 85, right = 775, top = 28, bottom = 235
	const min = auction.startingPrice
	const max = history.reduce((highest, bid) => Math.max(highest, bid.amount), min)
	const ceiling = max + (max > min ? (max - min) * 0.12 : 1)
	const x = (index) => left + index / Math.max(1, points.length - 1) * (right - left)
	const y = (amount) => bottom - (amount - min) / (ceiling - min) * (bottom - top)
	const stepPath = points.map((point, index) => index ? `H ${x(index)} V ${y(point.amount)}` : `M ${x(index)} ${y(point.amount)}`).join(' ')
	const areaPath = `${stepPath} L ${x(points.length - 1)} ${bottom} L ${left} ${bottom} Z`
	const tickFormat = new Intl.NumberFormat('en', { notation: max >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 2 })
	const tickCount = Math.min(6, points.length)
	const xTicks = [...new Set(Array.from({ length: tickCount }, (_, index) => Math.round(index * (points.length - 1) / Math.max(1, tickCount - 1))))]
	const select = (index) => setSelectedKey(points[index].key)
	const selectedDescription = `${selected.label}: ${money(selected.amount, auction.currency)}${!hideBidderIdentity && selected.bidderName ? ` by ${selected.bidderName}` : ''}`

	return <div className="bid-progression bid-chart">
		<div className="bid-chart-heading"><div><h3>Bid progression</h3><p>The starting price and every accepted bid, in bid order.</p></div><button className="text-button" onClick={() => setSelectedKey(null)}>Latest bid ↗</button></div>
		<div className="bid-chart-scroll">
			<svg className="bid-chart-svg" viewBox="0 0 800 290" role="img" aria-labelledby={`${chartId}-title ${chartId}-description`}>
				<title id={`${chartId}-title`}>{`Bid progression for ${auction.title}`}</title>
				<desc id={`${chartId}-description`}>Price in {auction.currency || currency} across {history.length} accepted bids. The vertical axis starts at the starting price. Use the bid selector below to inspect each amount{hideBidderIdentity ? '' : ' and bidder'}.</desc>
				<defs><linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#90553c" stopOpacity="0.2" /><stop offset="100%" stopColor="#90553c" stopOpacity="0.02" /></linearGradient></defs>
				<text x="12" y="15" className="bid-chart-axis-title">{auction.currency || currency}</text>
				{Array.from({ length: 5 }, (_, index) => {
					const amount = min + (ceiling - min) * index / 4
					return <g key={index}><line x1={left} x2={right} y1={y(amount)} y2={y(amount)} className="bid-chart-grid" /><text x={left - 12} y={y(amount) + 4} textAnchor="end" className="bid-chart-tick">{tickFormat.format(amount)}</text></g>
				})}
				{xTicks.map((index) => <text key={index} x={x(index)} y="257" textAnchor="middle" className="bid-chart-tick">{index === 0 ? 'Start' : `#${index}`}</text>)}
				<text x="430" y="282" textAnchor="middle" className="bid-chart-axis-title">Accepted bid number</text>
				<path d={areaPath} fill={`url(#${chartId}-fill)`} />
				<path d={stepPath} className="bid-chart-line" />
				<line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={top} y2={bottom} className="bid-chart-guide" />
				{points.map((point, index) => <circle key={point.key} cx={x(index)} cy={y(point.amount)} r={index === selectedIndex ? 7 : 4} className={index === selectedIndex ? 'bid-chart-point selected' : 'bid-chart-point'} onMouseEnter={() => select(index)} onClick={() => select(index)}><title>{`${point.label}: ${money(point.amount, auction.currency)}${!hideBidderIdentity && point.bidderName ? ` · ${point.bidderName}` : ''}`}</title></circle>)}
			</svg>
		</div>
		<div className="bid-chart-selected" aria-live="polite"><div><span>{selected.label}</span><strong>{money(selected.amount, auction.currency)}</strong></div><p>{selected.bidderName && !hideBidderIdentity ? <>{selected.bidderName} · <time dateTime={selected.createdAt}>{dateTime(selected.createdAt)}</time></> : selected.createdAt ? <time dateTime={selected.createdAt}>{dateTime(selected.createdAt)}</time> : 'The opening price set for this auction.'}</p></div>
		<div className="bid-chart-controls"><button type="button" className="button secondary small" aria-label="Previous bid" disabled={selectedIndex === 0} onClick={() => select(selectedIndex - 1)}>←</button><label className="sr-only" htmlFor={`${chartId}-selector`}>Select a bid to inspect</label><input id={`${chartId}-selector`} type="range" min="0" max={points.length - 1} step="1" value={selectedIndex} aria-valuetext={selectedDescription} onChange={(event) => select(Number(event.target.value))} /><button type="button" className="button secondary small" aria-label="Next bid" disabled={selectedIndex === points.length - 1} onClick={() => select(selectedIndex + 1)}>→</button></div>
		<p className="bid-chart-hint">Hover or tap a point, or use the slider to inspect bids. The vertical axis starts at {money(auction.startingPrice, auction.currency)}; horizontal spacing represents bid order, not elapsed time.</p>
	</div>
}
