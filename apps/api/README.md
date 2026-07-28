# CBeave API

NestJS API for the CBeave auction platform.

## Implemented areas

- Email/password, Google, and Facebook authentication
- Current-user profile management and account-status enforcement
- Public and administrator category management
- Auction drafts, images, publication, discovery, lifecycle automation, and Hot Auctions
- Transactional bidding, masked public bid history, anti-sniping, and Socket.IO broadcasts
- Watchlists and in-app notifications
- Administrator user management, auction cancellation, and audit history
- PostgreSQL health checks and Cloudinary image storage

## Local setup

Run commands from the repository root.

Install workspace dependencies:

```bash
pnpm install
```

Create the local API environment file:

```bash
cp apps/api/.env.example apps/api/.env
```

Replace the placeholder JWT, OAuth, and Cloudinary values required by the features you are testing. The example database URL matches the PostgreSQL service in `infra/docker/compose.dev.yml`.

Start PostgreSQL and apply the committed migration:

```bash
docker compose -f infra/docker/compose.dev.yml up -d
pnpm --dir apps/api prisma:generate
pnpm --dir apps/api exec prisma migrate deploy
```

Start the API:

```bash
pnpm --dir apps/api start:dev
```

The API runs at `http://localhost:3001`.

## Health checks

```bash
curl http://localhost:3001/health
curl http://localhost:3001/health/database
```

## Quality checks

```bash
pnpm --dir apps/api lint
pnpm --dir apps/api build
pnpm --dir apps/api test
pnpm --dir apps/api test:e2e --runInBand
```

## Database commands

```bash
pnpm --dir apps/api prisma:validate
pnpm --dir apps/api exec prisma migrate status
pnpm --dir apps/api prisma:studio
```

Use Prisma migrations for schema changes. Do not modify a shared or production database manually.

## Related documentation

- `../../infra/docker/README.md`
- `../../docs/requirements/REQUIREMENTS_TRACEABILITY.md`
- `../../docs/architecture/MODULE_MAP.md`
