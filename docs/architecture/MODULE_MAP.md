# Module Map

## Web application — `apps/web`

The routes below are implemented. Each one is a thin App Router page that renders a screen from the feature module beside it.

| Area | Route | Feature module |
|---|---|---|
| Sign in and registration | `app/(auth)/auth` | `features/auth` |
| Social sign-in callback | `app/(auth)/auth/callback` | `features/auth` |
| Auction discovery | `app/(marketplace)` | `features/auctions` |
| Auction details | `app/(marketplace)/auctions/[auctionId]` | `features/auctions`, `features/bidding`, `features/watchlists` |
| Live Arena | `app/(marketplace)/auctions/[auctionId]/live` | `features/live-arena`, `features/bidding` |
| Create auction | `app/(marketplace)/sell` | `features/auctions` |
| Seller auctions | `app/(marketplace)/sell/auctions` | `features/auctions` |
| Auction draft | `app/(marketplace)/sell/[auctionId]` | `features/auctions` |
| Edit auction draft | `app/(marketplace)/sell/[auctionId]/edit` | `features/auctions` |
| Watchlist | `app/(marketplace)/watchlist` | `features/watchlists` |
| Notifications | `app/(marketplace)/notifications` | `features/notifications` |
| Profile | `app/(marketplace)/profile` | `features/profile` |
| Administration | `app/(marketplace)/admin/{actions,auctions,categories,users}` | `features/admin` |

Inside a feature module, keep API calls in `api/`, TanStack Query hooks and keys in `queries/`, runtime response contracts in `schemas/`, and composed UI in `components/`. Shared building blocks live outside the features: `components/` for layout, brand, and form-control styles, and `lib/` for the API client, realtime client, schema primitives, and formatting helpers.

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

A domain larger than a single responsibility splits its services by that responsibility rather than growing one class. `auctions` is the worked example: `services/` holds catalog reads, owned auctions, drafts, images, publication, and scheduled lifecycle reconciliation, and the controller injects the one it needs. Supporting folders follow the same split — `dto/` for transport shapes, `types/` for internal service inputs, `queries/` for narrow Prisma selects, `mappers/` for record-to-response conversion, and `utils/` for shared rule checks.

## Shared contracts — `packages/contracts`

Add stable REST shapes, enums, and WebSocket event payloads here as frontend integration begins. Do not import Prisma-generated types directly into the web application.

## Database — `apps/api/prisma`

- `schema.prisma`
- `migrations/`

Apply schema changes through migrations. Never edit a shared or production database manually without a migration.

Demonstration data is seeded through `prisma:seed:demo` and `prisma:seed:users`.
