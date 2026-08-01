# Changelog

All notable repository and product changes are documented here.

The format follows Keep a Changelog principles. Product releases will use semantic versioning once the application is deployable.

## [Unreleased]

### Added

- Added the NestJS and Prisma API foundation with validated runtime configuration and PostgreSQL health checks.
- Added local registration and login with bcrypt password hashing and short-lived JWT access tokens.
- Added database-backed refresh-token rotation and idempotent logout with scoped HttpOnly cookies.
- Added access-token, session-revocation, and account-status protection for authenticated endpoints.
- Added protected current-user profile read and update endpoints with validation, nullable-field clearing, and a derived full name.
- Added Google OAuth login with verified-email account resolution, database-backed sessions, and CSRF-resistant state validation.
- Added Facebook OAuth login with database-backed sessions, repeat-login identity reuse, email-collision protection, and shared CSRF-resistant OAuth state validation.
- Added public two-level category browsing and administrator-only audited category creation with slug, parent, and hierarchy validation.
- Added audited administrator category updates and idempotent activation/deactivation with inactive-parent protection.
- Added authenticated user-owned auction draft creation with exact money responses, category and schedule validation, seller-role enforcement, and `CREATED` event persistence.
- Added seller-only retrieval for private auction drafts with UUID validation and ownership-safe not-found responses.
- Added seller-owned auction draft editing with partial updates, nullable reserve and schedule removal, active-category validation, ownership protection, and row-version increments.
- Added Cloudinary-backed seller auction image upload and deletion with file validation, a five-image limit, ordered primary images, storage cleanup, draft response integration, and row-version increments.
- Added transactional auction publication with validation, scheduled or immediate activation, optimistic state guarding, lifecycle timestamps, and `PUBLISHED`/`STARTED` event persistence.
- Added public auction discovery with category filtering, cursor pagination, primary images, public seller identity, and derived reserve state without exposing reserve amounts.
- Added public auction detail retrieval with complete lifecycle data, ordered images, public seller and winner identities, private-draft protection, and shared hidden-reserve derivation.
- Added scheduled auction lifecycle reconciliation with non-overlapping processing, optimistic transition guards, overdue activation, Sold/Unsold completion, lifecycle timestamps, and `STARTED`/`ENDED` event persistence.
- Added authenticated transactional bidding with request idempotency, serializable concurrency protection, exact reserve-state responses, accepted-bid events, and bounded anti-sniping extensions.
- Added public chronological bid history with sequence-number cursor pagination and masked bidder identities without exposing sensitive account data.
- Added auction-scoped Socket.IO rooms with validated join/leave commands and post-commit accepted-bid broadcasts containing price, reserve-state, and anti-sniping extension updates without exposing sensitive request or identity fields.
- Added authenticated watchlist management with idempotent add/remove operations, cursor-paginated listing, public-auction visibility protection, and shared hidden-reserve auction summaries.
- Added authenticated in-app notifications with private cursor pagination, unread filtering, idempotent read tracking, transactional outbid alerts, and atomic winner and seller auction-result delivery.
- Added administrator-only normal-user discovery and audited suspension/reactivation with cursor pagination, status filtering, active-session revocation, account-target protection, and idempotent status changes.
- Added administrator-only auction cancellation with state validation, optimistic concurrency protection, idempotent retries, lifecycle and audit records, and deduplicated cancellation notifications for affected sellers, watchers, participants, and bidders.
- Added administrator-only audit-action history with action-type filtering, newest-first cursor pagination, administrator identity, and typed user, auction, or category targets.
- Added a public Hot Auctions endpoint that ranks non-expired Active auctions by accepted bid count, ending time, and auction ID while preserving hidden-reserve privacy.
- Added authenticated Live Arena lobby participation with database-backed join/leave state, live participant counts, multi-tab-safe disconnect cleanup, and automatic scheduled-to-active Socket.IO broadcasts.
- Added authenticated Active Arena state snapshots with current price, minimum next bid, masked leader, chronological recent bids, participant count, remaining-time authority, seller bid eligibility, and derived reserve state without exposing private auction or bidder fields.
- Added dedicated `auction:extended` Socket.IO broadcasts for accepted anti-sniping bids with extension number, previous and updated deadlines, extension duration, and safe triggering-bid context.
- Added post-commit `auction:ended` Socket.IO broadcasts with Sold/Unsold status, final price, bid count, reserve result, completion time, and a masked winner for successful auctions.
- Documented and verified the Docker-based PostgreSQL development environment, including Compose validation, persistent-volume-safe restarts, Prisma migration checks, API database health verification, and destructive reset guidance.
- Added the CBeave web frontend foundation with centralized API requests, refresh-session restoration, TanStack Query, authenticated Socket.IO setup, and Figma-aligned local, Google, and Facebook authentication screens.
- Added responsive public auction discovery and detail pages with hot, scheduled, active, and recent-result sections, runtime response validation, loading/error/empty states, and hidden-reserve-safe public data.
- Added responsive authenticated profile editing with prefilled account data, validated JPEG, PNG, and WebP avatar uploads, immediate shared-header refresh, required and optional field validation, nullable-field clearing, and persistent updates.
- Added a responsive authenticated seller auction workflow with validated draft creation and editing, active-category selection, local-time scheduling, Cloudinary image upload and deletion, primary-image handling, publication readiness guidance, and public-detail redirection after publication.
- Added a responsive authenticated watchlist with auction-detail watch controls, persistent idempotent add/remove behavior, cursor-based loading, direct list removal, empty/error/loading states, and shared-header navigation.
- Added responsive authenticated web bidding with exact client-side money validation, server-authoritative accepted-bid feedback, masked public bid history, and auction-room real-time updates across browser tabs.
- Added a responsive authenticated Live Arena lobby with a scheduled countdown, live participant counts, reconnect-safe room participation, and automatic transition into the active auction state without a page refresh.
- Added a responsive authenticated Active Arena with server-authoritative price and bid state, masked current leader and recent activity, live participant counts, remaining-time countdown, seller bid protection, reserve-state updates, and accepted bidding through the arena.
- Added live sudden-death extension feedback with runtime-validated Socket.IO events, extension numbering, triggering-bid context, exact extension duration, previous and updated deadlines, countdown refresh, and persistent arena extension counts.
- Added responsive Live Arena Sold and Unsold result views with post-commit Socket.IO updates, refresh-safe persisted results, final price, accepted-bid count, reserve outcome, completion time, and masked winner identity.
- Added a responsive authenticated notification center with All/Unread filtering, unread header indicators, idempotent read controls, auction navigation, cursor-based loading, and verified Outbid, Auction Won, Seller Result, and Cancellation presentation; also replaced the temporary web brand mark with the supplied CBeave wordmark and tightened the mobile header layout.
- Added responsive administrator user management with role-protected routing, status filtering, cursor-based loading, audited suspension and reactivation, required audit notes, confirmation controls, query refresh, and mobile-friendly account cards.
- Added authenticated seller-owned auction management with status filtering, cursor pagination, draft resumption, responsive shared-header navigation, and ownership-safe soft deletion of Draft auctions with Cloudinary image cleanup.
- Added seller-owned Scheduled auction cancellation with validated reasons, ownership, state, and no-bid protections, idempotent lifecycle events, affected-watcher notifications, and immediate responsive My Auctions refresh.
- Added responsive administrator auction management with administrator-only status-filtered listing, cursor-based loading, public-detail navigation, Scheduled and Active cancellation forms, immediate query refresh, and audited lifecycle, action, and notification persistence.
- Added responsive administrator category management with administrator-only full-tree browsing, root and child creation, category editing, activation and deactivation controls, inactive-parent protection, public-category cache refresh, audited actions, and mobile-friendly hierarchical cards.
- Added responsive administrator audit history with administrator-only routing, action-type filtering, newest-first cursor pagination, typed user, auction, and category targets, audit notes, timestamps, and mobile-friendly action cards.
- Improved Facebook OAuth cancellation by returning denied consent to the web login screen with a friendly message while preserving OAuth state validation.

