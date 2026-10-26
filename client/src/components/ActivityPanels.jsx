import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import useApi from '../hooks/useApi'
import { api } from '../lib/api'
import { dateTime, money } from '../lib/auction'
import { EmptyState, ErrorNotice, Loading } from './Feedback'
import MessagingPane from './MessagingPane'

function Drawer({ title, close, children }) {
  const ref = useRef(null)
  useEffect(() => { const element = ref.current; element.showModal(); return () => element.close() }, [])
  return <dialog ref={ref} className="activity-drawer" aria-labelledby="activity-title" onCancel={close}><header className="drawer-heading"><div><p className="eyebrow">YOUR AUCTION HOUSE</p><h2 id="activity-title">{title}</h2></div><button className="drawer-close" aria-label="Close pane" onClick={close}>×</button></header><div className="drawer-content">{children}</div></dialog>
}
export default function ActivityPanels() {
  const notifications = useApi('/activity/notifications', 15000)
  const conversations = useApi('/activity/conversations', 10000)
  const [panel, setPanel] = useState(null)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setPanel(null) }, [pathname])
  async function read(ids) {
    if (!ids.length) return
    setPending(true); setError(null)
    try { await api('/activity/notifications/read', { method: 'POST', body: { ids } }); notifications.refresh() }
    catch (failure) { setError(failure) } finally { setPending(false) }
  }
  const unread = notifications.data?.unreadCount || 0
  const unreadMessages = conversations.data?.unreadCount || 0
  return <div className="activity-tools">
    <button className="activity-button" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => { setPanel('notifications'); notifications.refresh() }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></svg><span>Notifications</span>{unread > 0 && <b className="unread-count">{unread}</b>}</button>
    <button className="activity-button" aria-label={`Messages${unreadMessages ? `, ${unreadMessages} unread` : ''}`} onClick={() => { setPanel('messages'); conversations.refresh() }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M21 11a9 9 0 0 1-9 9H3l1.5-4A9 9 0 1 1 21 11Z" /><path d="M8 10h8M8 14h5" /></svg><span>Messages</span>{unreadMessages > 0 && <b className="unread-count">{unreadMessages}</b>}</button>
    {panel && <Drawer title={panel === 'messages' ? 'Messages' : 'Notifications'} close={() => setPanel(null)}>{panel === 'messages' ? <><Link className="text-link full-inbox-link" to="/messages">Open full inbox ↗</Link><MessagingPane onUnreadChange={conversations.refresh} /></> : <>
      <div className="notification-toolbar"><p>{unread} unread</p><button className="text-button" disabled={pending || !unread} onClick={() => read((notifications.data?.data || []).filter((row) => !row.read).map((row) => row.id))}>Mark all as read</button></div>
      <ErrorNotice error={error || notifications.error} retry={notifications.refresh} />
      {notifications.loading && !notifications.data ? <Loading label="Loading notifications…" /> : notifications.data && (notifications.data.data.length ? <div className="notification-list">{notifications.data.data.map((row) => <article key={row.id} className={`notification-item ${row.read ? '' : 'unread'}`}><span className={`notification-symbol ${row.type}`} aria-hidden="true">{row.type === 'won' ? '★' : row.type === 'outbid' ? '↗' : '◷'}</span><div><h3>{row.title}</h3><p>{row.message}</p><strong>{money(row.amount, row.currency)}</strong><time dateTime={row.createdAt}>{dateTime(row.createdAt)}</time><div className="action-row"><Link className="text-link" to={`/auctions/${row.auctionId}`} onClick={() => { if (!row.read) read([row.id]); setPanel(null) }}>View auction →</Link>{!row.read && <button className="text-button" disabled={pending} onClick={() => read([row.id])}>Mark read</button>}</div></div></article>)}</div> : <EmptyState title="You're all caught up." message="Outbid alerts and auction results will appear here after you start bidding." to={null} />)}
    </>}</Drawer>}
  </div>
}
