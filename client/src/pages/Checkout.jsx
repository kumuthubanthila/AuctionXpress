import { useState } from 'react'
import { Link, useParams } from 'react-router'
import useApi from '../hooks/useApi'
import { api } from '../lib/api'
import { money } from '../lib/auction'
import { EmptyState, ErrorNotice, Loading } from '../components/Feedback'
export default function Checkout() {
	const { id } = useParams()
	const result = useApi(`/auctions/${id}/result`)
	const [method, setMethod] = useState('card')
	const [reference, setReference] = useState('')
	const [pending, setPending] = useState(false)
	const [error, setError] = useState(null)
	async function submit(event) {
		event.preventDefault(); setPending(true); setError(null)
		try { await api(`/auctions/${id}/payment`, { method: 'POST', body: { method, reference } }); result.refresh() }
		catch (failure) { setError(failure) } finally { setPending(false) }
	}
	return <section className="section page-section"><Link className="back-link" to={`/auctions/${id}`}>← Back to auction</Link><div className="page-heading"><p className="eyebrow">WINNING BID · CHECKOUT</p><h1>Your next chapter awaits.</h1><p>Review your winning bid and record your payment reference. This portal records references only; it does not transfer funds or collect card or bank account details.</p></div><ErrorNotice error={error || result.error} retry={result.refresh} />{result.loading ? <Loading label="Checking auction result…" /> : result.data && (result.data.data.payment ? <div className="notice success" role="status">Payment reference recorded: {money(result.data.data.payment.amount, result.data.data.payment.currency || result.data.data.currency)} via {result.data.data.payment.method}. Reference: {result.data.data.payment.reference}. No funds were transferred.</div> : !result.data.data.won ? <EmptyState title="Checkout is not available." message="Only the winning buyer can check out after the auction has ended." to={`/auctions/${id}`} action="View auction" /> : <form className="panel account-form" onSubmit={submit}><h2>Winning amount: {money(result.data.data.winner.amount, result.data.data.currency)}</h2><fieldset disabled={pending}><div className="role-options">{[['card','Credit / debit card'],['bank','Bank transfer']].map(([value,label]) => <label key={value} className={method === value ? 'role-option selected' : 'role-option'}><input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} /><strong>{label}</strong><small>Reference only</small></label>)}</div><label htmlFor="reference">{method === 'card' ? 'Card payment reference' : 'Bank transfer reference'}</label><input id="reference" required maxLength={100} placeholder={method === 'card' ? 'CARD-001' : 'BANK-001'} value={reference} onChange={(event) => setReference(event.target.value)} /><p className="field-hint">Enter a reference for your records. Do not enter card numbers, CVVs or bank account numbers.</p><button className="button">{pending ? 'Recording…' : 'Record payment reference'}</button></fieldset></form>)}</section>
}
