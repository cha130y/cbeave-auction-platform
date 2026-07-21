# CBeave — Software Requirements Specification

**Version:** 1.1  
**Status:** Approved implementation baseline
**Approved date:** 2026-07-11  

## 1. Purpose

CBeave is a responsive, real-time online auction platform. It allows standard users to create scheduled auctions, browse and watch auctions, compete through valid real-time bids, and receive immediate results. Administrators manage users and categories and may cancel an inappropriate auction, but do not participate in marketplace transactions.

The implementation must prioritize a complete and demonstrable auction journey over a large number of partially completed features.

## 2. Actors and authorization

### 2.1 Guest

Guest is an unauthenticated application state and is not stored as a database role.

A Guest may:

- Browse public Scheduled, Active, Sold, and Unsold auctions
- View auction details and public bid information
- Search and filter auctions
- Register or log in

A Guest may not:

- Create or watch auctions
- Join authenticated Live Arena participation
- Place bids

### 2.2 User

A persisted standard account uses role `USER`. One User may act as both buyer and seller.

A User may:

- Manage their profile
- Create and manage their own auctions
- Watch auctions
- Join Live Arena sessions
- Bid on other users' Active auctions
- View their auction and bidding history
- Receive in-app notifications

A User may not bid on an auction they own.

### 2.3 Administrator

A persisted administrative account uses role `ADMIN`.

An Administrator may:

- View platform statistics
- Manage categories
- View and suspend/reactivate users
- Cancel inappropriate auctions
- View audit history

An Administrator may not:

- Create marketplace auctions
- Watch auctions as a buyer
- Place bids

## 3. Version 1.1 scope

### 3.1 Required capabilities

- Email/password registration, login, logout, and JWT sessions
- Google and Facebook login
- User profile management
- Category browsing and administrator category management
- Auction draft creation, image management, preview, publish, scheduling, editing, and cancellation
- Public auction discovery and details
- Simple Hot Auctions discovery ranked by accepted bid count
- Required minimum bid increment
- Optional hidden reserve price
- Real-time bidding through WebSockets
- Bid history
- Anti-sniping extensions
- Watchlist
- In-app outbid, winner, seller-ended, and cancellation notifications
- Polished but bounded Live Arena
- Basic administrator user/category management and emergency auction cancellation
- REST API documentation through Swagger
- Docker-based local environment

### 3.2 Explicit exclusions

- Forgot-password recovery and external reset-email delivery
- Session IP history, geolocation, and user-agent/device metadata
- Buy Now
- Payments, refunds, disputes, and seller payouts
- Orders and shipping
- Seller verification
- Buyer/seller messaging
- Reviews
- Multi-vendor storefront pages
- Email, push, and SMS delivery
- Guest read-only Live Arena
- Redis and horizontal scaling
- PWA and native applications
- Advanced seller/platform analytics
- Administrator-curated Featured Auctions and advanced popularity scoring
- User-submitted auction reports and administrator report resolution

## 4. Technology constraints

| Component | Technology |
|---|---|
| Web | Next.js App Router, React, TypeScript, Tailwind CSS |
| Forms and validation | React Hook Form and Zod |
| Server state | TanStack Query |
| API | NestJS, TypeScript, REST, Swagger |
| Real time | NestJS WebSocket gateway |
| Database | PostgreSQL and Prisma |
| Authentication | JWT, refresh sessions, Google OAuth, Facebook OAuth |
| Backend validation | `class-validator` |
| Deployment | Docker |

## 5. Authentication requirements

### AUTH-001 — Local registration

A new User can register with first name, optional last name, display name, unique email, and password. The password must be validated and securely hashed. The application derives a full name from first and last name rather than storing a separate editable `full_name` value.

### AUTH-002 — Local login

An active User can log in with email and password and receive an access token and refresh session. Suspended and deactivated users must be rejected.

### AUTH-003 — Google login

A User can register or log in through Google. A Google identity must be linked uniquely to one CBeave account.

### AUTH-004 — Session management

Refresh tokens must be stored as hashes, have an expiry, and support revocation on logout.

