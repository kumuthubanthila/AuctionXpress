import { useSearchParams } from 'react-router'
import MessagingPane from '../components/MessagingPane'
export default function Messages() {
  const [params] = useSearchParams()
  return <section className="section page-section"><div className="page-heading"><p className="eyebrow">DIRECT CONVERSATIONS</p><h1>Your messages.</h1><p>Talk directly with the seller or reply to a buyer about an auction.</p></div><div className="panel full-messaging-panel"><MessagingPane auctionId={params.get('auction')} /></div></section>
}
