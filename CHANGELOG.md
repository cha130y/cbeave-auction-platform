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

### Documentation

- Reorganized project documentation into versioned requirements and architecture folders.
- Added an approved one-month SRS and requirements traceability matrix.
- Added a consolidated architecture decision record for the core domain.
- Added editable Version 1 and future-state DBML diagrams.
- Added a four-week delivery roadmap and repository module map.

### Changed

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

> This entry records approved documentation and scope changes. It does not claim that application features are already implemented.
