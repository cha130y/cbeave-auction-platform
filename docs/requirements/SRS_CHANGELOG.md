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

## Migration note

Version 1.0 remains available as the historical baseline. Version 1.1 is the source of truth for implementation and testing during the one-month project.
