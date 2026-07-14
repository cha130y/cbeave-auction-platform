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

## Migration note

Version 1.0 remains available as the historical baseline. Version 1.1 is the source of truth for implementation and testing during the one-month project.