The Version 1 `user_sessions` record is intentionally limited to an identifier, owning user, refresh-token hash, expiry, revocation timestamp, and creation timestamp. IP-address and user-agent metadata are deferred.

### AUTH-005 — Password reset (Deferred)

Forgot-password recovery is deferred beyond Version 1 because the release does not include external email delivery. Version 1 must not expose reset tokens through API responses or production logs. Authenticated password changes may be added separately without introducing email-based recovery.

### AUTH-006 — Facebook login

A User can register or log in through Facebook. A Facebook identity must be linked uniquely to one CBeave account. Version 1 requests an email from the provider; onboarding must stop with a clear error when Facebook does not return a usable email.

Google and Facebook identities are keyed by provider plus provider account identifier. The application must not automatically attach a new social identity to an existing account based only on an unverified matching email. One CBeave User may link at most one account from each provider.

## 6. User profile requirements

### USR-001 — Profile

A User can view and update first name, optional last name, display name, avatar, bio, phone, and location. The application derives the full name from first and last name. Public auction views must use display name or an appropriately masked form.

## 7. Auction lifecycle

The canonical persisted states are:

```text
DRAFT → SCHEDULED → ACTIVE → SOLD
                         └→ UNSOLD
DRAFT / SCHEDULED ───────→ CANCELLED
```

- `Preview` is a frontend rendering step and is not stored.
- `Publish` is an application command.
- Publishing with a future start creates `SCHEDULED`.
- Publishing at or after the start time creates `ACTIVE` when valid.

### AUC-001 — Create draft

A User can create a private draft containing title, description, category, starting price, minimum bid increment, optional reserve price, schedule, and images.

### AUC-002 — Validation

- Title, description, category, starting price, minimum bid increment, start time, and end time are required before publication.
- Starting price and minimum bid increment must be greater than zero.
- End time must be later than start time.
- At least one image is required before publication.
- Optional reserve price must be greater than or equal to starting price.

### AUC-003 — Hidden reserve

The reserve amount is private. Buyer-facing API responses may expose only a derived `reserveMet: true/false` value. Version 1 does not persist `reserve_met_at`; the service derives the current reserve state from `reserve_price`, `bid_count`, and `current_price`. An auction with bids below reserve ends as `UNSOLD`.

### AUC-004 — Preview and publish

The seller can preview the exact buyer-facing layout without changing persisted status. Publishing transitions a valid draft to Scheduled or Active.

### AUC-005 — Scheduled visibility

A Scheduled auction is publicly visible. Users can view it, watch it, and join its pre-auction lobby, but cannot bid before start time.

### AUC-006 — Editing and cancellation

The seller may edit or cancel a Draft or Scheduled auction. Once Active or once a valid bid exists, marketplace fields are immutable except through administrator moderation and system lifecycle updates.

### AUC-007 — Completion

- Highest valid bid meeting reserve: `SOLD`
- No bids: `UNSOLD`
- Bids below reserve: `UNSOLD`
- The winner and winning bid must be persisted when Sold.

### AUC-008 — Simple Hot Auctions

The public Hot Auctions list contains Active, non-deleted auctions ordered by accepted `bid_count` descending. Ties are ordered by `current_end_at` ascending and then by auction identifier for deterministic results. Version 1 does not use `is_featured`, watcher counts, participant counts, live-viewer presence, time-decay scoring, or a persisted hot flag for this list.

## 8. Bidding requirements

### BID-001 — Valid bid

A bid is accepted only when:

- The auction is Active
- The bidder is an active `USER`
- The bidder is not the seller
- The amount is at least current price plus minimum bid increment
- The request is not a duplicate

Only accepted bids are persisted. A rejected request returns a validation or conflict response and does not create a `bids` row; Version 1 therefore does not persist bid status or rejection reason fields.

### BID-002 — Atomicity and idempotency

Bid validation, accepted-bid creation, current-price update, bid-count update, reserve evaluation, and any extension must be performed atomically. A client request identifier must prevent duplicate bids caused by retries.

### BID-003 — Real-time update

An accepted bid must be broadcast without a page refresh to connected clients in the auction room. The authoritative bid broadcast includes the derived reserve-met state without exposing the private reserve amount; it does not create a persistent reserve notification.

