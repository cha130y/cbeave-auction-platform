# Changelog

All notable repository and product changes are documented here.

The format follows Keep a Changelog principles. Product releases will use semantic versioning once the application is deployable.

## [Unreleased]

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
- Limited Version 1 social authentication to Google login.
- Added Watchlist, in-app outbid notification, bounded Live Arena polish, and auction reporting to the one-month scope.
- Deferred forgot-password recovery and external reset-email delivery; removed `password_reset_tokens` and `RESET_PASSWORD` from the Version 1 data model while retaining them in the future-state reference.
- Simplified Version 1 administrator audit actions by deferring auction reinstatement and replacing destructive category deletion with category deactivation.
- Deferred Buy Now, payments, shipping, messaging, reviews, storefronts, native applications, PWA support, and advanced analytics.

> This entry records approved documentation and scope changes. It does not claim that application features are already implemented.
