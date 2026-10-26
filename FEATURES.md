# AuctionXPress accounts and ZIP feature migration

The PHP files in `AuctionXpress.zip` were reviewed as feature references. The app remains React/Vite + Express/Mongoose; PHP scripts and SQL connection settings are not executed or imported. The About page reuses the ZIP's `images/aboutUs1.jpg` as `client/public/reference/about-us.jpg`.

## Start and sign in

From the project root, in separate terminals:

```powershell
cd server
npm.cmd run dev
```

```powershell
cd client
npm.cmd run dev
```

Open **http://localhost:5173**. Restart the backend after this update. On startup it creates a missing demo administrator:

- Username: **admin**
- Password: **admin**
- Login page: **http://localhost:5173/login**
- Admin panel: **http://localhost:5173/admin**

The password is stored as a salted scrypt hash. Startup never overwrites an existing `admin` account/password. Other new accounts require 8–128 character passwords. Public signup supports only **buyer** or **seller**; additional admin accounts can be created inside the admin panel. The seeded `admin` and the current administrator cannot be removed. These published credentials are intended for this local demo; change the admin password in Profile before sharing a hosted deployment.

## ZIP feature coverage

| ZIP feature | MERN implementation |
| --- | --- |
| Buyer/seller registration | `/signup`: first name, last name, email, contact number, role, username, password and confirmation |
| Role-specific login/logout | `/login`, role-aware navigation, persistent 24-hour HTTP-only cookie sessions and server logout |
| User details and edit profile/password | `/profile` for each authenticated role; usernames/roles cannot be changed through profile updates |
| Buyer home/all products/search | Existing Home/Browse pages remain API-backed, with live upcoming/closing auctions and category links |
| Category and seller filtering | Browse supports both filters together, plus title, upcoming/open/closed status and sorting |
| Jewelries, Watches, Handbags, Arts, Wines | Included in category suggestions alongside the existing categories; custom categories remain supported |
| All sellers directory | `/sellers`, available after login, with profile contact details and seller listing links |
| Seller upload item | `/auctions/new`, including optional scheduled start, end date, image URL or PNG/JPEG/WebP upload (up to 5 MB) |
| Seller My Items, edit, remove | `/dashboard` shows the seller's own items and approval states; API enforces ownership |
| Seller bid status | Open any owned auction to see its accepted bid history, price, countdown and closing result |
| Approval waiting/approved/not-approved | Seller listings start waiting; `/admin` Approvals reviews them with combined category/approval filters |
| Admin home/items/add/edit/remove | Admin Items contains the marketplace dashboard with create/edit/delete actions and seller-specific filtering |
| Admin buyers/sellers/admins lists | Admin tabs list accounts, add accounts, edit profiles/passwords, and remove accounts |
| Admin seller's items | Sellers tab has a View items action filtering the admin's item table |
| Admin delete accounts | Permanent account deletion and session revocation in one transaction; auction/bid history is retained |
| About Us / Our Mission | `/about` |
| Buyer/seller Contact Us | `/contact`; authenticated contact forms save messages with the sender's role |
| Admin messages | Admin Messages inbox displays name, role, email, subject, message, time and removal action |
| Bid amount + / − buttons | Bid form includes ±100 convenience controls; arbitrary valid amounts can still be typed |
| Countdown/current result/winner | Details show scheduled starts, countdown, authenticated bidder usernames, accepted bids and winner after closure |
| Payment method/card/bank screens | Winner-only `/auctions/:id/checkout` offers card/bank **demo** flows and records a fictional reference/receipt |
| Payment success notification | A persisted `demo-completed` receipt confirms the simulation; no real payment processing is performed |

The ZIP's card and bank forms only displayed success alerts. The MERN version explicitly labels the simulation and does not collect or store card numbers, CVVs or bank account numbers. Only the authenticated winning buyer can record checkout after closure; amounts are determined by the server. Duplicate checkout is rejected.

## Permissions and retained data

