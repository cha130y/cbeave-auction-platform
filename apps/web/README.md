# CBeave Web

Next.js App Router frontend for the CBeave auction platform.

## Current state

The application currently contains the base Next.js and Tailwind CSS scaffold. Frontend foundation and feature integration are the next delivery phase.

The target experience includes:

- Registration and local/social login
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
