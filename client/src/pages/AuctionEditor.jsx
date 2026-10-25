import { Link, useNavigate, useParams } from 'react-router'
import useApi from '../hooks/useApi'
import AuctionForm from '../components/AuctionForm'
import { ErrorNotice, Loading } from '../components/Feedback'

export default function AuctionEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const auction = useApi(id ? `/auctions/${id}` : null)
  const bids = useApi(id ? `/auctions/${id}/bids` : null)
  return <section className="section page-section"><Link className="back-link" to={id ? `/auctions/${id}` : '/auctions'}>← {id ? 'Back to auction' : 'Back to auctions'}</Link><div className="page-heading"><p className="eyebrow">{id ? 'MAKE IT JUST RIGHT' : 'FROM YOUR HANDS TO THEIR NEXT FIND'}</p><h1>{id ? 'Edit your auction.' : 'Something special to share?'}</h1><p>{id ? 'Keep your listing clear, accurate, and ready for its next bid.' : 'Create a listing and let the bidding begin.'}</p></div>
    {id && (auction.loading || bids.loading) ? <Loading label="Loading auction details…" /> : id && (auction.error || bids.error) ? <ErrorNotice error={auction.error || bids.error} retry={() => { auction.refresh(); bids.refresh() }} /> : <AuctionForm key={id || 'new'} initial={auction.data?.data} hasBids={Boolean(bids.data?.count)} onSaved={(saved) => navigate(`/auctions/${saved._id}`, { state: { message: id ? 'Auction changes saved.' : 'Your auction is now published.' }, replace: true })} />}
  </section>
}
