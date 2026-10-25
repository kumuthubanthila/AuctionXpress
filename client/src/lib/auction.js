export const suggestedCategories = ['Jewelries', 'Watches', 'Handbags', 'Arts', 'Wines', 'Electronics', 'Art & Collectibles', 'Fashion', 'Home & Living', 'Sports', 'Vehicles', 'Other']
export const currency = import.meta.env?.VITE_CURRENCY || 'LKR'
export const money = (amount) => new Intl.NumberFormat('en-LK', { style: 'currency', currency, maximumFractionDigits: 8 }).format(amount)
export const dateTime = (date) => new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
export const isOpen = (auction, now = Date.now()) => new Date(auction.endsAt).getTime() > now && (!auction.startsAt || new Date(auction.startsAt).getTime() <= now) && (!auction.approval || auction.approval === 'approved')
export const isUpcoming = (auction, now = Date.now()) => new Date(auction.endsAt).getTime() > now && auction.startsAt && new Date(auction.startsAt).getTime() > now

export function countdown(endsAt, now = Date.now()) {
  const seconds = Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 1000))
  if (!seconds) return 'Bidding closed'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${days ? `${days}d ` : ''}${hours}h ${minutes}m ${seconds % 60}s`
}

export function localDateInput(date) {
  const value = new Date(date)
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 19)
}

export function validateAuction(values, initial) {
  const errors = {}
  for (const [field, max] of [['title', 200], ['description', 10000], ['category', 100]]) {
    if (!values[field].trim()) errors[field] = `${field[0].toUpperCase() + field.slice(1)} is required.`
    else if (values[field].length > max) errors[field] = `Use at most ${max} characters.`
  }
  if (values.startingPrice === '' || !Number.isFinite(Number(values.startingPrice)) || Number(values.startingPrice) < 0) errors.startingPrice = 'Enter a number of zero or greater.'
  const changedEnd = !initial || values.endsAt !== localDateInput(initial.endsAt)
  if (!values.endsAt || !Number.isFinite(Date.parse(values.endsAt)) || (changedEnd && Date.parse(values.endsAt) <= Date.now())) errors.endsAt = 'Choose a future end date and time.'
  if (values.startsAt && (!Number.isFinite(Date.parse(values.startsAt)) || Date.parse(values.startsAt) >= Date.parse(values.endsAt))) errors.startsAt = 'Start time must be before the end time.'
  if (values.imageUrl.trim()) {
    try { if (!['https:', 'http:'].includes(new URL(values.imageUrl.trim()).protocol)) throw new Error() }
    catch { errors.imageUrl = 'Use a complete HTTP or HTTPS image URL.' }
  }
  return errors
}

export function auctionPayload(values, initial) {
  const payload = { title: values.title.trim(), description: values.description.trim(), category: values.category.trim(), imageUrl: values.imageUrl.trim(), startingPrice: Number(values.startingPrice) }
  if (!initial || values.endsAt !== localDateInput(initial.endsAt)) payload.endsAt = new Date(values.endsAt).toISOString()
  if (values.startsAt && (!initial?.startsAt || values.startsAt !== localDateInput(initial.startsAt))) payload.startsAt = new Date(values.startsAt).toISOString()
  if (initial && payload.startingPrice === initial.startingPrice) delete payload.startingPrice
  return payload
}

export function validateBid(name, amount, currentPrice) {
  const errors = {}
  if (!name.trim() || name.trim().length > 100) errors.bidderName = 'Enter your name (1–100 characters).'
  if (amount === '' || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) <= currentPrice) errors.amount = `Enter an amount greater than ${money(currentPrice)}.`
  return errors
}
