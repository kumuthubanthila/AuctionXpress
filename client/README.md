
# AuctionXPress React client

A responsive React + Vite frontend using the installed React Router and plain CSS. All auctions, prices, dashboard counts, and bid history come from the Express API. There is no seeded/fake auction data, authentication, or payment processing. The dashboard is a shared management view, not a personal account.

## Run locally

Use two VS Code terminals from the project root:

```powershell
# Terminal 1: backend (uses the existing server/.env)
cd server
npm.cmd install
npm.cmd run dev
```

```powershell
# Terminal 2: frontend
cd client
npm.cmd install
npm.cmd run dev
```

Open **http://localhost:5173**. The backend defaults to **http://localhost:5000** and must have a working Atlas/replica-set connection for bidding, updates, and deletion. The Vite port is fixed to 5173 so it matches the existing backend CORS origin. If that port is occupied, stop the existing process or reuse the running client.

The client works without a new environment file. Optional values in `client/.env.local`:

```dotenv
VITE_API_URL=http://localhost:5000
VITE_CURRENCY=LKR
```

`VITE_API_URL` is the server origin without `/api`. Currency is a display label, defaults to LKR, and performs no exchange conversion; choose a valid ISO currency code before entering demo prices. These variables are public browser configuration; never put MongoDB credentials in client variables. Restart Vite after changing them. End-date inputs use the user's device timezone and are converted to UTC ISO strings for the API.

## Pages and routes

| Route | Behavior |
| --- | --- |
| `/` | API-backed spotlight, open auctions closing soon, and links to browse/create |
| `/auctions` | Title search, API-derived category choices, open/closed filtering, sorting, and image cards |
| `/auctions/:id` | Auction details, live countdown, prices, bid form, newest-first bid history, edit/delete actions |
| `/auctions/new` | Validated creation form and image preview |
| `/auctions/:id/edit` | Shared form prefilled from the API; starting price locked if bids exist |
| `/dashboard` | Actual marketplace counts and management table |
| Any other path | Friendly not-found state |

Search submits with Enter or the Search button. Filters apply immediately and are encoded in the URL, so back/forward and copied links preserve them. Search matches title text, categories match exactly, and sort choices use the server's supported fields. Missing/broken images show a neutral fallback, not a stock auction image.

Home, Browse, and Dashboard refresh every 30 seconds. Details and bid history refresh every 15 seconds and after a bid, with a manual Refresh button. Countdown/status updates every second using the device clock; the server remains authoritative about whether a bid is accepted. If a price refresh fails, the page keeps the last known data, displays an error, and blocks bidding until the auction can be refreshed. Failed bids keep the entered values; accepted bids clear the amount and refresh both price and history. A transaction error can have an uncertain commit outcome: inspect refreshed history before retrying.

## File guide

All paths below are relative to `client`.

| File | Purpose |
| --- | --- |
| `src/App.jsx` (replaced) | React Router route tree and shared layout |
| `src/components/Layout.jsx` | Navbar, mobile menu, skip link, route focus/title handling, and footer |
| `src/components/AuctionCard.jsx` | Reusable listing card, status badge, and image/fallback renderer |
| `src/components/Feedback.jsx` | Loading indicator, JSON/API errors, retry action, and empty states |
| `src/components/AuctionForm.jsx` | Shared create/edit fields, validation, API submission, pending state, and preview |
| `src/components/BidForm.jsx` | Name/amount validation, bid submission, accepted/conflict/error messages |
| `src/components/DeleteAuction.jsx` | Accessible modal confirmation, pending state, delete request, and server rejection display |
| `src/hooks/useApi.js` | Abortable fetching, stale-request protection, retries, polling, and refresh state |
| `src/hooks/useNow.js` | Shared one-second clock hook with timer cleanup |
| `src/lib/api.js` | Fetch wrapper, configurable origin, JSON serialization, typed API errors, connectivity handling |
| `src/lib/auction.js` | Formatting, local/UTC dates, countdowns, category suggestions, form validation, and writable payloads |
| `src/pages/Home.jsx` | Marketplace introduction and live auction highlights |
| `src/pages/Browse.jsx` | URL-driven search/filter/sort listing |
| `src/pages/AuctionDetails.jsx` | Auction, countdown, bidding, history, and management actions |
| `src/pages/AuctionEditor.jsx` | Create/edit loader, bid-history check, shared form, and success navigation |
| `src/pages/Dashboard.jsx` | Live summary cards and shared listing management |
| `src/index.css` (replaced) | Base typography, colors, controls, focus states, accessibility, reduced-motion support |
| `src/App.css` (replaced) | Page/component styles and desktop/tablet/mobile breakpoints |
| `test/auction.test.js` | Validation, date boundaries, protected payloads, request serialization, and API error tests |
| `test/components.test.js` | Render checks for shared components/pages, escaped titles, locked price, and closed bid form |
| `index.html` (updated) | Page metadata and branding |
| `public/favicon.svg` (updated) | AuctionXPress favicon |
| `vite.config.js` (updated) | Fixed development port matching backend CORS |
| `package.json` (updated) | Added the dependency-free Node test command |
| `README.md` (replaced) | This setup, file, and verification guide |

