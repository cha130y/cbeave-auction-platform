# CBeave Documentation Index

## Requirements

- `requirements/CBeave-SRS-v1.0.pdf` — original approved baseline
- `requirements/SRS-v1.0.md` — Markdown baseline retained for history
- `requirements/SRS-v1.1.md` — approved implementation scope for the one-month project
- `requirements/SRS_CHANGELOG.md` — requirement-level differences
- `requirements/REQUIREMENTS_TRACEABILITY.md` — requirement to data/module/test mapping

## Architecture

- `architecture/adr/0001-core-domain-decisions.md` — accepted domain decisions
- `architecture/erd/v1/` — implementation target
- `architecture/erd/future/` — future-state reference only
- `architecture/erd/comparison.md` — scope comparison

The implemented Prisma schema and committed migrations under `apps/api/prisma/` are the executable database source of truth. The Version 1 DBML remains the documentation model, and the future-state DBML remains reference-only.

Use `requirements/REQUIREMENTS_TRACEABILITY.md` to track implementation and verification progress. Use `architecture/MODULE_MAP.md` for the current backend structure and the target frontend structure.
