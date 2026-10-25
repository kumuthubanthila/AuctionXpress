import { useState } from 'react'
import { api } from '../lib/api'
import { currency, money, validateBid } from '../lib/auction'
import { ErrorNotice } from './Feedback'

export default function BidForm({ auction, open, blocked, onRefresh }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [success, setSuccess] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event) {
    event.preventDefault()
    if (pending || !open || blocked) return
    const validation = validateBid(name, amount, auction.currentPrice)
    setErrors(validation)
    setFailure(null)
    setSuccess('')
    if (Object.keys(validation).length) {
      document.getElementById(Object.keys(validation)[0])?.focus()
      return
    }
    setPending(true)
    try {
      const response = await api(`/auctions/${auction._id}/bids`, { method: 'POST', body: { bidderName: name.trim(), amount: Number(amount) } })
      setSuccess(`Your bid of ${money(response.data.amount)} was accepted.`)
      setAmount('')
      onRefresh()
    } catch (error) {
      setFailure(error)
      setErrors(error.errors || {})
      // Reload even after a conflict or uncertain transaction outcome.
      onRefresh()
    } finally { setPending(false) }
  }
  return <form className="bid-form" onSubmit={submit} noValidate><h2>{open ? 'Make your move.' : 'This auction has ended.'}</h2><p>{open ? 'Your next great find could start with this bid.' : 'Bidding is closed. You can still explore the bid history below.'}</p><ErrorNotice error={failure} />{success && <div className="notice success" role="status">{success}</div>}
    {open && <><fieldset disabled={pending || blocked}><label htmlFor="bidderName">Your name</label><input id="bidderName" name="bidderName" autoComplete="name" placeholder="How should we display your name?" value={name} maxLength={100} onChange={(event) => { setName(event.target.value); setErrors((old) => ({ ...old, bidderName: undefined })) }} aria-invalid={Boolean(errors.bidderName)} aria-describedby={errors.bidderName ? 'bidderName-error' : undefined} required />{errors.bidderName && <span className="field-error" id="bidderName-error">{errors.bidderName}</span>}
    <label htmlFor="amount">Your bid ({currency})</label><input id="amount" name="amount" type="number" min="0" step="any" placeholder="Enter your bid amount" value={amount} onChange={(event) => { setAmount(event.target.value); setErrors((old) => ({ ...old, amount: undefined })) }} aria-invalid={Boolean(errors.amount)} aria-describedby="amount-hint amount-error" required /><span className="field-error" id="amount-error">{errors.amount}</span><p className="field-hint" id="amount-hint">Must be greater than {money(auction.currentPrice)}.</p><button className="button full" disabled={pending || blocked}>{pending ? 'Submitting bid…' : blocked ? 'Waiting for fresh auction data…' : 'Place bid ↗'}</button></fieldset><p className="demo-note">Demo bidding only. Names are public and unverified. No payments are taken.</p></>}
  </form>
}
