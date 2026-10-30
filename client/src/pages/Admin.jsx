import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import useApi from '../hooks/useApi'
import { api } from '../lib/api'
import { dateTime } from '../lib/auction'
import { ErrorNotice, Loading, EmptyState } from '../components/Feedback'
import Users from '../components/AdminUsers'
import Dashboard from './Dashboard'

function Approvals() {
	const [category, setCategory] = useState('')
	const [approval, setApproval] = useState('waiting')
	const query = new URLSearchParams({ scope: 'all', ...(category && { category }), ...(approval && { approval }) })
	const resource = useApi(`/auctions?${query}`)
	const all = useApi('/auctions?scope=all')
	const [error, setError] = useState(null)
	const [pending, setPending] = useState(false)
	async function update(item, value) {
		setPending(true); setError(null)
		try { await api(`/auctions/${item._id}/approval`, { method: 'PATCH', body: { approval: value } }); resource.refresh() }
		catch (failure) { setError(failure) } finally { setPending(false) }
	}
	return <><h2>Review auction listings</h2><p>Only approved items are visible in the public marketplace.</p><div className="filter-bar admin-filters"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{[...new Set((all.data?.data || []).map((item) => item.category))].map((value) => <option key={value}>{value}</option>)}</select></label><label>Approval<select value={approval} onChange={(event) => setApproval(event.target.value)}><option value="">All statuses</option><option value="waiting">Waiting</option><option value="approved">Approved</option><option value="not-approved">Not approved</option></select></label></div><ErrorNotice error={error || resource.error || all.error} retry={() => { resource.refresh(); all.refresh() }} />{resource.loading ? <Loading /> : resource.data && (resource.data.data.length ? <div className="table-wrap panel"><table><thead><tr><th>Item</th><th>Seller</th><th>Category</th><th>Approval</th></tr></thead><tbody>{resource.data.data.map((item) => <tr key={item._id}><td><Link className="text-link" to={`/auctions/${item._id}`}>{item.title}</Link></td><td>{item.sellerName}</td><td>{item.category}</td><td><label className="sr-only" htmlFor={`approval-${item._id}`}>Approval for {item.title}</label><select id={`approval-${item._id}`} value={item.approval || 'approved'} disabled={pending} onChange={(event) => update(item, event.target.value)}><option value="waiting">Waiting</option><option value="approved">Approved</option><option value="not-approved">Not approved</option></select></td></tr>)}</tbody></table></div> : <EmptyState title="No listings in this review queue." message="New seller listings will appear here for approval." to={null} />)}</>
}
function Messages() {
	const resource = useApi('/admin/messages')
	const [error, setError] = useState(null)
	const [pending, setPending] = useState(false)
	async function remove(id) {
		if (!window.confirm('Remove this contact message?')) return
		setPending(true); setError(null)
		try { await api(`/admin/messages/${id}`, { method: 'DELETE' }); resource.refresh() }
		catch (failure) { setError(failure) } finally { setPending(false) }
	}
	return <><h2>Contact inbox</h2><ErrorNotice error={error || resource.error} retry={resource.refresh} />{resource.loading ? <Loading label="Loading messages…" /> : resource.data && (resource.data.data.length ? <div className="message-list">{resource.data.data.map((message) => <article className="panel message-card" key={message._id}><div className="section-heading"><div><p className="eyebrow">{message.role} · {dateTime(message.createdAt)}</p><h3>{message.subject}</h3></div><button className="button danger-ghost small" disabled={pending} onClick={() => remove(message._id)}>Remove</button></div><p>{message.name} · {message.email}</p><p className="description-text">{message.message}</p></article>)}</div> : <EmptyState title="Your inbox is clear." message="Messages from buyers and sellers will appear here." to={null} />)}</>
}
export default function Admin() {
	const [params, setParams] = useSearchParams()
	const tab = params.get('tab') || 'approvals'
	return <section className="section page-section"><div className="page-heading"><p className="eyebrow">ADMIN WORKSPACE</p><h1>Keep the marketplace moving.</h1><p>Review auctions, manage accounts, and respond to community feedback.</p></div><nav className="workspace-tabs" aria-label="Admin sections">{[['approvals','Approvals'],['items','Items'],['seller','Sellers'],['buyer','Buyers'],['admin','Admins'],['messages','Messages']].map(([value,label]) => <button key={value} className={value === tab ? 'selected' : ''} aria-current={value === tab ? 'page' : undefined} onClick={() => setParams({ tab: value })}>{label}</button>)}</nav><div className="admin-content">{tab === 'items' ? <Dashboard admin sellerFilter={params.get('seller')} /> : ['seller','buyer','admin'].includes(tab) ? <Users key={tab} role={tab} /> : tab === 'messages' ? <Messages /> : <Approvals />}</div></section>
}
