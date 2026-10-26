import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import useApi from '../hooks/useApi'
import { api } from '../lib/api'
import { dateTime } from '../lib/auction'
import { EmptyState, ErrorNotice, Loading } from './Feedback'

export default function MessagingPane({ auctionId, onUnreadChange }) {
  const { user } = useAuth()
  const threads = useApi('/activity/conversations', 10000)
  const [selected, setSelected] = useState(null)
  const messages = useApi(selected ? `/activity/conversations/${selected}/messages` : null, 5000)
  const [content, setContent] = useState('')
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const [starting, setStarting] = useState(false)
  const bottom = useRef(null)
  const composerId = useId()
  useEffect(() => {
    if (!auctionId) return
    const controller = new AbortController()
    setStarting(true)
    api('/activity/conversations', { method: 'POST', body: { auctionId }, signal: controller.signal }).then((response) => {
      if (!controller.signal.aborted) { setSelected(response.data._id); threads.refresh() }
    }).catch((failure) => { if (!controller.signal.aborted) setError(failure) }).finally(() => { if (!controller.signal.aborted) setStarting(false) })
    return () => controller.abort()
  }, [auctionId, threads.refresh])
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }) }, [selected, messages.data?.data.length])
  useEffect(() => {
    if (messages.data && !messages.loading) { threads.refresh(); onUnreadChange?.() }
  }, [messages.data, messages.loading, threads.refresh, onUnreadChange])
  const thread = threads.data?.data.find((row) => row._id === selected)
  const partner = user.role === 'buyer' ? thread?.sellerId : thread?.buyerId
  async function send(event) {
    event.preventDefault()
    if (pending || !content.trim()) return
    setPending(true); setError(null)
    try {
      await api(`/activity/conversations/${selected}/messages`, { method: 'POST', body: { content } })
      setContent(''); messages.refresh(); threads.refresh(); onUnreadChange?.()
    } catch (failure) { setError(failure) } finally { setPending(false) }
  }
  return <div className="messaging-workspace">
    <ErrorNotice error={error} />
    {starting ? <Loading label="Opening your conversation…" /> : selected ? <>
      <div className="conversation-heading"><button className="text-button" disabled={pending} onClick={() => { setSelected(null); setContent(''); setError(null); threads.refresh() }}>← All conversations</button><div><h3>{partner?.username || 'Conversation'}</h3><p>{thread?.auctionId?.title || 'Auction conversation'}</p></div></div>
      <ErrorNotice error={messages.error} retry={messages.refresh} />
      <div className="chat-history" aria-label="Conversation messages" aria-busy={messages.loading}>
        {messages.loading && !messages.data ? <Loading label="Loading messages…" /> : messages.data?.data.length ? messages.data.data.map((message) => <article key={message._id} className={`chat-bubble ${message.senderId === user._id ? 'own' : ''}`}><span>{message.senderId === user._id ? 'You' : partner?.username || 'Other participant'}</span><p>{message.content}</p><time dateTime={message.createdAt}>{dateTime(message.createdAt)}</time></article>) : <p className="chat-empty">Start the conversation. Ask about the item, its condition, or collection arrangements.</p>}
        <div ref={bottom} />
      </div>
      <form className="chat-compose" onSubmit={send}><label htmlFor={composerId}>Your message</label><textarea id={composerId} value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={3} required disabled={pending} placeholder="Write a message to the seller or buyer…" /><div><small>{content.length}/2000</small><button className="button small" disabled={pending || !content.trim()}>{pending ? 'Sending…' : 'Send message ↗'}</button></div></form>
    </> : <>
      <ErrorNotice error={threads.error} retry={threads.refresh} />
      {threads.loading && !threads.data ? <Loading label="Loading conversations…" /> : threads.data && (threads.data.data.length ? <div className="conversation-list">{threads.data.data.map((row) => {
        const other = user.role === 'buyer' ? row.sellerId : row.buyerId
        return <button className="conversation-row" key={row._id} onClick={() => { setSelected(row._id); setContent(''); setError(null) }}><span className="avatar" aria-hidden="true">{(other?.username || '?')[0].toUpperCase()}</span><span className="conversation-preview"><strong>{other?.username || 'Account removed'}</strong><b>{row.auctionId?.title || 'Auction unavailable'}</b><small>{row.lastMessage || 'No messages yet'}</small></span>{row.unreadCount > 0 && <span className="unread-count" aria-label={`${row.unreadCount} unread messages`}>{row.unreadCount}</span>}</button>
      })}</div> : <EmptyState title="Your inbox is ready." message={user.role === 'buyer' ? 'Open an auction and choose Message seller to start a conversation.' : 'Buyer questions about your auctions will appear here. Open a conversation to reply.'} to={user.role === 'buyer' ? '/auctions' : null} action="Browse auctions" />)}
    </>}
  </div>
}
