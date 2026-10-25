import { test } from 'node:test'
import assert from 'node:assert/strict'
import { auctionPayload, countdown, isOpen, localDateInput, validateAuction, validateBid } from '../src/lib/auction.js'
import { api, ApiError } from '../src/lib/api.js'

const initial = { title: 'Camera', description: 'A test item', category: 'Electronics', imageUrl: '', startingPrice: 10, currentPrice: 20, endsAt: '2035-01-01T00:00:00.000Z' }
const values = () => ({ ...initial, startingPrice: '10', endsAt: localDateInput(initial.endsAt) })

test('auction forms validate fields, HTTP URLs, finite prices and future dates', () => {
  assert.deepEqual(validateAuction(values()), {})
  const invalid = { ...values(), title: ' ', category: '', description: '', startingPrice: '-1', endsAt: '2020-01-01T00:00', imageUrl: 'javascript:alert(1)' }
  assert.deepEqual(Object.keys(validateAuction(invalid)).sort(), ['category', 'description', 'endsAt', 'imageUrl', 'startingPrice', 'title'])
  for (const startingPrice of ['', 'Infinity', 'not-a-number']) assert.ok(validateAuction({ ...values(), startingPrice }).startingPrice)
})

test('editing an expired auction omits unchanged end time and price', () => {
  const expired = { ...initial, endsAt: '2020-01-01T00:00:00.123Z' }
  const form = { ...values(), endsAt: localDateInput(expired.endsAt), title: 'Updated' }
  assert.deepEqual(validateAuction(form, expired), {})
  const payload = auctionPayload(form, expired)
  assert.equal(payload.title, 'Updated')
  for (const field of ['endsAt', 'startingPrice', 'currentPrice', '_id', 'status']) assert.equal(field in payload, false)
  const changed = auctionPayload({ ...form, startingPrice: '30', endsAt: localDateInput('2036-01-01T00:00:00Z') }, expired)
  assert.equal(changed.startingPrice, 30)
  assert.equal(changed.endsAt, '2036-01-01T00:00:00.000Z')
})

test('bid form rejects blank names, duplicate/lower prices and invalid amounts', () => {
  for (const amount of ['', '20', '19', '0', '-1', 'Infinity', 'abc']) assert.ok(validateBid('Sam', amount, 20).amount)
  assert.ok(validateBid(' ', '30', 20).bidderName)
  assert.ok(validateBid('a'.repeat(101), '30', 20).bidderName)
  assert.deepEqual(validateBid(' Sam ', '20.01', 20), {})
})

test('closing boundary and countdown agree', () => {
  const now = Date.parse(initial.endsAt)
  assert.equal(isOpen(initial, now - 1), true)
  assert.equal(isOpen(initial, now), false)
  assert.equal(countdown(initial.endsAt, now), 'Bidding closed')
  assert.equal(countdown(initial.endsAt, now - 90061000), '1d 1h 1m 1s')
})

test('API wrapper serializes requests and preserves server validation/conflict messages', async (t) => {
  let captured
  let result = { success: true, data: { _id: 'test' } }
  let status = 201
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    captured = { url, options }
    return new Response(JSON.stringify(result), { status, headers: { 'Content-Type': 'application/json' } })
  })
  assert.equal((await api('/auctions', { method: 'POST', body: { title: 'Camera' } })).data._id, 'test')
  assert.equal(captured.url, 'http://localhost:5000/api/auctions')
  assert.equal(captured.options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(captured.options.body), { title: 'Camera' })
  status = 409
  result = { success: false, message: 'Auction has ended; bids are closed', errors: { amount: 'Too low' } }
  await assert.rejects(api('/auctions/test/bids'), (error) => error instanceof ApiError && error.status === 409 && error.errors.amount === 'Too low' && /ended/.test(error.message))
})

test('API wrapper distinguishes connectivity, abort and unreadable responses', async (t) => {
  let mode = 'network'
  t.mock.method(globalThis, 'fetch', async () => {
    if (mode === 'network') throw new TypeError('Failed to fetch')
    if (mode === 'abort') throw new DOMException('Aborted', 'AbortError')
    return new Response('<html>Error</html>', { status: 502 })
  })
  await assert.rejects(api('/auctions'), (error) => error.status === 0 && /backend/.test(error.message))
  mode = 'abort'
  await assert.rejects(api('/auctions'), (error) => error.name === 'AbortError')
  mode = 'invalid'
  await assert.rejects(api('/auctions'), /unreadable/)
})
