# AuctionXpress

An online auction marketplace built with React, Vite, Express, and MongoDB. Buyers discover items and place bids, sellers manage listings, and administrators review auctions and manage accounts.

## Features

- Buyer and seller signup, login, profiles, and cookie-based sessions.
- Auction creation and editing, image uploads, scheduled starts, and currency selection.
- Title search, category/status filters, sorting, and responsive layouts.
- Bid history, countdowns, and an interactive bid progression graph.
- Atomic bidding with MongoDB transactions to keep prices and history consistent.
- Notifications for outbids, ended auctions, and winning bids.
- Buyer–seller messaging with a searchable inbox and conversation pane.
- Seller dashboards and an admin panel for approvals, accounts, and contact messages.
- Winner checkout that records payment references only; no funds are transferred or card details collected.

## Requirements

- Node.js 22.12+ and npm (Node.js 24 recommended).
- MongoDB Atlas or a MongoDB replica set with database credentials and network access configured. Standalone MongoDB does not support the required transactions.

## Setup and run

Keep existing environment files if already configured. For a new setup, create `server/.env`:

```dotenv
MONGO_URI=your_mongodb_connection_string
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

Start the backend from the repository root:

```powershell
cd server
npm.cmd install
npm.cmd run dev
```

In a second terminal from the repository root:

```powershell
cd client
npm.cmd install
npm.cmd run dev
```

Open **http://localhost:5173**. The API runs at **http://localhost:5000**; visit **http://localhost:5000/api/health** to check it. On macOS/Linux, use `npm` instead of `npm.cmd`.

The client uses the local API by default. Optionally create `client/.env.local` to override it:

```dotenv
VITE_API_URL=http://localhost:5000
```

Use the server origin without `/api` and restart Vite after changing it. Keep MongoDB credentials in the server environment only. Environment files are ignored by Git.

## Sample marketplace data

To add sample listings and bids, run this from `server` after configuring `MONGO_URI`:

```powershell
npm.cmd run seed
```

It is safe to run repeatedly: it creates 12 realistic sample auctions only when missing and adds only missing sample bids. The seed includes sellers `lakmal_perera`, `natures_craft`, and `urban_findslk`, plus buyers `isuru_j`, `amaya_fernando`, `kasun_g`, `tharushi_m`, and `dilan_rodrigo`. All seeded accounts use password `welcome2026`; the names and accounts are fictional.

## Accounts and workflow

1. Sign up as a seller and create a listing with a future end date.
2. Log in as admin and approve the listing in `/admin`.
3. Use another browser session to sign up as a buyer and bid above the current price.
4. Follow the bid graph and history, or select **Message seller** to open the conversation pane.
5. When the auction closes, the highest accepted bidder wins and can record a payment reference.

The backend creates username **admin** with password **admin** on startup if that account does not exist. Existing credentials are not reset. Change the default password before making the application publicly accessible.

Deleting an auction also permanently removes its bid history. Starting price and currency cannot be changed after bids exist. Currency selection does not perform exchange conversion.

## Main pages

| URL | Page |
| --- | --- |
| `/` | Home |
| `/auctions` | Browse and filter auctions |
| `/auctions/:id` | Details, graph, history, and bidding |
| `/auctions/new` | Create listing |
| `/auctions/:id/edit` | Edit listing |
| `/signup`, `/login`, `/profile` | Accounts |
| `/dashboard` | Account dashboard |
| `/messages` | Buyer–seller inbox |
| `/admin` | Administrator panel |
| `/about`, `/sellers`, `/contact` | Marketplace information and contact |
| `/auctions/:id/checkout` | Winner payment reference |

## Structure

```text
client/src/components/   Reusable interface components
client/src/pages/        Route-level pages
client/src/context/      Authentication state
client/src/hooks/        API polling and clock hooks
client/src/lib/          API client, formatting, and helpers
client/test/             Validation and rendering checks
server/controllers/     Request handling and business logic
server/models/          Mongoose schemas
server/routes/          API endpoints
server/middleware/      Authentication and error handling
server/test/            API and database integration checks
server/app.js           Express application
server/server.js        Database connection and startup
```

## Testing

From `client`, run:

```powershell
npm.cmd test
npm.cmd run build
```

From `server`, run:

```powershell
npm.cmd test
```

Database integration tests are skipped unless `TEST_MONGO_URI` is set. To include transaction, concurrency, account, and messaging checks, run from `server`:

```powershell
$env:TEST_MONGO_URI = 'your_test_replica_set_connection_string'
npm.cmd test
Remove-Item Env:TEST_MONGO_URI
```

Integration tests create uniquely named test databases and drop them afterwards. Use a test-capable account with permission to create and drop those databases.

For manual testing, create and approve a listing, bid from two buyer sessions, verify equal/lower bids are rejected, exchange messages, and check notifications after another bid and after closing. Check desktop and mobile layouts. Client automated checks use rendering and mocks, not a full browser.

## More documentation

- [Backend API and Postman guide](server/README.md)
- [Client setup and browser checklist](client/README.md)
- [Detailed features and permissions](FEATURES.md)
