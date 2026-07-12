# Planned Module Map

## Web application — `apps/web`

| Area | Suggested route/module |
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

| Domain | NestJS module |
|---|---|
| Identity | `auth`, `users` |
| Taxonomy | `categories` |
| Auction lifecycle | `auctions`, `auction-scheduler` |
| Real-time bidding | `bidding`, `auction-gateway` |
| Engagement | `watchlists`, `notifications`, `live-arena` |
| Governance | `reports`, `admin`, `audit` |
| Infrastructure | `prisma`, `storage`, `health` |

Controllers should call services/use cases, and only services/repositories should access Prisma.

## Shared contracts — `packages/contracts`

Keep shared REST DTO shapes, enums, and WebSocket event payloads here. Do not import Prisma-generated types directly into the web application.

## Database — `prisma`

- `schema.prisma`
- `migrations/`
- `seed.ts`

Apply schema changes through migrations. Never edit a shared or production database manually without a migration.
