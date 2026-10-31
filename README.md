# AuctionXpress

AuctionXpress is a full-stack auction marketplace built with React, Vite, Express, and MongoDB. Sellers create listings, buyers place bids, and administrators review auctions and manage accounts.

## What it includes

- Buyer, seller, and administrator accounts with cookie-based sessions.
- Auction creation, approval, search, filters, bid history, countdowns, and bid progression charts.
- Transaction-safe bidding, notifications, seller messaging, and winner checkout references.
- Responsive React interface and Express API backed by MongoDB.

## Requirements

- Node.js 22.12 or later (Node.js 24 recommended).
- MongoDB Atlas or a MongoDB replica set. Transactions used by bidding require a replica set.

## Run locally

Create `server/.env`:

```dotenv
MONGO_URI=your_mongodb_connection_string
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

Start the API:

```powershell
cd server
npm.cmd install
npm.cmd run dev
```

In a second terminal, start the client:

```powershell
cd client
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`. The API health check is available at `http://localhost:5000/api/health`.

To use a different API origin, create `client/.env.local`:

```dotenv
VITE_API_URL=http://localhost:5000
```

`VITE_API_URL` must be the server origin without `/api`. Never put database credentials in client environment files.

## Initial administrator

The application also creates the initial `admin` account with password `admin` when it is missing. Change that password before making the application public.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Marketplace home |
| `/auctions` | Browse and filter listings |
| `/auctions/:id` | Auction details, bids, and history |
| `/dashboard` | Buyer or seller workspace |
| `/messages` | Buyer and seller inbox |
| `/admin` | Listing approval and account management |
| `/profile` | Account settings |

Deleting an auction permanently removes its bids. Starting price, currency, and start time cannot be changed after bids exist.

## Tests

Run the client checks from `client`:

```powershell
npm.cmd test
npm.cmd run build
```

Run the API checks from `server`:

```powershell
npm.cmd test
```

Set `TEST_MONGO_URI` before running the server tests to include database integration tests.
