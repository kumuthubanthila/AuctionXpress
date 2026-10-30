import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import useApi from '../hooks/useApi'
import { api } from '../lib/api'
import { dateTime } from '../lib/auction'
import { ErrorNotice, Loading } from './Feedback'

const time = (date) => new Date(date).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
const day = (date) => new Date(date).toLocaleDateString([], { dateStyle:'medium' })

export default function MessagingPane({ auctionId, auctionTitle, sellerName, onUnreadChange }) {
	const { user } = useAuth()
	const threads = useApi('/activity/conversations', 10000)
	const [selected, setSelected] = useState(null)
	const [openedThread, setOpenedThread] = useState(null)
	const messages = useApi(selected ? `/activity/conversations/${selected}/messages` : null, 5000)
	const [drafts, setDrafts] = useState({})
	const [search, setSearch] = useState('')
	const [error, setError] = useState(null)
	const [pending, setPending] = useState(false)
	const [starting, setStarting] = useState(false)
	const [newMessages, setNewMessages] = useState(false)
	const history = useRef(null)
	const composer = useRef(null)
	const followLatest = useRef(true)
	const inputId = useId()
	const content = drafts[selected] || ''
	const partnerOf = (row) => user.role === 'buyer' ? row?.sellerId : row?.buyerId
	const thread = threads.data?.data.find((row) => row._id === selected) || (openedThread?._id === selected ? openedThread : null)
	const partner = partnerOf(thread)
	const rows = messages.data?.data || []
	const lastMessageId = rows.at(-1)?._id
	const conversations = (threads.data?.data || []).filter((row) => [partnerOf(row)?.username, row.auctionId?.title, row.lastMessage].some((value) => value?.toLowerCase().includes(search.toLowerCase().trim())))

	useEffect(() => {
		if (!auctionId) return
		const controller = new AbortController()
		setStarting(true); setError(null)
		api('/activity/conversations', { method:'POST', body:{auctionId}, signal:controller.signal }).then((response) => {
			if (controller.signal.aborted) return
			setOpenedThread({ ...response.data, auctionId:{_id:auctionId,title:auctionTitle}, sellerId:{username:sellerName} })
			followLatest.current = true
			setSelected(response.data._id)
			threads.refresh()
		}).catch((failure) => { if (!controller.signal.aborted) setError(failure) }).finally(() => { if (!controller.signal.aborted) setStarting(false) })
		return () => controller.abort()
	}, [auctionId, auctionTitle, sellerName, threads.refresh])
	useEffect(() => {
		if (followLatest.current && history.current) { history.current.scrollTop = history.current.scrollHeight; setNewMessages(false) }
		else if (lastMessageId) setNewMessages(true)
	}, [selected, lastMessageId])
	useEffect(() => {
		if (!composer.current) return
		composer.current.style.height = 'auto'
		composer.current.style.height = `${Math.min(composer.current.scrollHeight, 120)}px`
	}, [content, selected, starting])
	useEffect(() => {
		if (messages.data && !messages.loading) { threads.refresh(); onUnreadChange?.() }
	}, [messages.data, messages.loading, threads.refresh, onUnreadChange])
	useEffect(() => { if (selected && !starting) composer.current?.focus({ preventScroll:true }) }, [selected, starting])

	function choose(row) { followLatest.current = true; setSelected(row._id); setNewMessages(false); setError(null) }
	async function send(event) {
		event.preventDefault()
		if (pending || !selected || !content.trim()) return
		const id = selected
		setPending(true); setError(null)
		try {
			await api(`/activity/conversations/${id}/messages`, {method:'POST',body:{content}})
			setDrafts((old) => ({...old,[id]:''})); followLatest.current = true
			messages.refresh(); threads.refresh(); onUnreadChange?.()
		} catch (failure) { setError(failure) } finally { setPending(false) }
	}

	return <div className={`wa-workspace ${selected || starting ? 'chat-selected' : ''}`}>
		<aside className="wa-sidebar" aria-label="Conversations">
			<div className="wa-sidebar-heading"><h3>Chats</h3><button className="wa-icon-button" aria-label="Refresh conversations" onClick={threads.refresh}>↻</button></div>
			<div className="wa-search"><label className="sr-only" htmlFor={`${inputId}-search`}>Search conversations</label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg><input id={`${inputId}-search`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" /></div>
			<ErrorNotice error={threads.error} retry={threads.refresh} />
			{!selected && !starting && <ErrorNotice error={error} />}
			<div className="wa-thread-list">
				{threads.loading && !threads.data ? <Loading label="Loading chats…" /> : conversations.length ? conversations.map((row) => {
					const other = partnerOf(row)
					return <button key={row._id} className={`wa-thread ${selected === row._id ? 'selected' : ''}`} aria-pressed={selected === row._id} disabled={pending} onClick={() => choose(row)}><span className="wa-avatar" aria-hidden="true">{(other?.username || '?')[0].toUpperCase()}</span><span className="wa-thread-info"><span className="wa-thread-top"><strong>{other?.username || 'Account removed'}</strong>{row.updatedAt && <time dateTime={row.updatedAt}>{time(row.updatedAt)}</time>}</span><b>{row.auctionId?.title || 'Auction unavailable'}</b><span className="wa-thread-preview"><small>{row.lastMessage || 'Start a conversation'}</small>{row.unreadCount > 0 && <span className="unread-count">{row.unreadCount}</span>}</span></span></button>
				}) : threads.data && <div className="wa-sidebar-empty"><strong>{search ? 'No matching chats' : 'No conversations yet'}</strong><p>{search ? 'Try a name or auction title.' : user.role === 'buyer' ? 'Choose Message seller on an auction to start chatting.' : 'Questions from buyers will appear here.'}</p></div>}
			</div>
			<div className="wa-sidebar-footer">{user.username} · {user.role}</div>
		</aside>
		<section className="wa-chat" aria-label="Selected conversation">
			{starting ? <><div className="wa-chat-header"><button className="wa-icon-button wa-back" onClick={() => setSelected(null)} aria-label="Back to conversations">←</button><span>Opening chat…</span></div><Loading label="Opening your conversation…" /></> : selected ? <>
				<header className="wa-chat-header"><button type="button" className="wa-icon-button wa-back" disabled={pending} onClick={() => { setSelected(null); threads.refresh() }} aria-label="Back to conversations">←</button><span className="wa-avatar" aria-hidden="true">{(partner?.username || '?')[0].toUpperCase()}</span><div><h3>{partner?.username || 'Conversation'}</h3><p>{user.role === 'buyer' ? 'Seller' : 'Buyer'} · {thread?.auctionId?.title || 'Auction conversation'}</p></div>{thread?.auctionId?._id && <Link className="wa-item-link" to={`/auctions/${thread.auctionId._id}`}>View item ↗</Link>}</header>
				<ErrorNotice error={error || messages.error} retry={messages.refresh} />
				<div ref={history} className="wa-message-list" role="log" aria-label="Conversation messages" aria-live="polite" aria-relevant="additions" onScroll={(event) => { const element=event.currentTarget; followLatest.current=element.scrollHeight-element.scrollTop-element.clientHeight<90; if(followLatest.current)setNewMessages(false) }}>
					{messages.loading && !messages.data ? <Loading label="Loading messages…" /> : rows.length ? rows.map((message,index) => <div key={message._id} className="wa-message-group">{(!index || day(rows[index-1].createdAt)!==day(message.createdAt)) && <div className="wa-date"><span>{day(message.createdAt)}</span></div>}<article className={`wa-bubble ${message.senderId===user._id?'own':''}`}><p>{message.content}</p><footer><time dateTime={message.createdAt} title={dateTime(message.createdAt)}>{time(message.createdAt)}</time>{message.senderId===user._id && <span aria-label="Sent">✓</span>}</footer></article></div>) : !messages.error && <div className="wa-first-message"><span aria-hidden="true">✉</span><strong>Say hello to {partner?.username || 'the other participant'}.</strong><p>Ask about this item or discuss collection arrangements.</p></div>}
				</div>
				{newMessages && <button className="wa-new-messages" onClick={() => { followLatest.current=true; history.current.scrollTop=history.current.scrollHeight; setNewMessages(false) }}>New messages ↓</button>}
				<form className="wa-compose" onSubmit={send}>
					<label className="sr-only" htmlFor={`${inputId}-message`}>Your message</label>
					<textarea ref={composer} id={`${inputId}-message`} value={content} onChange={(event) => setDrafts((old) => ({ ...old, [selected]: event.target.value }))} onKeyDown={(event) => {
						if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
							event.preventDefault()
							event.currentTarget.form.requestSubmit()
						}
					}} maxLength={2000} rows={1} required disabled={pending} placeholder="Type a message" />
					<button className="wa-send" aria-label={pending ? 'Sending message' : 'Send message'} disabled={pending || !content.trim()}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m3 3 19 9-19 9 3-8 9-1-9-1Z" /></svg></button>
					<small>Enter to send · Shift + Enter for a new line <span>{content.length}/2000</span></small>
				</form>
			</> : <div className="wa-welcome"><ErrorNotice error={error} /><span className="wa-welcome-icon" aria-hidden="true"><svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2"><path d="M65 35a25 25 0 0 1-25 25H15l5-12A25 25 0 1 1 65 35Z" /><path d="M28 31h25M28 40h18" /></svg></span><h3>Your conversations, all together.</h3><p>Select a chat to continue, or open an auction and choose Message seller.</p><Link className="text-link" to="/auctions">Explore auctions ↗</Link></div>}
		</section>
	</div>
}
