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
    const { AuthContext, Protected } = await vite.ssrLoadModule('/src/context/AuthContext.jsx')
    const buyer = { _id: 'buyer', role: 'buyer', username: 'buyer1', firstName: 'Test', lastName: 'Buyer', email: 'test@example.com', contactNo: '0771234567' }
    const withUser = (Component, user, props = {}) => renderToString(h(MemoryRouter, null, h(AuthContext.Provider, { value: { user, loading: false } }, h(Component, props))))
    const { default: Auth } = await vite.ssrLoadModule('/src/pages/Auth.jsx')
    const signup = render(Auth, { signup: true })
    assert.match(signup, /I want to buy/)
    assert.match(signup, /I want to sell/)
    assert.match(signup, /Confirm password/)
    assert.match(render(Auth), /Log in/)
    for (const page of ['Admin', 'Profile', 'Contact', 'Sellers', 'Checkout', 'About']) {
      const { default: Page } = await vite.ssrLoadModule(`/src/pages/${page}.jsx`)
      assert.ok(withUser(Page, { ...buyer, role: 'admin' }).length > 100, page)
    }
    assert.doesNotMatch(withUser(Protected, buyer, { roles: ['admin'], children: h('div', null, 'secret admin tools') }), /secret admin tools/)
    assert.match(withUser(BidForm, buyer, { auction, open: true }), /value="buyer1"/)
    assert.match(withUser(BidForm, { ...buyer, role: 'seller' }, { auction, open: true }), /buyer accounts/)
  } finally { await vite.close() }
})