### Documentation

- Reorganized project documentation into versioned requirements and architecture folders.
- Added an approved one-month SRS and requirements traceability matrix.
- Added a consolidated architecture decision record for the core domain.
- Added editable Version 1 and future-state DBML diagrams.
- Added a four-week delivery roadmap and repository module map.
- Refreshed the project status, roadmap checkpoint, module map, API and web setup guides, traceability headings, and example Docker database connection before frontend implementation; also replaced the starter's build-time Google font dependency and placeholder metadata.

### Changed

- Streamlined the web authentication experience with direct marketplace redirects after local or social sign-in, a non-stale authenticated `/auth` transition, and a dismissible account menu with Profile and resilient Sign out actions.
- Clarified that Guest is an unauthenticated state, while persisted roles are `USER` and `ADMIN`.
- Clarified that one normal user account can both buy and sell.
- Restricted administrator accounts from marketplace selling and bidding.
- Normalized auction terminal states to `SOLD` and `UNSOLD`.
- Made minimum bid increment mandatory.
- Defined Preview as a frontend step and Publish as a command.
- Replaced persisted `user_profiles.full_name` with required `first_name` and optional `last_name`; full name is derived while `display_name` remains the public identity.
- Included Google and Facebook as the Version 1 social authentication providers.
- Added Watchlist, in-app notifications, and bounded Live Arena polish to the one-month scope.
- Deferred forgot-password recovery and external reset-email delivery; removed `password_reset_tokens` and `RESET_PASSWORD` from the Version 1 data model while retaining them in the future-state reference.
- Simplified Version 1 administrator audit actions by deferring auction reinstatement and replacing destructive category deletion with category deactivation.
- Simplified Version 1 refresh sessions by deferring IP-address and user-agent metadata to the future-state model.
- Removed redundant Version 1 `reserve_met_at`; reserve state is derived from accepted-bid data and broadcast to the Live Arena without exposing the reserve amount.
- Deferred administrator-curated Featured Auctions and removed `is_featured` from the Version 1 model while retaining the concept in the future-state reference.
- Added a simple Version 1 Hot Auctions discovery rule based on accepted `bid_count`, with deterministic deadline and auction-ID tie-breaking.
- Simplified bid persistence to accepted bids only; removed persisted bid status and rejection-reason fields.
- Simplified Live Arena participation to `JOINED` and `LEFT` states; RSVP is deferred.
- Deferred user-submitted auction reports and administrator report resolution; retained emergency administrator auction cancellation with an audit record.
- Removed Version 1 JSON payload columns from notifications and auction events, and changed the event sequence identifier to an auto-incrementing integer.
- Required every persisted notification to reference an auction while keeping its bid reference optional.
- Deferred Buy Now, payments, shipping, messaging, reviews, storefronts, native applications, PWA support, and advanced analytics.
- Hardened public auction discovery and detail queries to exclude incomplete records that lack required lifecycle timestamps or a primary image.

> This entry records approved documentation and scope changes. It does not claim that application features are already implemented.
