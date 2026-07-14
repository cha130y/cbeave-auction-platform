# Version 1 vs Future-State ERD

| Model | Purpose | Implementation status |
|---|---|---|
| Version 1 | One-month auction platform including Google login, Watchlist, Live Arena persistence, notifications, reports, moderation, and audit events | Approved target |
| Future state | Seller trust, commerce, payment, shipping, messaging, reviews, storefronts, expanded delivery channels, and analytics | Reference only |

## Version 1 tables

- Identity: `users`, `user_profiles`, `auth_accounts`, `user_sessions`
- Auction core: `categories`, `auctions`, `auction_images`, `bids`, `auction_extensions`, `auction_events`
- Engagement: `watchlists`, `auction_participants`, `notifications`
- Governance: `auction_reports`, `admin_actions`

## Version 1 decisions

- Only `USER` and `ADMIN` are persisted roles.
- Google is the only social provider in scope.
- Forgot-password recovery and external reset-email delivery are deferred.
- Refresh sessions omit IP-address and user-agent metadata in Version 1.
- Preview and Publish are not statuses.
- Canonical statuses are Draft, Scheduled, Active, Sold, Unsold, and Cancelled.
- Minimum bid increment is required.
- Reserve amount is private.
- Reserve-met state is derived and broadcast; `reserve_met_at` is not persisted in Version 1.
- Hot Auctions use a simple accepted-`bid_count` ranking with deterministic deadline/ID tie-breaking.
- Curated Featured Auctions and `is_featured` are deferred beyond Version 1.
- Buy Now is absent from the Version 1 model.
- Auction reports mean trust-and-safety reports, not analytics reports.
- Administrator audit actions use category deactivation rather than deletion, and auction reinstatement is deferred.

## Future-only domains

- Seller verification and addresses
- Orders and payments
- Refunds, disputes, and payouts
- Shipping and tracking
- Messaging and reviews
- Multi-channel notification delivery
- Forgot-password recovery and `password_reset_tokens`
- Session IP-address and user-agent metadata
- Seller storefronts
- Advanced analytics
- Administrator-curated Featured Auctions and advanced popularity scoring

Implement future domains only through separate approved requirements and incremental Prisma migrations.
