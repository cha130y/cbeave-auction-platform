# Requirements Traceability Matrix

Status values:

- **Planned** — not implemented yet
- **In progress** — implementation started
- **Verified** — acceptance test passes

| Requirement | Priority | ERD tables | Planned backend location | Planned frontend location | Verification | Status |
|---|:---:|---|---|---|---|---|
| AUTH-001 Local registration | P0 | `users`, `user_profiles.first_name`, `user_profiles.last_name`, `user_profiles.display_name` | `apps/api/src/auth` | `apps/web/app/(auth)` | Registration E2E including single-name and two-part-name cases | Planned |
| AUTH-002 Local login | P0 | `users`, `user_sessions` | `apps/api/src/auth` | `apps/web/app/(auth)` | Login/session E2E | Planned |
| AUTH-003 Google login | P1 | `users`, `auth_accounts`, `user_sessions` | `apps/api/src/auth/google` | Google auth callback | Google login integration | Planned |
| AUTH-005 Password reset | P0 | `password_reset_tokens` | `apps/api/src/auth/password-reset` | Forgot/reset pages | Token expiry/reuse tests | Planned |
| USR-001 Profile | P0 | `user_profiles.first_name`, `user_profiles.last_name`, `user_profiles.display_name` | `apps/api/src/users` | Profile page | Profile update and derived-full-name tests | Planned |
| CAT-001 Category management | P0 | `categories`, `admin_actions` | `apps/api/src/categories` | Browse/admin category UI | CRUD and deactivation tests | Planned |
| AUC-001 Create draft | P0 | `auctions`, `auction_images` | `apps/api/src/auctions` | Create auction flow | Draft ownership E2E | Planned |
| AUC-004 Preview/publish | P0 | `auctions`, `auction_events` | Auction publish use case | Preview page | State-transition tests | Planned |
| AUC-005 Scheduled visibility | P0 | `auctions` | Auction query/scheduler | Starting Soon/detail pages | Scheduler integration test | Planned |
| AUC-007 Completion | P0 | `auctions`, `bids`, `auction_events` | Auction lifecycle worker | Result screen | Sold/unsold E2E | Planned |
| BID-001 Valid bid | P0 | `bids`, `auctions` | `apps/api/src/bidding` | Bid panel | Validation matrix | Planned |
| BID-002 Atomic/idempotent bid | P0 | `bids`, `auctions` | Bidding transaction service | Client request ID | Concurrency test | Planned |
| BID-003 Real-time update | P0 | `auction_events` | Auction WebSocket gateway | Live Arena query cache | Two-client E2E | Planned |
| BID-004 Anti-sniping | P0 | `auction_extensions`, `auctions` | Bidding transaction service | Sudden Death UI | Final-two-minute test | Planned |
| WAT-001 Watch auction | P1 | `watchlists` | `apps/api/src/watchlists` | Watch buttons/list | Unique watch test | Planned |
| NOT-001 Outbid | P1 | `notifications`, `bids` | `apps/api/src/notifications` | Notification center/toast | Outbid two-client E2E | Planned |
| LIV-001 Lobby | P1 | `auction_participants`, `auctions` | Live Arena gateway | Lobby view | Participant/countdown test | Planned |
| LIV-002 Active arena | P1 | `auctions`, `bids`, `auction_events` | Bidding gateway | Live Arena view | Responsive live-flow E2E | Planned |
| LIV-003 Sudden death | P1 | `auction_extensions` | Extension event | Arena extension state | Extension UI test | Planned |
| LIV-004 Result | P1 | `auctions`, `bids` | Auction end event | Winner/unsold view | Result rendering test | Planned |
| REP-001 Submit report | P1 | `auction_reports` | `apps/api/src/reports` | Report dialog | Duplicate/open report test | Planned |
| REP-002 Resolve report | P1 | `auction_reports`, `admin_actions` | `apps/api/src/admin/reports` | Admin report queue | Admin authorization E2E | Planned |
| ADM-001 Moderate auction | P0 | `admin_actions`, `auctions` | `apps/api/src/admin` | Admin auctions | Cancellation audit test | Planned |
| OPS-001 Docker environment | P0 | N/A | `infra/docker` | N/A | Clean startup check | Planned |

Update the Status column in the same pull request that implements or verifies a requirement.

Name-model rule: `first_name` is required, `last_name` is optional, and `full_name` is derived in application code rather than persisted.
