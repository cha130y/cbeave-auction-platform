# CBeave Web

Next.js App Router frontend for the CBeave auction platform.

## Current state

The application now includes the shared frontend foundation and the core marketplace workflows.

Implemented frontend slices:

- Scheduled Live Arena lobby with countdown, live participant counts, reconnect handling, and automatic auction-start transition
- Validated public environment configuration
- Centralized API requests with normalized NestJS errors
- Memory-only access-token handling and HttpOnly refresh-session restoration
- TanStack Query application state and authenticated Socket.IO connectivity
- Responsive local, Google, and Facebook authentication
- Public auction discovery, hot-auction ranking, details, and completed results
- Authenticated profile editing with validated avatar uploads and immediate shared-header refresh
- Seller draft creation, owned-auction listing, status filtering, draft resumption, editing, image management, publication, Draft deletion, and validated Scheduled cancellation
- Authenticated watchlist management
- Authenticated bid placement with exact money validation
- Public masked bid history with cursor pagination
- Auction-room real-time bid updates across browser tabs
- Active Live Arena with authoritative auction state, live participant counts, masked bid activity, remaining-time countdown, seller bid protection, reserve-state updates, and accepted bid placement
- Live sudden-death feedback with triggering-bid context, previous and updated deadlines, extension counts, and automatic countdown updates
- Live Arena Sold and Unsold result views with immediate Socket.IO updates, refresh-safe persisted results, final auction facts, and masked winner identity
- Authenticated notification center with unread filtering, read tracking, auction navigation, cursor-based loading, and a shared-header unread indicator
- Administrator user management with status filtering, cursor-based loading, audited suspension/reactivation, confirmation forms, and responsive account cards
- Administrator auction management with status filtering, cursor-based loading, public-detail navigation, audited Scheduled and Active cancellation, confirmation forms, and responsive auction cards
- Administrator category management with root and child hierarchy browsing, category creation and editing, activation controls, parent-state protection, immediate query refresh, and responsive category cards
- Administrator audit history with action-type filtering, cursor-based loading, administrator identity, typed action targets, audit notes, timestamps, and responsive action cards

Remaining frontend delivery phases:

## Local development

Run commands from the repository root.

Install workspace dependencies:

```bash
pnpm install
```

Start the API and web application in separate terminals:

```bash
pnpm dev:api
```

```bash
pnpm dev:web
```

Open `http://localhost:3000`. The API runs at `http://localhost:3001`.

## Quality checks

```bash
pnpm --dir apps/web lint
pnpm --dir apps/web test
pnpm --dir apps/web build
```

## Frontend architecture target

- Route groups separate authentication, marketplace, dashboard, and administration experiences.
- A shared API layer handles the API base URL, credentials, normalized errors, and access-token use.
- TanStack Query manages server state and cache invalidation.
- React Hook Form and Zod manage client-side forms and validation.
- Socket.IO integrates Live Arena room participation and auction events.
- Stable shared REST and WebSocket contracts belong in `packages/contracts`.
- Prisma-generated types must not be imported into the web application.

See `../../docs/architecture/MODULE_MAP.md` and `../../docs/requirements/REQUIREMENTS_TRACEABILITY.md` before adding feature routes.
