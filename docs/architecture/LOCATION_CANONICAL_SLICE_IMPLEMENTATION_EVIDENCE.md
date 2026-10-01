# Location Canonical Slice — Implementation Evidence

**Phase:** Canonical OS Location (Party-owned geography)  
**Date:** 2026-09-13  
**Gate result:** **PASS** (Postgres integration verified)

**Rule:** **VERIFIED** requires reproducible Postgres/runtime evidence in this document.

---

## Gate decision

| Criterion | Status | Notes |
|-----------|--------|-------|
| Canonical `OsLocation` (not legacy `AccountLocation`) | PASS | `os_locations`; Party FK + org tenant |
| Multiple locations per Party | PASS | Integration test |
| Optional lat/lng | PASS | Nullable columns |
| Short Maps URL without coords | PASS | `provenanceUrl` only; no geocode |
| Create / Update / Deactivate commands | PASS | `master_data.admin` |
| Events + audit + outbox on success | PASS | Atomic with command tx |
| None on validation failure | PASS | Inactive party / missing party |
| Cross-tenant read denied (no leak) | PASS | Org-scoped `findFirst` → null / NOT_FOUND |
| Cross-tenant write denied | PASS | Foreign party → NOT_FOUND; wrong actor → TENANT_FORBIDDEN |
| Map UI | **NOT IN SCOPE** | Deferred |
| Real XLS import | **NOT IN SCOPE** | Deferred |
| Territory assignment | **NOT IN SCOPE** | Deferred |
| PostGIS | **NOT IN SCOPE** | Not required |

---

## Package map

| Package / path | Purpose | Status |
|----------------|---------|--------|
| `packages/os-contracts` | Location commands, events, scopes | IMPLEMENTED |
| `packages/os-party` | `LocationCommandService` + store port methods | IMPLEMENTED + TESTED |
| `packages/os-database` | Prisma `os_locations`, `PrismaOsPartyStore` location methods | IMPLEMENTED + VERIFIED |
| `apps/os-api` | Commands + `GET` reads | INTEGRATED |

**Migration:** `20260913140000_os_location`

---

## Model

| Field | Notes |
|-------|-------|
| `id` | ULID |
| `organizationId` | Authoritative tenant boundary |
| `partyId` | Owning Party (same org) |
| `label` | Required |
| `addressText` | Optional |
| `latitude` / `longitude` | Optional pair; both null allowed |
| `provenanceUrl` | Optional; Google Maps / short link — **not** canonical geography |
| `status` | `active` \| `inactive` |
| `version` | Optimistic concurrency |
| `createdAt` / `updatedAt` | Timestamps |

**Semantics:** Coordinates belong to OS. `provenanceUrl` is intake provenance only. Do not geocode or expand short URLs in this slice.

---

## Commands

| Command | Scope | Event |
|---------|-------|-------|
| `CreateLocation` | `master_data.admin` | `location.created` |
| `UpdateLocation` | `master_data.admin` | `location.updated` |
| `DeactivateLocation` | `master_data.admin` | `location.deactivated` |

Path: `POST /v1/commands/:commandName` with `Idempotency-Key` header. Tenant from session — never from payload `organizationId`.

---

## Reads

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/parties/:partyId/locations` | Lists locations for Party in session org; Party missing → `NOT_FOUND` |
| GET | `/v1/locations/:locationId` | Single location in session org; missing → `NOT_FOUND` |

---

## Apply migration

```bash
export OS_DATABASE_URL="postgresql://…"
pnpm --filter @isalwa/os-database migrate:deploy
pnpm --filter @isalwa/os-database prisma:generate
```

---

## Verification

```bash
export OS_DATABASE_URL="postgresql://…"
pnpm --filter @isalwa/os-database exec node --import tsx --test --test-concurrency=1 \
  src/location-prisma.integration.test.ts
```

**Result (2026-09-13):** 11/11 pass.

---

## Handoff — extend later

1. **XLS importer:** create Party then `CreateLocation` with `provenanceUrl` (short links OK without coords); offline parse of full Maps URLs can fill lat/lng later — never call Google in intake without a new approved slice.
2. **Map UI:** read `GET /v1/parties/:partyId/locations` and/or org-wide query (future); plot only rows with non-null coordinates.
3. **Territory:** do not assign territory on Location until a separate scope/policy slice.

---

## Explicit non-claims

- Map **not** implemented  
- Real XLS import **not** implemented  
- Legacy `AccountLocation` is **not** OS source of truth  
