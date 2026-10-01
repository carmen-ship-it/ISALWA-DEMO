# PRE-UAT — Cliente 360 null freshness fix

**Date:** 2026-08-27  
**Mode:** Targeted UI fix only (`apps/os-web`)  
**Ticket:** UI-PREUAT-1  
**Gate:** **CLOSED**

---

## Root cause

`loadCliente360` accessed `freshness.isStale` without null checks. The query port contract returns `ProjectionFreshness | null` (`OsProjectionStorePort.getFreshness`), and empty commercial/work lists legitimately return `"freshness": null` when no consumer checkpoint exists. That threw a TypeError and the Cliente 360 page rendered “No se pudo cargar la información” even though the party was valid.

---

## Null freshness contract

**VALID** — not a backend defect.

Evidence:

- `packages/os-query/src/projection-store-port.ts` → `getFreshness(...): Promise<ProjectionFreshness | null>`
- Live Step17 empty lists: `GET /v1/opportunities|quotes|orders|work-items` return `freshness: null`
- `StaleProjectionBanner` already accepted `freshness?: ProjectionFreshness | null`

---

## Fix

| File | Change |
|------|--------|
| `lib/query/projection-freshness.ts` | **Added** — `isProjectionStale()` treats null/undefined as not stale |
| `lib/cliente/load-cliente-360.ts` | Aggregate stale flag via null-safe helper |
| `lib/commercial/types.ts` | List/detail `freshness` typed as `ProjectionFreshness \| null` |
| `lib/work/types.ts` | Same for work/approval/attention responses |
| `lib/party/types.ts` | Party search freshness nullable |
| `app/(app)/inicio/page.tsx` | Same null-safe stale aggregate (typecheck follow-on) |
| `lib/cliente/load-cliente-360.test.ts` | **Added** — focused null / present / mixed cases |

Null freshness → no stale banner, no fake “fresh”, honest empty sections.

---

## Tests

```
npx pnpm@9.15.4 --filter @isalwa/os-web test
npx pnpm@9.15.4 --filter @isalwa/os-web typecheck
npx pnpm@9.15.4 --filter @isalwa/os-web build
```

| Check | Result |
|-------|--------|
| Unit tests | **126/126 PASS** (includes new null-freshness suite) |
| Typecheck | **PASS** |
| Build | **PASS** |

Covered:

1. freshness null + empty opportunities  
2. null + empty quotes  
3. null + empty orders  
4. null + empty work  
5. freshness present + isStale=false  
6. freshness present + isStale=true  
7. one null section does not break populated opportunities  

---

## Live recheck

URL: `http://localhost:3200/clientes/01M11MEJ9BGGDR0PVYG01FKG7C`  
Auth: DEV session (Step17 admin)

| Check | Result |
|-------|--------|
| Cliente Step17 S.A. loads | **PASS** |
| Clientes list | **PASS** |
| Empty oportunidades / cotizaciones / pedidos / trabajo | Honest empty copy — **PASS** |
| Historial present | **PASS** |
| Error surface / TypeError | **Absent** |
| Forced stale banner on null | **NOT shown** |

Note: After `next build`, turbopack `.next` was cleared and os-web restarted for live verify.

---

## Backend changes

**NONE**

## Cross-lane change request

**NO**

---

## Limitations

- Does not create commercial projection checkpoints; null remains valid until outbox/projections write freshness rows.
- Does not re-run full human UAT or UI-LIVE suites.
- Open-work fixture for Workforce B8a still separate from this fix.

---

## Carmen handoff

### DEFECT
CLOSED

### NULL FRESHNESS CONTRACT
VALID

### CLIENTE 360
PASS

### COMMERCIAL HUMAN UAT
READY (environment + this fix; open-work B8a still optional for workforce)

### BACKEND CHANGES
NONE
