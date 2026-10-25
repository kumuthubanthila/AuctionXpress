import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import useApi from '../hooks/useApi'
import useNow from '../hooks/useNow'
import AuctionCard from '../components/AuctionCard'
import { EmptyState, ErrorNotice, Loading } from '../components/Feedback'

const sorts = [['-createdAt', 'Newest first'], ['endsAt', 'Ending soon'], ['currentPrice', 'Price: low to high'], ['-currentPrice', 'Price: high to low'], ['title', 'Title: A to Z']]

export default function Browse() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') || ''
  const [draft, setDraft] = useState(search)
  const category = params.get('category') || ''
  const status = params.get('status') || ''
  const sort = params.get('sort') || '-createdAt'
  const query = new URLSearchParams()
  if (search) query.set('search', search)
  if (category) query.set('category', category)
  if (status) query.set('status', status)
  query.set('sort', sort)
  const listing = useApi(`/auctions?${query}`, 30000)
  const categories = useApi('/auctions')
  const now = useNow()
  const choices = [...new Set([...(categories.data?.data || []).map((auction) => auction.category), ...(category ? [category] : [])])].sort()
  useEffect(() => setDraft(search), [search])
  function change(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next)
  }
  return <section className="section page-section"><div className="page-heading"><p className="eyebrow">THE MARKETPLACE</p><h1>Find your next great thing.</h1><p>From everyday favorites to unexpected treasures. Take a look around.</p></div>
    <form className="search-bar" role="search" onSubmit={(event) => { event.preventDefault(); change('search', draft.trim()) }}><label className="sr-only" htmlFor="search">Search auction titles</label><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="What are you looking for?" value={draft} onChange={(event) => setDraft(event.target.value)} /><button className="button" type="submit">Search auctions</button></form>
    <div className="filter-bar"><div className="filter-group"><label>Category<select value={category} onChange={(event) => change('category', event.target.value)}><option value="">All categories</option>{choices.map((value) => <option key={value}>{value}</option>)}</select></label><label>Status<select value={status} onChange={(event) => change('status', event.target.value)}><option value="">All auctions</option><option value="open">Open for bids</option><option value="closed">Closed</option></select></label></div><label>Sort by<select value={sort} onChange={(event) => change('sort', event.target.value)}>{!sorts.some(([value]) => value === sort) && <option value={sort}>{sort}</option>}{sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    {categories.error && <ErrorNotice error={categories.error} retry={categories.refresh} />}
    <div className="results-heading"><p>{listing.data ? <><strong>{listing.data.count}</strong> {listing.data.count === 1 ? 'auction' : 'auctions'} {search && <>matching “{search}”</>}</> : 'Explore the collection'}{listing.loading && listing.data && ' · Updating…'}</p>{(search || category || status || sort !== '-createdAt') && <button className="text-button" onClick={() => { setDraft(''); setParams({}) }}>Clear filters ×</button>}</div>
    <ErrorNotice error={listing.error} retry={listing.refresh} />
    {listing.loading && !listing.data ? <Loading /> : listing.data && (listing.data.data.length ? <div className="auction-grid" aria-busy={listing.loading}>{listing.data.data.map((auction) => <AuctionCard key={auction._id} auction={auction} now={now} />)}</div> : <EmptyState title="No matches this time." message="Try a different search, choose another category, or clear your filters." to="/auctions" action="Explore all auctions" />)}
  </section>
}
