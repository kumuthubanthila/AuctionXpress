# Auction API

**Account update:** [FEATURES.md](../FEATURES.md) documents all ZIP features, permissions and new endpoints. Writes now require seller/admin session cookies and ownership; bids require buyer cookies. The demo admin **admin / admin** is created on startup. Log in using Postman's cookie jar before protected requests.

Run commands from `server`:

```powershell
npm.cmd install
npm.cmd run dev
```

The existing `.env` configuration is unchanged: `MONGO_URI` connects to Atlas and `PORT` defaults to 5000. The root route and `GET /api/health` keep their existing responses. CORS allows `http://localhost:5173`.

## Manual endpoint checks (PowerShell)

Use a disposable auction so the delete example does not affect existing data. Start the server first, then run:

```powershell
$base = 'http://localhost:5000'
Invoke-RestMethod "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body '{"username":"admin","password":"admin"}' -SessionVariable session
Invoke-RestMethod "$base/api/health" -WebSession $session

# POST: expect 201; currentPrice equals startingPrice and status is open.
$body = @{
  title = 'Canon Camera'
  description = 'Used camera in good condition'
  category = 'Electronics'
  imageUrl = 'https://example.com/camera.jpg'
  startingPrice = 5000
  endsAt = (Get-Date).ToUniversalTime().AddDays(7).ToString('o')
} | ConvertTo-Json
$created = Invoke-RestMethod "$base/api/auctions" -Method Post -ContentType 'application/json' -Body $body -WebSession $session
$id = $created.data._id
$created

# GET list and combined search/filter/sort: expect 200.
Invoke-RestMethod "$base/api/auctions" -WebSession $session
Invoke-RestMethod "$base/api/auctions?search=canon&category=Electronics&status=open&sort=-startingPrice,title" -WebSession $session
Invoke-RestMethod "$base/api/auctions?status=closed" -WebSession $session

# GET one: expect 200.
Invoke-RestMethod "$base/api/auctions/$id" -WebSession $session

# PUT: expect 200 and both prices updated to 6000.
Invoke-RestMethod "$base/api/auctions/$id" -Method Put -ContentType 'application/json' -Body '{"title":"Canon Camera - Updated","startingPrice":6000}' -WebSession $session

# DELETE: expect 200, then GET should return 404.
Invoke-RestMethod "$base/api/auctions/$id" -Method Delete -WebSession $session
Invoke-RestMethod "$base/api/auctions/$id" -WebSession $session
```

PowerShell displays errors for non-2xx responses; inspect the response body for the JSON message. For each invalid request below, expect HTTP 400:

```powershell
Invoke-RestMethod "$base/api/auctions/not-an-id" -WebSession $session
Invoke-RestMethod "$base/api/auctions?status=pending" -WebSession $session
Invoke-RestMethod "$base/api/auctions?sort=unknown" -WebSession $session
Invoke-RestMethod "$base/api/auctions" -Method Post -ContentType 'application/json' -Body '{}' -WebSession $session
Invoke-RestMethod "$base/api/auctions" -Method Post -ContentType 'application/json' -Body '{"startingPrice":-1}' -WebSession $session
Invoke-RestMethod "$base/api/auctions" -Method Post -ContentType 'application/json' -Body '{"endsAt":"2020-01-01T00:00:00Z"}' -WebSession $session
Invoke-RestMethod "$base/api/auctions" -Method Post -ContentType 'application/json' -Body '{"currentPrice":100}' -WebSession $session
Invoke-RestMethod "$base/api/auctions/000000000000000000000000" -WebSession $session
```

The final example expects 404 if that valid ObjectId does not exist. Repeat invalid-ID and missing-ID checks with PUT and DELETE; they return 400 and 404 respectively. For PUT body validation checks, use the ID of an existing auction before deleting it.

## Contract

- Required on POST: nonblank `title`, `description`, `category`, numeric finite `startingPrice >= 0`, and a future `endsAt` date string (use ISO 8601 with a timezone). `imageUrl` is optional and must be empty or an HTTP/HTTPS URL.
- PUT accepts any nonempty subset of the editable fields. Supplied end dates must be in the future. An expired auction can still have other fields edited without extending its end date.
- `currentPrice`, `status`, IDs, timestamps, and unknown fields are rejected in POST/PUT. Before bids exist, starting-price edits also set currentPrice. After bids exist, changing startingPrice returns 409; sending its unchanged value preserves currentPrice.
- `status` is derived when serialized: `open` if `endsAt > now`, otherwise `closed`. It is never stored. Closed auctions become visible in the closed filter after their end time passes.
- List query: `search` is a case-insensitive literal title substring; `category` is an exact, case-sensitive match; `status` is `open` or `closed`. Filters combine. Unknown or repeated query parameters return 400.
- `sort` is a comma-separated field list; prefix fields with `-` for descending order. Allowed fields: `title`, `category`, `startingPrice`, `currentPrice`, `endsAt`, `createdAt`, `updatedAt`. Default: `-createdAt`; ID breaks ties. The list is unpaginated.
- Success responses use `{ success: true, data }`; lists also include `count`. DELETE returns `{ success: true, message }`. Errors use `{ success: false, message }` with field-level `errors` for Mongoose validation failures. Unexpected server errors return a generic 500 response.
- Auctions with bids cannot be deleted (409). Bidding uses the authenticated buyer's username. Seller ownership, admin approval, scheduled starts, profiles and demo checkout are implemented. No real payment processing is performed.

