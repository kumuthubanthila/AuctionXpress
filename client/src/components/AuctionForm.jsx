import { useState } from 'react'
import { Link } from 'react-router'
import { api } from '../lib/api'
import { auctionPayload, currency, localDateInput, suggestedCategories, validateAuction } from '../lib/auction'
import { ErrorNotice } from './Feedback'
import { AuctionImage } from './AuctionCard'

export default function AuctionForm({ initial, hasBids = false, onSaved }) {
  const [values, setValues] = useState(() => initial ? { title: initial.title, description: initial.description, category: initial.category, imageUrl: initial.imageUrl || '', startingPrice: String(initial.startingPrice), endsAt: localDateInput(initial.endsAt) } : { title: '', description: '', category: '', imageUrl: '', startingPrice: '', endsAt: '' })
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [pending, setPending] = useState(false)
  function update(event) {
    const { name, value } = event.target
    setValues((old) => ({ ...old, [name]: value }))
    setErrors((old) => ({ ...old, [name]: undefined }))
  }
  const props = (name) => ({ id: name, name, value: values[name], onChange: update, 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${name}-error` : undefined })
  const hint = (name) => errors[name] && <span className="field-error" id={`${name}-error`}>{errors[name]}</span>
  async function submit(event) {
    event.preventDefault()
    if (pending) return
    const validation = validateAuction(values, initial)
    setErrors(validation)
    setFailure(null)
    if (Object.keys(validation).length) {
      document.getElementById(Object.keys(validation)[0])?.focus()
      return
    }
    setPending(true)
    try {
      const response = await api(initial ? `/auctions/${initial._id}` : '/auctions', { method: initial ? 'PUT' : 'POST', body: auctionPayload(values, initial) })
      onSaved(response.data)
    } catch (error) { setFailure(error); setErrors(error.errors || {}); setPending(false) }
  }
  return <div className="editor-layout"><form className="panel auction-form" onSubmit={submit} noValidate><ErrorNotice error={failure} /><fieldset disabled={pending}>
    <div className="form-section-title"><span>01</span><div><h2>The essentials</h2><p>Give your item a title and tell its story.</p></div></div>
    <label htmlFor="title">Auction title <span>*</span></label><input {...props('title')} maxLength={200} placeholder="Give your item a clear, descriptive title" required />{hint('title')}
    <label htmlFor="description">Description <span>*</span></label><textarea {...props('description')} rows={6} maxLength={10000} placeholder="Describe the condition, features, and anything bidders should know…" required />{hint('description')}
    <label htmlFor="category">Category <span>*</span></label><input {...props('category')} list="category-suggestions" maxLength={100} placeholder="Choose or enter a category" required /><datalist id="category-suggestions">{suggestedCategories.map((category) => <option key={category} value={category} />)}</datalist>{hint('category')}
    <label htmlFor="imageUrl">Image URL <small>Optional</small></label><input {...props('imageUrl')} type="url" placeholder="https://example.com/your-item.jpg" />{hint('imageUrl')}<p className="field-hint">Use a publicly accessible HTTP or HTTPS image. No upload is required.</p>
    <div className="form-section-title second"><span>02</span><div><h2>Price & timing</h2><p>Set the opening price and when bidding closes.</p></div></div>
    <div className="form-grid"><div><label htmlFor="startingPrice">Starting price ({currency}) <span>*</span></label><input {...props('startingPrice')} type="number" min="0" step="any" disabled={pending || hasBids} placeholder="0.00" required />{hint('startingPrice')}</div><div><label htmlFor="endsAt">End date & time <span>*</span></label><input {...props('endsAt')} type="datetime-local" step="1" required />{hint('endsAt')}</div></div>
    <p className="field-hint">Times use your device’s timezone. {hasBids ? 'The starting price is locked because this auction has bids.' : 'Bids must exceed the current price. The starting price is locked after the first bid.'}</p>
    <div className="form-footer"><span>* Required fields</span><div className="action-row"><Link className="button secondary" to={initial ? `/auctions/${initial._id}` : '/dashboard'} aria-disabled={pending} onClick={(event) => pending && event.preventDefault()}>Cancel</Link><button className="button" disabled={pending}>{pending ? 'Saving auction…' : initial ? 'Save changes ↗' : 'Publish auction ↗'}</button></div></div>
  </fieldset></form><aside className="editor-aside"><div className="panel preview-panel"><p className="eyebrow">YOUR ITEM, IN THE SPOTLIGHT</p><AuctionImage src={values.imageUrl.trim()} title={values.title || 'Your auction'} /><h3>{values.title || 'A great title makes a difference.'}</h3><p>{values.category || 'Choose a category so bidders can find you.'}</p></div><div className="tips"><span aria-hidden="true">✧</span><h3>A little detail goes a long way.</h3><p>Use a clear photo, describe the item honestly, and leave enough time for people to discover it.</p></div></aside></div>
}