The existing `src/main.jsx` mounts the app with React StrictMode. No backend files or dependency versions were changed for this frontend work.

## Automated checks

From `client`:

```powershell
npm.cmd test
npm.cmd run build
```

Tests use isolated fixtures/mocked fetch responses only inside test files; none are used as application data. Render tests use Vite's SSR loader and do not simulate a real browser or MongoDB. The existing backend tests can be run separately from `server` with `npm.cmd test` (database integration is opt-in; see its README).

To preview the production build locally on the CORS-approved origin, stop the dev server and run:

```powershell
npm.cmd run preview -- --port 5173 --strictPort
```

If deploying later, configure the static host to serve `index.html` for client routes, set the API origin at build time, and allow the deployed client origin in backend CORS. This implementation is configured for the requested local development setup.

## Manual browser checklist

1. **Empty state:** With no auctions in your demo database, Home/Browse/Dashboard show empty states and actual zero counts. No sample listings should appear.
2. **Create:** Open Create auction. Submit blank fields, a negative price, an invalid URL, and a past end time; verify field messages. Create a valid auction with a future end time. Confirm navigation to Details, the success message, correct values, and its appearance in Browse/Dashboard. Test without an image and with an inaccessible image URL to check fallbacks.
3. **Browse:** Create items with different titles/categories. Search part of a title, combine category and status, and change each sort. Copy/reload the filtered URL and use back/forward. Try a search with no matches and clear filters.
4. **Edit:** Before bidding, change title/category/price and save; verify the price follows the new starting price. An unchanged expired end time may be preserved when editing other fields; a changed end time must be future. Direct current-price editing is never offered.
5. **Bid:** Try a blank/overlong name and amounts equal to or below the current price. Submit a valid higher amount; check the success message, new current price, and history. Open a second tab, submit a competing bid, and verify refresh/409 error handling in the first tab. All rejection messages come from the API.
6. **Protection:** After bidding, Edit locks the starting price. Open Delete confirmation: Keep auction/Escape cancels; confirming Delete shows the backend's bid-history restriction. For an auction with no bids, confirm deletion and verify its disappearance and updated dashboard counts.
7. **Close:** Create a separate auction ending a minute from now. Leave Details open until the countdown reaches zero; status becomes closed and the bid fields disappear. Find it using the Closed filter after refresh. Do not rely on manually changing the device clock; the API uses server time.
8. **Errors:** Stop the backend and refresh a page: an actionable network error and retry button appear. Restart the backend and retry. Visit an invalid/missing auction ID and an unknown frontend URL. Ensure malformed API responses produce a readable error.
9. **Responsive/accessibility:** Check widths near 375px, 768px, and 1280px. Test the mobile menu, readable cards/forms, horizontally scrollable management/history tables, keyboard navigation, visible focus, required field messages, dialog focus trapping, Escape, and the skip link. With reduced motion enabled, animations stop.
