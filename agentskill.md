---
name: work-on-cbeave-auction-platform
description: Implement, review, debug, test, or document changes in the CBeave real-time auction platform pnpm monorepo. Use for work involving the Next.js marketplace, NestJS REST or Socket.IO API, Prisma/PostgreSQL data model, authentication, auction lifecycle, bidding, watchlists, notifications, administration, Docker development environment, or project requirements and traceability.
---

# Work on CBeave

## Establish context

- Work from the repository root and use `pnpm`.
- Read `README.md`, `docs/architecture/MODULE_MAP.md`, and the files nearest the requested change before editing.
- Consult `docs/requirements/SRS-v1.1.md` and `docs/requirements/REQUIREMENTS_TRACEABILITY.md` for requirement-sensitive behavior.
- Consult `docs/architecture/adr/0001-core-domain-decisions.md` for identity, auction, pricing, bidding, and scope decisions.
- Treat `apps/api/prisma/schema.prisma` plus committed migrations as the executable database source of truth.
- Treat current source code as more current than status prose in documentation. Reconcile meaningful behavior changes in the relevant documentation.
- Check `git status` before editing. Preserve user changes and avoid modifying unrelated files.

## Respect the delivery boundary

Implement the Version 1 auction journey:

`DRAFT -> SCHEDULED -> ACTIVE -> SOLD | UNSOLD`

Allow cancellation only from the states and roles already supported by the application. Treat preview as a frontend workflow and publish as a command, not as persisted statuses.

Keep these Version 1 rules intact:

- Let one `USER` account sell and bid, but never bid on its own auction.
- Restrict marketplace creation and bidding to `USER`; reserve governance actions for `ADMIN`.
- Support local, Google, and Facebook authentication without linking social identities solely by an unverified matching email.
- Keep reserve price private and derive whether it has been met.
- Require idempotency for accepted bid requests.
- Apply bid creation, price/count updates, extensions, events, and related notifications atomically.
- Extend auctions by two minutes for bids in the final two minutes, at most five times.
- Persist only accepted bids.
- Deactivate referenced categories instead of deleting them.

Do not introduce deferred domains unless the task explicitly changes scope: password recovery, external email delivery, user auction reports, payments, orders, shipping, payouts, disputes, messaging, reviews, storefronts, native apps, PWA features, or advanced analytics.

## Follow the repository architecture

### API

Keep NestJS domains under `apps/api/src/<domain>`.

- Keep controllers thin: parse and validate transport input, enforce guards and roles, then call services.
- Put business rules and Prisma access in services. Do not access Prisma from controllers.
- Use DTOs with `class-validator` for HTTP input and explicit response DTOs for output.
- Use internal input types under `types/` so service contracts do not depend on transport decorators.
- Define narrow Prisma `select` objects under `queries/`.
- Convert selected records with pure mappers under `mappers/`.
- Use Nest exceptions with safe, actionable messages.
- Validate UUID route parameters with `ParseUUIDPipe` where applicable.
- Place static routes before conflicting dynamic `:id` routes.
- Represent money at the API boundary as validated decimal strings. Use `Prisma.Decimal` for calculations and serialize monetary responses with fixed decimal precision.
- Use database transactions for multi-record invariants. Preserve optimistic concurrency through `rowVersion` where existing workflows rely on it.
- Use serializable transactions and translate known Prisma conflicts for race-sensitive bidding behavior.
- Record lifecycle and administrative changes in the existing event or audit model.
- Keep WebSocket authorization and room membership in the bidding gateway/services. Broadcast only after the database transaction succeeds.

The API uses a global `ValidationPipe` with transformation, whitelisting, rejection of unknown fields, and first-error behavior. Do not depend on undeclared request properties.

### Web

Keep Next.js App Router routes under `apps/web/src/app` and feature code under `apps/web/src/features/<feature>`.

