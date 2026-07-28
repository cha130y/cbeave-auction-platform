# Module Map

## Web application — `apps/web`

The web application is currently at the scaffold stage. These routes define the frontend implementation target.

| Area | Target route/module |
|---|---|
| Authentication | `app/(auth)` |
| Auction discovery | `app/(marketplace)` |
| Auction details and lobby | `app/auctions/[auctionId]` |
| Live Arena | `app/auctions/[auctionId]/live` |
| Seller dashboard | `app/dashboard/auctions` |
| Create/preview auction | `app/dashboard/auctions/new` |
| Watchlist | `app/watchlist` |
| Notifications | `app/notifications` |
| Profile | `app/profile` |
| Administration | `app/admin` |

## API application — `apps/api`

The API modules below are implemented.

| Domain | Current NestJS location |
|---|---|
| Identity | `auth`, `users` |
| Taxonomy | `categories` |
| Auction lifecycle and discovery | `auctions` |
| Transactional and real-time bidding | `bidding` |
| Engagement | `watchlists`, `notifications` |
| Governance and audit history | `admin` |
| Infrastructure | `database`, `health`, `infrastructure/cloudinary` |

Controllers should call services/use cases, and only services/repositories should access Prisma.

## Shared contracts — `packages/contracts`

Add stable REST shapes, enums, and WebSocket event payloads here as frontend integration begins. Do not import Prisma-generated types directly into the web application.

## Database — `apps/api/prisma`

- `schema.prisma`
- `migrations/`

Apply schema changes through migrations. Never edit a shared or production database manually without a migration.

Seed and demonstration data remain release-stabilization work.
