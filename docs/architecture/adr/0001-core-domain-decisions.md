# ADR-0001: Core domain and one-month scope decisions

- **Status:** Accepted
- **Date:** 2026-07-11
- **Decision owners:** Solo project owner

## Context

The original SRS, Figma prototype, Version 1 ERD, and full future-state ERD used several inconsistent terms and scopes. The project has one developer and one month, so the implementation model must be clear, small enough to finish, and extensible without implementing future commerce domains now.

## Decisions

### Identity and roles

- Guest is an unauthenticated state, not a stored role.
- Stored roles are `USER` and `ADMIN`.
- One User can act as buyer and seller.
- A User cannot bid on an auction they own.
- An Admin cannot create marketplace auctions or bid.
- Version 1 supports email/password and Google login only.
- Forgot-password recovery and external reset-email delivery are deferred beyond Version 1.
- User profiles store required `first_name` and optional `last_name`; a separate editable `full_name` is not persisted.
- The application derives full name when needed, while `display_name` remains the independent public identity used in auctions and Live Arena.

### Auction workflow

- Persisted statuses are `DRAFT`, `SCHEDULED`, `ACTIVE`, `SOLD`, `UNSOLD`, and `CANCELLED`.
- Preview is a frontend step.
- Publish is a command that transitions a valid Draft.
- `SOLD` replaces Completed.
- `UNSOLD` covers no bids and reserve not met.

### Pricing

- Starting price is required.
- Minimum bid increment is required.
- Reserve price is optional and private.
- Buy Now is deferred.

### Real-time bidding

- Accepted bids use idempotency keys.
- Bid creation and auction price/count updates are atomic.
- Anti-sniping extends by two minutes in the final two minutes, at most five times.
- Extension history and auction events are persisted.

### One-month product additions

The delivery includes Google login, Watchlist, in-app outbid notification, a bounded polished Live Arena, and auction reporting.

### Administration and audit

- Version 1 audit actions cover user suspension/reactivation, auction cancellation, category creation/update/deactivation, and report resolution.
- Categories referenced by auctions are deactivated rather than destructively deleted.
- Auction reinstatement is deferred because Version 1 does not define a safe reinstatement transition after cancellation, scheduling, or bidding activity.

### Deferred architecture

The complete ERD remains a future-state reference. Password recovery, external email delivery, payments, orders, shipping, payouts, disputes, messaging, reviews, storefronts, multi-channel notifications, mobile apps, and advanced analytics are not implemented in this milestone.

## Consequences

### Positive

- Fewer role and state branches
- Clearer authorization
- Better handling of reserve-not-met outcomes
- A focused implementation target
- Future domains remain documented without increasing current migration risk

### Trade-offs

- Facebook login, password recovery, external email delivery, and Buy Now are postponed.
- Live Arena polish is bounded by time and accessibility.
- Auction reports are moderation reports, not analytical reports.
- The future ERD may change before its modules are implemented.

## Implementation rule

The approved Version 1 DBML guides the initial Prisma schema. Once migrations exist, Prisma migration history is the executable database source of truth, and DBML must be updated in the same pull request when data structures change.
