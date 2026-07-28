# Docker development environment

The development Compose configuration provides PostgreSQL 17 for the CBeave API.

## Prerequisites

- Docker Desktop
- Node.js
- pnpm

Run all commands from the repository root.

## Validate the Compose configuration

```bash
docker compose -f infra/docker/compose.dev.yml config
```
