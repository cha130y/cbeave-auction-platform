# CBeave Web

Next.js App Router frontend for the CBeave auction platform.

## Current state

The application now includes the shared frontend foundation and the first production-facing feature slice.

Implemented foundation:

- Validated public environment configuration
- Centralized API requests with normalized NestJS errors
- Memory-only access-token handling and HttpOnly refresh-session restoration
- TanStack Query application state
- Authenticated Socket.IO client setup
- React Hook Form and Zod validation
- Responsive Figma-aligned local, Google, and Facebook authentication
- Local registration supporting required first names and optional last names

The next UI delivery phases include:

- Public auction discovery and details
- Seller draft, image, preview, and publication workflows
- Scheduled lobby and real-time Live Arena
- Watchlist, notifications, and profile management
- Administrator user, category, auction, and audit screens

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
