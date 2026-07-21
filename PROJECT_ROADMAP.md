# CBeave One-Month Project Roadmap

## Delivery principle

Finish one complete, stable auction journey before adding breadth. The project is successful when a user can create and schedule an auction, another user can bid in real time, anti-sniping works, and the platform determines and displays the result correctly.

## Scope priorities

### P0 — Core release blockers

- Email/password registration and login
- User profile
- Categories
- Auction draft, images, preview, publish, schedule, edit, and cancel
- Scheduled-to-active transition
- Real-time bid submission and broadcast
- Required minimum bid increment
- Seller cannot bid on own auction
- Administrator cannot sell or bid
- Anti-sniping: two-minute extension, maximum five extensions
- Automatic sold/unsold completion
- Bid history
- Basic administrator user/category management and emergency auction cancellation
- Dockerized local environment
- Critical unit, integration, and E2E tests

### P1 — Agreed one-month product features

- Google login
- Facebook login
- Watchlist
- In-app outbid notification
- Polished but bounded Live Arena
- Simple Hot Auctions ranked by accepted bid count

P1 features are committed, but their implementation must remain minimal and focused. Visual effects may be reduced before correctness, security, or testing is reduced.

## Four-week plan

### Week 1 — Freeze, foundation, and identity

- Merge the SRS/ERD alignment documentation
- Scaffold `apps/web`, `apps/api`, shared contracts, Prisma, and Docker
- Implement database connection and initial Prisma migration
- Implement registration, login, JWT refresh flow, logout, and profile
- Implement Google and Facebook OAuth
- Implement role and account-status guards
- Implement category read/admin CRUD

**Exit criteria:** Local, Google, and Facebook users can authenticate; suspended users are blocked; categories are available to the auction form.

### Week 2 — Auction management and discovery

- Implement draft creation and editing
- Implement image upload metadata
- Implement preview without persisting a Preview status
- Implement Publish command
- Implement Scheduled and Active listings
- Implement Starting Soon, Ending Soon, Recently Published, and simple bid-count Hot Auctions discovery queries
- Implement auction details, countdown, filters, and seller dashboard
- Implement hidden reserve handling
- Implement watchlist

**Exit criteria:** A user can create, preview, publish, discover, and watch a scheduled auction.

### Week 3 — Bidding engine and real-time behavior

- Implement auction WebSocket rooms
- Implement atomic bid validation and idempotency
- Broadcast current price, bid count, and recent bid events
- Implement seller/admin bid restrictions
- Implement anti-sniping and extension history
- Implement scheduled activation and automatic ending
- Implement sold/unsold determination
- Implement bid history and in-app outbid/winner/seller-ended notifications

**Exit criteria:** Two browser sessions can complete a correct real-time auction without refreshing.

### Week 4 — Live Arena, administration, and stabilization

- Connect the Figma Live Arena to real events
- Implement lobby participant count and countdown
- Implement current leader, recent bids, sudden-death extension state, and winner screen
- Add restrained animation and responsive polish
- Complete basic admin user/category/auction screens
- Add Docker setup, seed data, Swagger, and deployment notes
- Run critical E2E tests and fix defects

**Exit criteria:** The full core journey works on desktop and mobile layouts and can be demonstrated from a clean Docker setup.

## Live Arena boundary

Version 1 includes:

- Pre-auction lobby
- Live participant count
- Countdown and automatic transition
- Current highest bid and masked leader
- Recent bid feed
- Anti-sniping/sudden-death state
- Winner result screen
- Responsive design and restrained transitions

The following are polish-only and may be reduced when the schedule is at risk:

- Complex particle effects
- Elaborate podium animation
- Advanced bid streak calculations
- Extensive runner-up recommendations
- Audio effects

## Feature cut order if schedule slips

1. Reduce decorative Live Arena animation.
2. Reduce admin statistics to essential counts.
3. Reduce search and filter combinations.
4. Remove the Hot Auctions homepage section while retaining ordinary discovery.
5. Preserve all P0 correctness, security, bidding, and lifecycle behavior.

## Deferred roadmap

### Version 2

- Forgot-password recovery and transactional reset-email delivery
- Payment gateway and orders
- Shipping and fulfilment
- Email/push notification channels
- Seller verification
- Messaging and reviews
- User-submitted auction reports and administrator report resolution
- Redis and horizontal WebSocket scaling
- Administrator-curated Featured Auctions and advanced popularity ranking

### Version 3

- Multi-vendor storefronts
- Advanced seller/platform analytics
- PWA and native mobile applications