## Files and automated checks

- `models/Auction.js`: validated schema, timestamps, derived status.
- `controllers/auctionController.js`: CRUD, writable-field validation, filtering and sorting.
- `routes/auctionRoutes.js`: the five endpoint mappings.
- `middleware/errorHandler.js`: JSON errors and unknown-route handling.
- `app.js`: Express middleware and routes, separated from startup for testing.
- `server.js`: retains dotenv, Atlas connection and listen configuration; imports the app.
- `package.json` and `test/auctions.test.js`: run `npm.cmd test` for HTTP contract tests with mocked database calls plus real Mongoose document validation. No Atlas data is touched. These checks do not replace the manual Atlas persistence checks above.

## Bidding in Postman

Start the server from `server` with `npm.cmd run dev`. Use an Atlas connection (or a MongoDB replica set); standalone MongoDB cannot execute transactions. Existing connection and health configuration are unchanged.

1. Set a Postman environment variable `baseUrl` to `http://localhost:5000`.
2. Create a disposable auction with **POST** `{{baseUrl}}/api/auctions`. Select Body > raw > JSON. Use a future `endsAt`:

   ```json
   {
     "title": "Demo Camera",
     "description": "Bidding demo",
     "category": "Electronics",
     "startingPrice": 100,
     "endsAt": "2030-12-01T12:00:00Z"
   }
   ```

   Expect 201. Save `data._id` as the `auctionId` environment variable, or add this Post-response script:

   ```js
   pm.environment.set("auctionId", pm.response.json().data._id);
   ```

3. **GET** `{{baseUrl}}/api/auctions/{{auctionId}}/bids` returns 200 with an empty `data` array initially.
4. Log in as a buyer using Postman's cookie jar. **POST** that same URL with raw JSON `{"amount":120}`. Expect 201 with the bid in `data` and `currentPrice: 120`. Bidder identity is taken from the account. **GET** the auction and its bid history to verify.
5. Repeat amount 120, or send 110: expect **409**, with the current-price requirement in `message`. Send 130: expect 201.
6. Send blank `bidderName`, a name over 100 characters, missing fields, a string amount (`"140"`), zero, a negative number, or extra fields: expect **400**. Malformed auction IDs return 400; valid but missing IDs return 404 for both bid endpoints.
7. Log back in as the item's seller or an admin. **DELETE** the auction: expect **409**. **PUT** with `{"startingPrice":50}`: expect **409**. Title/description edits still work, and `currentPrice` remains protected.
8. For an expired case, create another auction whose `endsAt` is roughly 15 seconds in the future; wait for that time to pass, then submit a bid. Expect **409**, `Auction has ended; bids are closed`. No bid is inserted and the price stays unchanged.
9. For competing bids, create a fresh auction at 100 and run this Postman Post-response script once (for example on a GET of that auction). Both requests use amount 150:

   ```js
   const url = pm.environment.get("baseUrl") + "/api/auctions/" + pm.environment.get("auctionId") + "/bids";
   const send = (name) => new Promise((resolve, reject) => {
     pm.sendRequest({
       url, method: "POST",
       header: { "Content-Type": "application/json" },
       body: { mode: "raw", raw: JSON.stringify({ bidderName: name, amount: 150 }) }
     }, (error, response) => error ? reject(error) : resolve(response));
   });
   Promise.all([send("Sam"), send("Lee")]).then((responses) => {
     pm.test("Exactly one competing bid succeeds", () => {
       pm.expect(responses.map((response) => response.code).sort()).to.eql([201, 409]);
     });
   });
   ```

   Verify one bid exists and currentPrice is 150. With different simultaneous amounts, both may succeed in increasing order, or only the higher one may succeed. Final price must be the maximum accepted amount. Remove the script after this check.

Bid submission uses an atomic `currentPrice < amount` and `endsAt > now` condition, then inserts history in the same transaction. MongoDB retries transient transaction conflicts. Price changes roll back if insertion fails. Auction edits and deletion also use transactions, so races with bids serialize on the same auction document and recheck history after retries. No standalone/nontransaction fallback is used. Transaction infrastructure failures return 503; if commit outcome is uncertain, reload auction/history before retrying (there is no idempotency key).

## Replica-set integration tests

`npm.cmd test` runs offline contract tests and skips database integration unless `TEST_MONGO_URI` is explicitly set. To run concurrency, rollback, expired-bid, bid-history protection and racing CRUD checks against a test-capable Atlas/replica-set account:

```powershell
$env:TEST_MONGO_URI = '<test Atlas or replica-set connection string>'
npm.cmd test
Remove-Item Env:TEST_MONGO_URI
```

The test creates a unique `ax_test_<ObjectId>` database, overrides the URI's database name, and drops only that generated database on completion. The account needs permission to create/drop that test database. It never loads `.env` or defaults to the application's `MONGO_URI`.

Additional files: `models/Bid.js` contains the validated bid schema and history index; `controllers/bidController.js` implements submission and history; `test/bids.test.js` covers the new behavior. Existing routes and middleware were extended for bid endpoints and informative transaction errors.