### BID-004 — Anti-sniping

A valid bid placed in the final two minutes extends the current end time by two minutes. A maximum of five extensions is allowed. Every extension must be recorded.

### BID-005 — Bid history

Users can view chronological bid history with amount, time, and masked bidder identity. Sellers and administrators receive only information allowed by privacy rules.

## 9. Watchlist requirements

### WAT-001 — Watch auction

An authenticated User can add or remove a public auction from their watchlist. The same auction cannot be added twice by the same User.

### WAT-002 — Watchlist view

A User can view watched auctions and their current status, countdown, current price, and result.

## 10. Notification requirements

Version 1.1 notifications are stored and delivered in-app through the authenticated application and WebSocket connection.

### NOT-001 — Outbid

When a new accepted bid replaces the current leader, the previous leader receives an in-app outbid notification.

### NOT-002 — Auction won

The winner receives an in-app notification when the auction ends Sold.

### NOT-003 — Seller result

The seller receives an in-app notification when their auction ends Sold or Unsold.

### NOT-004 — Cancellation

Affected watchers or participants may receive an in-app cancellation notification.

## 11. Live Arena requirements

### LIV-001 — Pre-auction lobby

The lobby shows auction information, live participant count, countdown, join state, and automatic transition at start time.

### LIV-002 — Active arena

The Active arena shows current price, masked leader, recent bids, remaining time, minimum next bid, reserve-met state, and bid controls.

### LIV-003 — Sudden death

During an anti-sniping extension, the arena displays extension number, updated end time, and a visually distinct but accessible urgent state.

### LIV-004 — Result

At the end, the arena displays Sold/Unsold status, the winner when allowed, final price, and a restrained celebration for a successful sale.

### LIV-005 — Polish boundary

The Live Arena must be responsive and professionally animated, but animation must not delay bid controls, obscure information, or replace correct business behavior.

## 12. Administration

### ADM-001 — Moderate auction

An Administrator can cancel an inappropriate auction and record the action and reason.

### ADM-002 — Manage users

An Administrator can suspend or reactivate a User. A suspended User cannot authenticate, create auctions, or bid.

### ADM-003 — Manage categories

An Administrator can create, update, activate, and deactivate categories. Categories referenced by auctions should be deactivated rather than destructively deleted.

### ADM-004 — Audit actions

Important administrative actions must be stored with administrator, action type, target, note, and timestamp.

User-submitted auction reports and an administrator report-review queue are deferred beyond Version 1. Emergency auction cancellation remains available directly to an Administrator and is recorded in `admin_actions`.

## 13. API and WebSocket contracts

Minimum REST areas:

- `/auth`
- `/users/me`
- `/categories`
- `/auctions`
- `/auctions/:id/bids`
- `/watchlist`
- `/notifications`
- `/admin`

Minimum auction events:

- `auction:started`
- `auction:bid`
- `auction:extension`
- `auction:ended`
- `notification:created`

Shared request, response, and event contracts should live in `packages/contracts`.

## 14. Security and quality requirements

- Validate all external input.
- Enforce authorization on the server, not only in the UI.
- Hash passwords and refresh tokens.
- Never expose reserve amount.
- Rate-limit authentication and bid submission.
- Use database transactions or equivalent concurrency protection for bids.
- Log security-sensitive administrator actions.
- Do not expose private bidder information.
- Provide useful errors without leaking implementation details.

## 15. Critical acceptance journey

The release is acceptable when all steps below work from a clean environment:

1. User A registers locally or logs in with Google or Facebook.
2. User A creates, previews, and publishes a scheduled auction.
3. User B watches the auction and joins the lobby.
4. At start time the auction becomes Active without manual refresh.
5. Users B and C submit valid competing bids in real time.
6. A bid in the final two minutes extends the auction correctly.
7. The previous leader receives an outbid notification.
8. At end time the platform determines Sold or Unsold correctly.
9. Winner and seller notifications are created.
10. An Administrator can manage a user or category and the action is audited.
11. An Administrator can cancel an inappropriate auction with a reason when an emergency moderation action is needed.
12. The complete flow runs through Docker and passes critical E2E tests.
