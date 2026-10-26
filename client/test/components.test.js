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
    const { default: UserForm } = await vite.ssrLoadModule('/src/components/UserForm.jsx')
    const adminEdit = render(UserForm, { initial: buyer, admin: true, onSaved() {} })
    assert.match(adminEdit, /Replace password/)
    assert.doesNotMatch(adminEdit, /required=""/)
    assert.doesNotMatch(adminEdit, /minLength="8"/)
    const ownEdit = render(UserForm, { initial: buyer, onSaved() {} })
    assert.match(ownEdit, /required=""/)
    assert.match(ownEdit, /minLength="8"/)
    for (const page of ['Admin', 'Profile', 'Contact', 'Sellers', 'Checkout', 'About']) {
      const { default: Page } = await vite.ssrLoadModule(`/src/pages/${page}.jsx`)
      assert.ok(withUser(Page, { ...buyer, role: 'admin' }).length > 100, page)
    }
    assert.doesNotMatch(withUser(Protected, buyer, { roles: ['admin'], children: h('div', null, 'secret admin tools') }), /secret admin tools/)
    assert.match(withUser(BidForm, buyer, { auction, open: true }), /value="buyer1"/)
    const bidding = withUser(BidForm, buyer, { auction: { ...auction, currency: 'USD' }, open: true })
    assert.match(bidding, /placeholder="20"/)
    assert.match(bidding, /10,000/)
    assert.match(bidding.replaceAll('<!-- -->', ''), /Your bid \(USD\)/)
    assert.match(render(Form, { onSaved() {} }), /id="currency"/)
    assert.match(render(Form, { onSaved() {} }).replaceAll('<!-- -->', ''), /USD — US dollar/)
    assert.match(withUser(BidForm, { ...buyer, role: 'seller' }, { auction, open: true }), /buyer accounts/)
    const { AccountDeleteButton } = await vite.ssrLoadModule('/src/components/AdminUsers.jsx')
    const currentAdmin = { _id: 'current-admin', username: 'other_admin' }
    const inactiveAccount = { _id: 'old-buyer', username: 'old_buyer', active: false }
    assert.doesNotMatch(render(AccountDeleteButton, { account: inactiveAccount, currentUser: currentAdmin }), /disabled/)
    assert.match(render(AccountDeleteButton, { account: { _id: 'root', username: 'admin' }, currentUser: currentAdmin }), /disabled=""/)
    assert.match(render(AccountDeleteButton, { account: currentAdmin, currentUser: currentAdmin }), /disabled=""/)
    const { default: DeleteAccountDialog } = await vite.ssrLoadModule('/src/components/DeleteAccountDialog.jsx')
    const confirmation = render(DeleteAccountDialog, { account: inactiveAccount, onCancel() {}, onDeleted() {} })
    assert.match(confirmation, /permanently deleted/)
    assert.match(confirmation, /Keep account/)
    assert.match(confirmation, /Delete account/)
    const { default: ActivityPanels } = await vite.ssrLoadModule('/src/components/ActivityPanels.jsx')
    const activity = withUser(ActivityPanels, buyer)
    assert.match(activity, /aria-label="Notifications"/)
    assert.match(activity, /aria-label="Messages"/)
    const { default: MessagesPage } = await vite.ssrLoadModule('/src/pages/Messages.jsx')
    assert.match(withUser(MessagesPage, buyer), /Your messages/)
    const { default: Checkout } = await vite.ssrLoadModule('/src/pages/Checkout.jsx')
    assert.doesNotMatch(withUser(Checkout, buyer), /demo/i)
    const { default: BidOverview } = await vite.ssrLoadModule('/src/components/BidOverview.jsx')
    const bids = [
      { _id:'high',bidderId:'buyer2',bidderName:'Leader',amount:30,createdAt:'2030-01-01T10:02:00Z' },
      { _id:'low',bidderId:'buyer1',bidderName:'First',amount:15,createdAt:'2030-01-01T10:00:00Z' },
      { _id:'mid',bidderId:'buyer1',bidderName:'First',amount:20,createdAt:'2030-01-01T10:01:00Z' }
    ]
    const overview = render(BidOverview, { auction, bids, now:Date.parse('2030-01-01T11:00:00Z') }).replaceAll('<!-- -->','')
    assert.match(overview,/Current leader: Leader/)
    assert.match(overview,/Accepted bids<\/span><strong>3/)
    assert.match(overview,/Participating buyers<\/span><strong>2/)
    assert.match(overview,/How does bidding work/)
    assert.match(overview,/Accepted bid number/)
    assert.match(overview,/type="range"[^>]*max="3"/)
    assert.doesNotMatch(overview,/NaN|Infinity/)
    const { default: Graph } = await vite.ssrLoadModule('/src/components/BidProgressionGraph.jsx')
    assert.doesNotMatch(render(Graph, { auction, bids:[bids[1]] }),/NaN|Infinity/)
    assert.match(render(BidOverview, { auction, bids, now:Date.parse('2036-01-01'), userId:'buyer2' }),/Winning bidder: Leader \(you\)/)
  } finally { await vite.close() }
})
