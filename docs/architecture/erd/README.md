# CBeave Entity-Relationship Diagrams

## Implementation target

`v1/cbeave-erd-v1.dbml` is the approved one-month database design. Import it into dbdiagram.io for interactive review.

## Future-state reference

`future/cbeave-erd-full.dbml` documents possible later domains. It is not an instruction to create all tables during Version 1.

## Source-of-truth rule

1. `apps/api/prisma/schema.prisma` plus migration history is the executable source of truth.
2. `v1/cbeave-erd-v1.dbml` is the synchronized review representation of that schema.
3. A pull request that changes persistent data must update Prisma migration, DBML, SRS/ADR when behavior changes, and the traceability matrix.