- Keep feature API calls in `api/`, TanStack Query hooks and keys in `queries/`, runtime response contracts in `schemas/`, and composed UI in `components/`.
- Use the `@/*` alias for imports from `apps/web/src`.
- Parse untrusted API responses with Zod before returning typed data to components.
- Send HTTP requests through `src/lib/api/api-client.ts` so credentials, bearer tokens, refresh deduplication, and error handling stay consistent.
- Use TanStack Query for server state. Define stable query-key factories and invalidate the narrowest shared key after mutations.
- Mark browser-dependent modules with `'use client'`.
- Keep access tokens in the existing in-memory token store; keep refresh authentication in the HTTP-only cookie flow.
- Reuse shared layout, brand, and utility components before adding duplicates.
- Preserve accessibility, responsive behavior, loading states, empty states, and recoverable error states.
- Use the existing auction Socket.IO client for live state rather than opening an unrelated connection.

Do not import Prisma-generated types into the web app. Put stable cross-application REST and WebSocket contracts in `packages/contracts` when sharing becomes useful.

### Database

- Edit `apps/api/prisma/schema.prisma` for model changes.
- Create and commit a Prisma migration; never patch a shared database manually.
- Regenerate the Prisma client after schema changes.
- Update Version 1 DBML and requirement traceability in the same change when the data model or traced behavior changes.
- Preserve UUID identifiers, UTC timestamps, soft-delete filters, deterministic ordering, unique idempotency constraints, and indexes supporting access paths.
- Never expose password hashes, refresh-token hashes, private reserve amounts, OAuth secrets, or Cloudinary secrets.

## Implement changes vertically

1. Identify the requirement, route/event contract, authorization rule, and persistence impact.
2. Trace the existing path through page or controller, schema or DTO, API/service, mapper, Prisma query, and database model.
3. Make the smallest coherent end-to-end change.
4. Add or update tests at the layer where the behavior lives.
5. Update contracts, traceability, DBML, changelog, or operational docs when behavior changes.
6. Run focused checks first, then broader checks appropriate to the change.

## Use project commands

Run from the repository root unless noted:

```bash
pnpm dev:web
pnpm dev:api
pnpm build
pnpm test
pnpm lint

pnpm --dir apps/api test
pnpm --dir apps/api test:e2e
pnpm --dir apps/api prisma:validate
pnpm --dir apps/api prisma:generate
pnpm --dir apps/api prisma:migrate:dev

pnpm --dir apps/web lint
pnpm --dir apps/web build

docker compose -f infra/docker/compose.dev.yml config
docker compose -f infra/docker/compose.dev.yml up -d postgres
```

Note that the API `lint` script includes `--fix`; inspect its diff and do not retain unrelated formatting changes.

Copy environment templates only when local execution requires them:

- `apps/api/.env.example` -> `apps/api/.env`
- `apps/web/.env.example` -> `apps/web/.env.local`

Use PostgreSQL on `127.0.0.1:5434`, the API on `http://localhost:3001`, and the web app on `http://localhost:3002` unless configuration explicitly overrides them.

## Verify proportionally

- For API business logic, add focused Jest service tests with dependencies mocked or controlled.
- For controllers and validation, test transport behavior and authorization boundaries.
- For Prisma behavior, verify migrations and transaction-sensitive paths against PostgreSQL when practical.
- For web data work, test Zod parsing, query behavior, mutations, and visible states.
- For live bidding, verify REST state, Socket.IO events, idempotency, concurrent bids, anti-sniping, and post-transaction broadcasts.
- For schema changes, run Prisma validation, generation, migration checks, API tests, and relevant end-to-end coverage.
- For cross-app changes, build both apps and exercise the full user journey affected.

Do not claim a check passed unless it ran successfully. Report skipped checks and the reason.

## Finish cleanly

- Review the final diff for secrets, unrelated edits, generated noise, unsafe logs, and accidental scope expansion.
- Preserve public API and event compatibility unless the task explicitly authorizes a breaking change.
- Summarize the outcome, notable design decisions, files changed, and verification performed.
- Flag remaining risks or follow-up work without presenting deferred scope as completed.
