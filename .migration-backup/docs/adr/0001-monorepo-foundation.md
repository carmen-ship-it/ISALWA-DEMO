# ADR 0001 — Monorepo foundation stack

## Status

Accepted — Milestone 1

## Context

ISALWA OS must support a multi-squad engineering organization, premium web UX, provider-swappable integrations, and a single production data model used by both demo and live modes.

## Decision

- pnpm workspaces + Turborepo
- Next.js App Router for `apps/web`
- NestJS for `apps/api`
- Shared packages: `ui`, `contracts`, `providers`, `database`, `domain`, `flags`, `ts-utils`
- PostgreSQL + PostGIS (compose provided); Prisma skeleton in M1
- Provider ports with mock implementations first
- Design tokens as CSS variables in `@isalwa/ui`

## Consequences

- Features must land as domain modules + UI experiences on this skeleton
- Live vendor SDKs arrive as adapters only
- Full schema and seed universe are Milestone 2+
