import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

test('reusable components and routed pages render without runtime errors', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  try {
    const render = (Component, props = {}) => renderToString(h(MemoryRouter, null, h(Component, props)))
    const auction = { _id: 'test', title: '<Camera>', description: 'A good camera', category: 'Electronics', imageUrl: '', startingPrice: 10, currentPrice: 20, endsAt: '2035-01-01T00:00:00Z' }
    const { default: Card } = await vite.ssrLoadModule('/src/components/AuctionCard.jsx')
    const card = render(Card, { auction })
    assert.match(card, /&lt;Camera&gt;/)
    assert.match(card, /Image unavailable/)
    assert.match(card, /Current price/)
    const { default: Form } = await vite.ssrLoadModule('/src/components/AuctionForm.jsx')
    const form = render(Form, { initial: auction, hasBids: true, onSaved() {} })
    assert.match(form, /startingPrice[^>]*disabled=""/)
    assert.match(form, /locked because this auction has bids/)
    const { default: BidForm } = await vite.ssrLoadModule('/src/components/BidForm.jsx')
    assert.doesNotMatch(render(BidForm, { auction, open: false }), /id="amount"/)
    for (const page of ['Home', 'Browse', 'AuctionDetails', 'AuctionEditor', 'Dashboard']) {
      const { default: Page } = await vite.ssrLoadModule(`/src/pages/${page}.jsx`)
      assert.ok(render(Page).length > 100, page)
    }
  } finally { await vite.close() }
})
