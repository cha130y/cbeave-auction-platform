# CBeave ERD — Version 1 vs Complete Future-State Model

## Summary

| Model | Tables | Purpose |
|---|---:|---|
| Version 1 baseline | 16 | Authentication, profiles, auction lifecycle, real-time bidding, Live Arena persistence, in-app notifications, moderation, and audit events |
| Complete future-state | 51 | Version 1 plus seller trust, commerce, payments, payouts, shipping, messaging, reviews, storefronts, multi-channel notifications, and analytics |
| Net expansion | 35 | Planned capabilities that should be added through phased migrations rather than all at once |

## Version 1 tables retained

`users`, `user_profiles`, `auth_accounts`, `user_sessions`, `password_reset_tokens`, `categories`, `auctions`, `auction_images`, `bids`, `watchlists`, `auction_participants`, `auction_extensions`, `notifications`, `auction_reports`, `admin_actions`, and `auction_events`.

The complete model keeps these concepts and expands several of them. For example, `auctions` now includes item condition, shipping options, an origin address, and a normalized unsold reason. `notifications` can now link to orders and conversations and can be delivered through multiple channels.

## Added future-state domains

### Identity and seller trust

Added tables:

- `email_verification_tokens`
- `user_devices`
- `user_addresses`
- `seller_profiles`
- `seller_verification_cases`
- `seller_verification_documents`

Purpose: verified sellers, reusable addresses, native/PWA push devices, account verification, seller ratings, payout account references, and trust/safety workflows.

### Auction catalogue expansion

Added tables:

- `tags`
- `auction_tags`

Purpose: richer discovery and filtering without changing the core category hierarchy.

### Commerce and payments

Added tables:

- `orders`
- `order_addresses`
- `order_items`
- `payment_intents`
- `payment_transactions`
- `refunds`
- `disputes`
- `payouts`
- `payout_items`

Purpose: turn a winning auction or Buy Now action into a payable order, record provider transactions, support refunds and disputes, calculate platform fees, and pay sellers.

### Shipping and fulfilment

Added tables:

- `shipments`
- `shipping_labels`
- `shipment_events`

Purpose: shipping labels, carrier tracking, immutable delivery destinations, and fulfilment status history.

### Messaging, multi-channel notifications, and reputation

Added tables:

- `conversations`
- `conversation_participants`
- `messages`
- `message_attachments`
- `notification_preferences`
- `notification_deliveries`
- `reviews`

Purpose: buyer–seller communication, auction/order conversations, attachments, email/push/SMS delivery tracking, user preferences, and post-transaction reviews.

### Multi-vendor storefronts

Added tables:

- `storefronts`
- `storefront_followers`
- `storefront_collections`
- `storefront_collection_auctions`

Purpose: seller-branded storefront pages, followers, curated collections, and merchandising.

### Analytics

Added tables:

- `analytics_events`
- `auction_daily_metrics`
- `seller_daily_metrics`
- `platform_daily_metrics`

Purpose: event capture and OLTP-friendly daily aggregates for the seller dashboard, auction analytics, admin statistics, GMV, and platform revenue.

## Key modelling decisions

1. **One normal account can buy and sell.** `users.role` remains `USER` or `ADMIN`. Seller-specific state is placed in `seller_profiles`, while administrator accounts remain prohibited from bidding.
2. **Preview and Publish remain workflow concepts.** They are not persisted auction states. The canonical states remain `DRAFT`, `SCHEDULED`, `ACTIVE`, `SOLD`, `UNSOLD`, and `CANCELLED`.
3. **Reserve price stays private.** The amount is stored only on `auctions`; buyer-facing APIs expose only whether the reserve has been met.
4. **A successful auction produces commerce records.** Each sold auction is linked to one `order_item`, while an `order` can group multiple purchased auctions for the same buyer.
5. **Payment records are provider-neutral.** `payment_intents` represents the business payment attempt; `payment_transactions` records provider-level authorization, capture, refund, void, or chargeback activity.
6. **Seller payout accounting is explicit.** `payout_items` ties seller payouts to order items, preserving gross amounts, fees, refund adjustments, and net amounts.
7. **Shipping addresses are immutable snapshots.** `order_addresses` prevents later profile edits from changing historical order data.
8. **Notification creation is separated from delivery.** `notifications` stores the user-facing event; `notification_deliveries` tracks in-app, email, push, or SMS delivery attempts.
9. **Analytics aggregates are not transactional truth.** Bids, orders, payments, and payouts remain authoritative. Daily metric tables can be rebuilt from source events when necessary.

## Suggested implementation sequence

1. Keep the existing Version 1 core as the first production milestone.
2. Add identity hardening, seller profiles, verification, and addresses.
3. Add orders and payment-provider integration.
4. Add seller payouts, refunds, and disputes.
5. Add shipping and fulfilment.
6. Add messaging, reviews, and expanded notification channels.
7. Add storefronts and analytics aggregates.

The complete ERD is a target architecture. It should be implemented through bounded modules and incremental Prisma migrations, not as one large initial migration.