- Anyone can browse approved auctions and accepted history. Unapproved items are visible only to their seller or an admin.
- Buyers can bid; bidder identity comes from the session, never from a submitted name. Sellers and admins cannot bid.
- Admin account edits bypass name/email/contact format and required-field checks. Admins can set a password of 0–128 characters, including a blank password. In the edit form, check **Replace password** to change or clear it; unchecked preserves the existing password. Only the guarded admin endpoint has this exception. New account signup/creation and users' own profile edits keep their validation. Login always verifies the saved password, including an empty one if an admin explicitly cleared it. Usernames and roles remain protected from profile edits.
- Sellers can create and manage only their own auctions. Admins can manage all items, including legacy listings without owners.
- Legacy auctions remain visible as approved and unowned. Only admins can edit/remove them; no automatic reassignment or destructive migration is performed.
- Seller edits before bidding return a listing to the approval queue. Once bids exist, the starting price/start time cannot change, deletion is rejected, and approval cannot be revoked. Existing end-date and price validation and transactional bidding are preserved.
- A demo-settled auction cannot be edited/reopened. Result/checkout derive the winner from accepted bid records, not client claims.
- Deleted accounts are removed from the user collection and cannot log in. All their sessions are revoked in the same transaction. Auction, bid, message and demo-payment records retain their original account IDs and stored names as history; deleting an account does not delete these records. Auctions of deleted sellers remain manageable by admins. Previously deactivated accounts can also be permanently deleted. The deleted username becomes available for a new account with a new ID.
- Uploaded files live in ignored `server/uploads/` and are served by Express. Keep that directory if you want photos to survive a server move; MongoDB stores their URLs. A future hosted setup needs persistent upload storage and a suitable `PUBLIC_API_URL`.

## New/extended backend API

| Method/path | Access / behavior |
| --- | --- |
| `POST /api/auth/signup` | Public: buyer/seller registration, signs in on success |
| `POST /api/auth/login` | Public: username/password, session cookie |
| `POST /api/auth/logout` | Revokes current cookie session |
| `GET /api/auth/me` | Current safe profile or null |
| `PUT /api/auth/profile` | Logged in: editable contact/name fields and optional password |
| `GET /api/sellers` | Logged in: active seller directory |
| `GET /api/account/bids` | Buyer: own bid history with auction summaries |
| `POST /api/uploads` | Seller/admin: `{data: "data:image/png;base64,..."}` |
| `POST /api/messages` | Logged in: `{name,email,subject,message}` |
| `GET/POST /api/admin/users` | Admin: list/create accounts; optional `?role=buyer|seller|admin` |
| `PUT/DELETE /api/admin/users/:id` | Admin: edit/permanently delete an account (main admin and self protected) |
| `GET /api/admin/messages` | Admin: contact inbox |
| `DELETE /api/admin/messages/:id` | Admin: remove a message |
| `PATCH /api/auctions/:id/approval` | Admin: `{approval:"waiting"|"approved"|"not-approved"}` |
| `GET /api/auctions/:id/result` | Visible auction: final winner, whether current buyer won, and own receipt |
| `POST /api/auctions/:id/payment` | Winning buyer: `{method:"card"|"bank",reference:"DEMO-001"}` |

Auction CRUD keeps its existing paths. Writes now require the correct session role and ownership. Listing adds `seller`, `scope=mine` (own items), `scope=all` (admin only), `approval` and `status=upcoming`. Public listing always restricts visibility to approved/legacy items. Auction creation/editing accepts optional `startsAt` before `endsAt`; it defaults to immediately on creation. `currentPrice` remains server-managed. Bid POST accepts `{amount}`; the legacy `bidderName` field is validated if supplied but never trusted as identity.

Errors remain JSON: 400 invalid fields/ID, 401 login required/invalid login, 403 insufficient permission, 404 missing or hidden item, 409 conflicting username/bid/state, 429 sign-in throttling. Session tokens are random and only hashes are stored. Browser writes enforce the configured origin; CORS uses credentials for `http://localhost:5173`. Do not replace the cookie with browser-local role flags.

## Test the complete flow

