import { Link } from 'react-router'
import useApi from '../hooks/useApi'
import { EmptyState, ErrorNotice, Loading } from '../components/Feedback'
export default function Sellers() {
  const { data, loading, error, refresh } = useApi('/sellers')
  return <section className="section page-section"><div className="page-heading"><p className="eyebrow">MEET THE COMMUNITY</p><h1>The people behind the finds.</h1><p>Discover registered sellers and browse their approved listings.</p></div><ErrorNotice error={error} retry={refresh} />{loading ? <Loading label="Loading sellers…" /> : data && (data.data.length ? <div className="auction-grid">{data.data.map((seller) => <article className="panel seller-card" key={seller._id}><span className="avatar">{seller.firstName[0]}</span><h2>{seller.firstName} {seller.lastName}</h2><p>@{seller.username}</p><p>{seller.email}</p><p>{seller.contactNo}</p><Link className="button secondary" to={`/auctions?seller=${encodeURIComponent(seller.username)}`}>View auctions ↗</Link></article>)}</div> : <EmptyState title="No sellers yet." message="Create a seller account to start listing." to="/signup" action="Join the marketplace" />)}</section>
}
