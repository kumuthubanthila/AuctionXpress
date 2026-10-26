import { useState } from 'react'
import { api } from '../lib/api'
import { currency, money, validateBid, adjustBidAmount } from '../lib/auction'
import { ErrorNotice } from './Feedback'
import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'

export default function BidForm({ auction, open, blocked, onRefresh, unavailableReason }) {
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [success, setSuccess] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event) {
    event.preventDefault()
    if (pending || !open || blocked) return
    const validation = validateBid(user?.username || '', amount, auction.currentPrice, auction.currency)
    setErrors(validation)
    setFailure(null)
    setSuccess('')
    if (Object.keys(validation).length) {
      document.getElementById(Object.keys(validation)[0])?.focus()
      return
    }
    setPending(true)
    try {
      const response = await api(`/auctions/${auction._id}/bids`, { method: 'POST', body: { amount: Number(amount) } })
      setSuccess(`Your bid of ${money(response.data.amount, auction.currency)} was accepted.`)
      setAmount('')
      onRefresh()
    } catch (error) {
      setFailure(error)
      setErrors(error.errors || {})
      // Reload even after a conflict or uncertain transaction outcome.
      onRefresh()
    } finally { setPending(false) }
  }
  if (open && user?.role !== 'buyer') return <div className="bid-form"><h2>Join the bidding.</h2><p>{user ? 'Bidding is available to buyer accounts.' : 'Log in with a buyer account to place a bid.'}</p>{!user && <Link className="button full" to="/login">Log in to bid</Link>}</div>
  return <form className="bid-form" onSubmit={submit} noValidate><h2>{open ? 'Make your move.' : unavailableReason || 'This auction has ended.'}</h2><p>{open ? 'Your next great find could start with this bid.' : 'Bidding is unavailable. You can still explore the bid history below.'}</p><ErrorNotice error={failure} />{success && <div className="notice success" role="status">{success}</div>}
    {open && <><fieldset disabled={pending || blocked}><label htmlFor="bidderName">Bidding as</label><input id="bidderName" name="bidderName" value={user?.username || ''} readOnly />{errors.bidderName && <span className="field-error" id="bidderName-error">{errors.bidderName}</span>}
    <label htmlFor="amount">Your bid ({auction.currency || currency})</label><input id="amount" name="amount" type="number" min="0" step="any" placeholder={String(auction.currentPrice)} value={amount} onChange={(event) => { setAmount(event.target.value); setErrors((old) => ({ ...old, amount: undefined })) }} aria-invalid={Boolean(errors.amount)} aria-describedby="amount-hint amount-error" required /><span className="field-error" id="amount-error">{errors.amount}</span><p className="field-hint" id="amount-hint">Must be greater than {money(auction.currentPrice, auction.currency)}.</p><div className="bid-adjust"><button type="button" className="button secondary small" onClick={() => setAmount(adjustBidAmount(amount, auction.currentPrice, -10000))}>− 10,000</button><button type="button" className="button secondary small" onClick={() => setAmount(adjustBidAmount(amount, auction.currentPrice, 10000))}>+ 10,000</button></div><button className="button full" disabled={pending || blocked}>{pending ? 'Submitting bid…' : blocked ? 'Waiting for fresh auction data…' : 'Place bid ↗'}</button></fieldset><p className="demo-note">Your account username is public in bid history. No real payments are taken.</p></>}
  </form>
}