1. Start both apps, log in as `admin` / `admin`, verify the admin tabs, then log out.
2. Sign up as seller with full profile and a password of at least 8 characters. Create an auction with an end time several minutes ahead, optionally upload an image. It appears in My listings as Awaiting approval and is absent from public Browse.
3. In another browser profile/private window, sign in as admin. Approve the seller's item. Confirm that combined category/approval filters and seller View items work.
4. Sign up as buyer in a separate session. Filter Browse by seller/category and submit a bid above the current price. Verify that the stored bidder name matches the account, not a custom input. Equal/lower bids fail, sellers cannot bid, and other sellers cannot edit/delete the item.
5. Verify My bids, seller bid history, and the admin's Items view. A listing with bids rejects deletion, starting-price changes, and approval revocation.
6. Test scheduling with another approved item starting a minute from now: it is Upcoming, rejects early bids, then opens. Wait for an auction to end and confirm the winning buyer sees Demo checkout. Try both methods on separate won auctions, enter fictional references, and verify persisted receipts. Losing buyers cannot check out.
7. Update profiles/passwords, send a Contact Us message as buyer/seller, and inspect/remove it from the admin inbox. Add/edit a disposable account as admin. Click Delete: cancel first to verify nothing changes, then confirm to delete it. Verify a success message and immediate row removal, reload to confirm persistence, and check that old sessions/login no longer work. Previously inactive accounts can be deleted too. The main admin and your own account are protected.
8. Try opening `/admin` as a buyer, POSTing an admin signup role, and calling admin endpoints without a cookie. All must fail/redirect. Check mobile signup, login, admin tabs, tables and image uploads.

Postman: POST `/api/auth/login` with JSON `{"username":"admin","password":"admin"}`. Leave Postman's cookie jar enabled for subsequent calls. Use separate cookie jars or clear cookies when switching roles. POST `/api/auth/signup` uses the signup fields above. There is no Bearer token to copy.

## Automated verification

```powershell
cd client
npm.cmd test
npm.cmd run build
```

```powershell
cd server
npm.cmd test
```

Offline tests mock database operations and test hashing, login cookies, role boundaries, protected profiles, approval visibility, signup validation, contact inbox, existing CRUD/bids and component rendering. For real database tests set `TEST_MONGO_URI` explicitly to an Atlas/replica-set account, then run server tests. They create unique `ax_test_<ObjectId>` and `ax_auth_<ObjectId>` databases and drop only those generated databases on completion; no `.env` or application database is used by tests automatically.

## File guide for this update

- Backend models: `User.js`, `Session.js`, `Message.js`, `Payment.js`; Auction adds ownership/approval/start time, Bid adds account identity.
- `server/lib/passwords.js`: native async scrypt hashing, verification and token digests.
- `server/middleware/auth.js`: cookie/session lookup, login/role/origin guards and ownership/visibility helpers.
- `server/controllers/authController.js`: signup, login, logout, profile, and idempotent demo-admin initialization.
- `server/controllers/communityController.js`: admin account/message management, sellers, uploads, buyer bids, results, demo checkout.
- `server/routes/authRoutes.js` and `communityRoutes.js`: new endpoints and guards. Existing auction routes/controllers now enforce roles, ownership, approval and scheduling.
- `server/app.js`: credentialed CORS, uploads, auth and community routes. `server/server.js`: loads environment before app setup and ensures the admin after connecting.
- `client/src/context/AuthContext.jsx`: session state, login/logout and protected routes.
- New frontend pages: `Auth.jsx`, `Profile.jsx`, `Admin.jsx`, `Sellers.jsx`, `Contact.jsx`, `About.jsx`, `Checkout.jsx`.
- `client/src/components/AdminUsers.jsx` and `DeleteAccountDialog.jsx`: account table, protected delete actions, accessible confirmation, pending/error states and immediate success feedback.
- `client/src/components/UserForm.jsx`: shared profile/admin-account form. Existing Layout, AuctionForm, BidForm, auction cards, pages, styles and API client were extended.
- New tests: `server/test/auth.test.js`, `server/test/accounts.integration.test.js`; `server/test-support/auth.js` adapts prior CRUD/bid tests to authenticated roles. Frontend render tests cover signup, account/admin screens and protected UI.
- `.gitignore` excludes uploaded files; no environment credentials were changed.
