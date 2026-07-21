# CBeave Auction Platform

CBeave is a production-oriented, real-time online auction platform where one standard user account can both sell items and bid on other users' auctions. The project is designed as a responsive web application with scheduled auctions, real-time bidding, anti-sniping, watchlists, in-app notifications, focused administration, and an immersive Live Arena.

## Delivery target

The current milestone is intentionally limited to a complete auction journey:

```text
Register / Google / Facebook login
        → Create auction draft
        → Preview and publish
        → Scheduled auction lobby
        → Live real-time bidding
        → Anti-sniping extension
        → Sold / Unsold result
        → Winner and seller notifications
```

The agreed delivery scope also includes:

- Google and Facebook login
- Watchlist
- In-app outbid notification
- Polished but bounded Live Arena
- Basic administrator user/category management and emergency auction cancellation

Auction reporting, password recovery, payments, shipping, messaging, reviews, storefronts, native applications, PWA support, and advanced analytics are explicitly deferred.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS |
| Frontend validation | React Hook Form, Zod |
| Server state | TanStack Query |
| Backend | NestJS, TypeScript, REST API, WebSockets |
| Backend validation | `class-validator` |
| Database | PostgreSQL, Prisma ORM |
| Authentication | JWT, email/password, Google OAuth, Facebook OAuth |
| Deployment | Docker |

## Repository structure

```text
apps/
  web/                    Next.js application
  api/                    NestJS application
packages/
  contracts/              Shared API and WebSocket contracts
  config/                 Shared TypeScript/lint configuration
apps/api/prisma/           Prisma schema and migrations
infra/docker/              Docker and local infrastructure
tests/e2e/                 Cross-application end-to-end tests

docs/
  requirements/           Versioned SRS and traceability
  architecture/adr/       Accepted architecture decisions
  architecture/erd/       Version 1 and future-state ER diagrams
```

The web and API scaffolds live under `apps/`; shared contracts and configuration can be added incrementally under `packages/` as implementation progresses.

## Canonical auction lifecycle

```text
DRAFT → SCHEDULED → ACTIVE → SOLD
                         └→ UNSOLD
DRAFT / SCHEDULED ───────→ CANCELLED
```

`Preview` is a frontend workflow step. `Publish` is an application command that changes a draft into `SCHEDULED` or `ACTIVE`; neither is stored as an auction status.

## Documentation

- [Approved one-month SRS](docs/requirements/SRS-v1.1.md)
- [SRS change log](docs/requirements/SRS_CHANGELOG.md)
- [Requirements traceability](docs/requirements/REQUIREMENTS_TRACEABILITY.md)
- [Core architecture decision](docs/architecture/adr/0001-core-domain-decisions.md)
- [Version 1 ERD](docs/architecture/erd/v1/cbeave-erd-v1.dbml)
- [Future-state ERD](docs/architecture/erd/future/cbeave-erd-full.dbml)
- [One-month roadmap](PROJECT_ROADMAP.md)
- [Repository change log](CHANGELOG.md)

## Current status

**Planning complete; implementation-ready.**

The Version 1 requirements and data model are frozen for the delivery window. New features should be added only after the core auction flow is working end to end.
