# SRS Change Log

## Version 1.1 — 2026-07-11

Status: **Approved for implementation**

| ID | Change | Previous Version 1.0 position | Version 1.1 decision | Impact |
|---|---|---|---|---|
| CHG-001 | Actor model | Guest, User, Administrator described as roles | Guest is unauthenticated; stored roles are `USER` and `ADMIN` | Simplifies authorization and schema |
| CHG-002 | Buyer/seller model | Buyer and seller responsibilities were not consistently normalized | One `USER` can buy and sell, but cannot bid on own auction | Avoids duplicate account types |
| CHG-003 | Administrator marketplace access | Permission table was ambiguous | Admin can moderate but cannot create auctions or bid | Clear separation of duties |
| CHG-004 | Auction statuses | `Completed` and `Expired` | `SOLD` and `UNSOLD` | Handles reserve-not-met auctions correctly |
| CHG-005 | Preview and Publish | Sometimes presented like lifecycle states | Preview is UI-only; Publish is a command | Reduces unnecessary persisted states |
| CHG-006 | Bid increment | Optional | Required and greater than zero | Predictable bid validation |
| CHG-007 | Reserve price | Not fully specified in formal SRS | Optional and hidden; expose only met/not met | Aligns product history and Figma |
| CHG-008 | Buy Now | Present in early product planning | Deferred beyond one-month release | Avoids commerce/payment edge cases |
| CHG-009 | Social login | Google and Facebook | Google only | Reduces integration time |
| CHG-010 | Watchlist | Version 1.1 roadmap item | Included in one-month delivery scope | Supports scheduled-auction engagement |
| CHG-011 | In-app notifications | Outbid, winner, seller ended | Retained and made traceable requirements | Supports core real-time experience |
| CHG-012 | Live Arena | Broad immersive experience | Bounded to lobby, leader, bids, extension state, result, and responsive polish | Protects schedule while preserving identity |
| CHG-013 | Auction reports | Version 1.1 roadmap item | Included as user report plus admin resolution | Provides minimum moderation workflow |
| CHG-014 | Future architecture | Payments, shipping, storefronts, analytics shown in full ERD | Future-state reference only | Prevents 51-table implementation in one month |


## Version 1.1 amendment — 2026-07-13

Status: **Approved for implementation**

| ID | Change | Previous position | Updated decision | Impact |
|---|---|---|---|---|
| CHG-015 | User profile name structure | `user_profiles.full_name` stored as one required field | Replace it with required `first_name` and optional `last_name`; derive the full name in the application; retain independent `display_name` | Supports single-name users, OAuth profile data, and avoids duplicated/inconsistent full-name storage |
| CHG-016 | Password recovery | Password reset and `password_reset_tokens` were required in Version 1 despite external email delivery being excluded | Defer forgot-password recovery, reset-email delivery, the V1 token table, and the related admin action; retain the design in the future-state model | Removes an external integration from the one-month scope and keeps the core authentication and auction journey focused |
| CHG-017 | Administrator audit actions | The V1 ERD allowed auction reinstatement and destructive category deletion without corresponding safe workflows | Remove `REINSTATE_AUCTION` from V1 and replace `DELETE_CATEGORY` with `DEACTIVATE_CATEGORY`; retain broader actions only in the future-state model | Aligns audit values with implemented moderation behavior and prevents unsafe lifecycle or category operations |
| CHG-018 | Refresh-session metadata | V1 `user_sessions` stored optional `ip_address` and `user_agent` metadata | Limit V1 sessions to `id`, `user_id`, `refresh_token_hash`, `expires_at`, `revoked_at`, and `created_at`; retain richer metadata in the future-state model | Reduces privacy considerations and implementation scope without affecting refresh, logout, or revocation behavior |

## Version 1.1 amendment — 2026-07-15

Status: **Approved for implementation**

| ID | Change | Previous position | Updated decision | Impact |
|---|---|---|---|---|
| CHG-019 | Reserve-met persistence | V1 `auctions` stored `reserve_met_at` | Remove `reserve_met_at` from V1; derive the current buyer-facing reserve state from the private reserve price and accepted-bid aggregate, and include it in Live Arena bid broadcasts | Avoids redundant state and automatically reflects the current accepted highest bid |
| CHG-020 | Featured auction promotion | V1 `auctions` stored `is_featured` without a defined administrator workflow | Defer curated Featured Auctions and `is_featured` beyond V1; retain the concept in the future-state reference | Removes an untraceable admin feature from the one-month schema |
| CHG-021 | Hot Auctions | Public discovery did not define a V1 hot-ranking rule | Add a simple Active-auction list ordered by accepted `bid_count` descending, then `current_end_at` and auction ID; do not use watcher, participant, or live-viewer scoring | Adds an explainable homepage discovery feature without new persisted flags or infrastructure |

## Version 1.1 amendment — 2026-07-21

Status: **Approved for implementation**

| ID | Change | Previous position | Updated decision | Impact |
|---|---|---|---|---|
| CHG-022 | Facebook authentication | Google was the only V1 social provider | Support both Google and Facebook through `auth_accounts`; keep local password authentication on `users` | Adds the requested Facebook sign-in path without a new authentication table |
| CHG-023 | Bid persistence | V1 stored Accepted, Rejected, and Retracted bid states plus rejection details | Persist only accepted bids; rejected attempts return an error and do not create a row | Removes unused bid-state branches and keeps bid history authoritative |
| CHG-024 | Live participation states | V1 included RSVP, Joined, and Left | Persist only `JOINED` and `LEFT` | Removes a pre-event RSVP workflow from the Live Arena scope |
| CHG-025 | Auction-report moderation | V1 included user reports and an administrator resolution queue | Defer `auction_reports` and report resolution; retain administrator user/category management and emergency auction cancellation | Reduces moderation scope while preserving essential platform control |
| CHG-026 | Event and notification payloads | V1 stored optional JSON payload columns | Remove both JSON payload columns; clients use typed fields and refetch authoritative auction state when necessary | Avoids duplicated or stale denormalized values in V1 |
| CHG-027 | Auction event identifier | V1 used an auto-incrementing `bigint` | Use an auto-incrementing `int` for the bounded V1 event stream | Simplifies application serialization while leaving ample V1 capacity |
| CHG-028 | Notification auction reference | Notification auction references were optional | Require `auction_id`; retain optional `bid_id` for notification types not caused by one bid | Matches the auction-specific notification scope and preserves flexible result/cancellation events |
| CHG-029 | Category activation audit | V1 audit values included deactivation but not explicit reactivation | Add `ACTIVATE_CATEGORY` alongside create, update, and deactivate | Makes category activation/deactivation administration fully traceable |

## Migration note

Version 1.0 remains available as the historical baseline. Version 1.1 is the source of truth for implementation and testing during the one-month project.
