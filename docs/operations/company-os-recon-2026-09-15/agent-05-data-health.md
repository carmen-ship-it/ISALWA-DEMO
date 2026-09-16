# Agent 05 — Data Health / Identity / Import / Export / KPI truth

**Pass:** Company OS reconciliation 2026-09-15  
**Agent:** 5 ONLY  
**Mode:** Read-only audit (no implementation)  
**Repo:** `.worktrees/wave2-remediation-integrate`  
**State vocabulary:** `LIVE` · `LIVE BUT PARTIAL` · `IMPLEMENTED` · `TESTED` · `BACKEND ONLY` · `PLANNED` · `MISSING` · `UNPROVEN` · `NOT DETECTED`

## Tenant isolation (hard rule)

| Label | Organization ID | Role in this audit |
|-------|-----------------|--------------------|
| **REAL** (seven-customer staging tenant) | `01M2DV9F0V5DXS4G89AKF4D5SR` | Read-only integrity / production-shaped data. Never mutate via fixture tools. |
| **SYNTH** (Wave 2 role fixtures) | `01M2JKF77TXMJNDTKNCYNHH9G5` | Synthetic personas / adversarial writes only. |

Evidence: `packages/os-database/src/staging-wave2-role-fixtures.test.ts`, `packages/os-database/src/staging-wave2-role-fixtures-guards.ts` (`assertNotRealTenant` → `REFUSING_TO_MUTATE_REAL_STAGING_TENANT`), `docs/architecture/WAVE2_STAGING_ROLE_FIXTURE_PLAN.md` (“Real seven customers”).

**Recommendations below never mix REAL and SYNTH populations, counts, or remediation playbooks.**

---

## 1. Data Health findings matrix

Surface: **Salud de datos** on Mapa — derives from loaded `PartySummaryReadModel[]` only. Does not write, merge, geocode, or pick winners.

| Finding | State | Detection | Paths | Notes |
|---------|-------|-----------|-------|-------|
| Missing phone | **LIVE BUT PARTIAL** | `primaryPhone === null` among loaded customers when location facts present | `apps/os-web/lib/party/data-health.ts` (`missing-phone`); UI `apps/os-web/app/(app)/mapa/page.tsx`; i18n `apps/os-web/lib/i18n/es.ts` | Population = `searchParties({ status: 'active', limit: 100 })` only. Partial list noted when `meta.hasMore`. |
| Missing contact (person/name without phone) | **NOT DETECTED** (as Data Health issue) | No `missing-contact` issue id | Cliente 360 composes contact separately: `apps/os-web/lib/party/next-action.ts` (`composePrimaryContact`); detail empty contacts UI `apps/os-web/app/(app)/clientes/[partyId]/page.tsx` | Phone gap ≠ contact gap. Contact absence is 360-local, not Salud de datos. |
| Missing location / coords | **LIVE BUT PARTIAL** | `hasCoordinates === false` | `data-health.ts` (`missing-location`); map buckets `apps/os-web/lib/map/build-view-model.ts` | Maps URL is **not** location. Boundary copy: `DATA_HEALTH_BOUNDARY`, `MAP_COVERAGE_LIMIT`. |
| Provenance without coords | **LIVE** | `hasCoordinates === false` + non-empty `locationProvenanceUrl` | `data-health.ts` (`provenance-not-location`); lists `apps/os-web/components/map/map-customer-lists.tsx`; banner `map-coverage-banner.tsx` | Honest “solo enlace” bucket. No geocode. |
| Shared provenance (identity conflict soft signal) | **LIVE** (review-only) | Same normalized Maps URL, no coords, ≥2 parties | `sharedProvenanceGroups` in `data-health.ts`; tone `manual` on Mapa | Explicitly does not choose winner / merge / geocode. |
| Shared phone (identity conflict soft signal) | **LIVE** (review-only) | Same trimmed `primaryPhone`, ≥2 parties | `sharedPhoneGroups` | Same non-resolving boundary. |
| Missing owner (commercial) | **LIVE BUT PARTIAL** | `hasCommercialAccount && commercialOwnerMemberId === null` | `data-health.ts` (`unassigned`) | Does **not** infer owner from cargo/title. |
| Duplicate mark | **LIVE BUT PARTIAL** | `duplicateStatus` ∈ `suggested` \| `pending_merge` | `data-health.ts` (`duplicate-review`); badge labels `apps/os-web/lib/party/labels.ts` | Surface flags; does not open merge workflow. |
| Missing display name | **LIVE** | empty `displayName.trim()` | `data-health.ts` (`missing-name`) | |
| Orphan work (open work without valid subject/owner path) | **MISSING** from Data Health | Work always requires `ownerMemberId` on create | Work model `packages/os-work/src/store-types.ts`; attention types `packages/os-query/src/work/attention-derivation.ts` (`open_work_assigned`, `overdue_work`, `reassigned_work`, `pending_approval`) | No “orphan work” issue in Salud de datos. Unowned commercial account ≠ orphan work item. |
| Identity conflict (hard NIT / fiscal) | **BACKEND ONLY** → UI **PARTIAL** | Matching NIT suggests duplicate candidate; no silent merge | Integration: `packages/os-database/src/party-prisma.integration.test.ts`; events `party.duplicate.suggested` in `packages/os-query/src/party/party-timeline-facts.ts`; timeline label `apps/os-web/lib/commercial/timeline-labels.ts` | Data Health only sees `duplicateStatus`, not conflict reason. |
| Stale assignment (owner member inactive / projection stale) | **MISSING** (Data Health) · **PARTIAL** elsewhere | Escalation notes inactive access; 360 notes stale projection | Escalation: `apps/os-web/lib/escalation/derive.ts` (`inactiveAccess`); 360: `stale_projection` in `next-action.ts` | Not a Salud de datos finding. Escalation does not reassign (`reassignsOwner: false`). |
| Manual awaiting confirmation | **LIVE** (ops fact lane, not Data Health) | Reported facts locked `source=manual`, `confirmation=pending` | `apps/os-web/lib/operations/reported-fact.ts`; contracts `packages/os-contracts/src/reported-operational-fact.ts`; finance desk provenance | Cannot confirm payment / ledger. Productivity gap: no unconfirmed-payments list (`apps/os-web/lib/productivity/not-implemented.ts` `unconfirmed-reported-payments`). |
| Terminated employee owning active work / accounts | **MISSING** as Data Health · **PARTIAL** escalation note | Escalation treats `suspended`\|`revoked`\|`terminated` as inactive access on suggested contact | `escalation/derive.ts`, `escalation/copy.ts`; workforce labels `apps/os-web/lib/workforce/labels.ts` | No scan that commercial `ownerMemberId` or work `ownerMemberId` points at terminated employment. **BUSINESS DECISION REQUIRED** for remediation rule. |
| Relationship gaps (party↔party / bill-to / related) | **MISSING** | No Party relationship aggregate found | Schema/commands: party graph is roles/contacts/fiscal/commercial — no `OsPartyRelationship` | Intake doc notes bill-to gap: `docs/data/CLIENT_DATA_INTAKE_MAPPING_PLAN.md`. |

**Boundary (product):** `DATA_HEALTH_BOUNDARY` — “Esta lectura no fusiona clientes, no elige cuál dato es correcto y no geocodifica.” Tests: `apps/os-web/lib/party/data-health.test.ts`.

**Population honesty:** Mapa loads **up to 100 active parties** for the **session tenant only**. Counts are not company-wide KPIs. Partial note when more exist (`pages.mapa.partialNote`).

**REAL vs SYNTH:** Hosted counts for REAL seven customers are **UNPROVEN** in this pass (no live DB query). Doc expectation for REAL pilot coverage: 2 plottable / 5 provenance-only / 7 total — `docs/operations/MAP_GEO_BOUNDARY.md`. SYNTH may differ; do not compare as one scorecard.

---

## 2. Party identity — Duplicate / Merge / Split

| Capability | State | Evidence | Gap |
|------------|-------|----------|-----|
| Duplicate candidate (NIT match) | **IMPLEMENTED** · **TESTED** (integration) · UI **LIVE BUT PARTIAL** | Store + `party.duplicate.suggested`; read model `duplicateStatus`; Salud flags review | No admin queue to resolve candidates by reason/confidence. |
| Request merge | **BACKEND ONLY** (API command) · **UI MISSING** | `RequestPartyMerge` in `packages/os-party/src/party-command-service.ts`; scopes `master_data.admin` (`packages/os-contracts/src/scopes.ts`); forbidden on customer self-service (`apps/os-web/lib/party/customer-self-service.ts`) | No os-web form/action for merge request. |
| Approve / reject merge | **BACKEND ONLY** · **UI MISSING** | `ApprovePartyMerge` / `RejectPartyMerge` (`org.admin`); lineage snapshot on approve; blocks two commercial accounts | Cliente 360 shows merged pointer only after fact (`mergedIntoPartyId` link). |
| Silent merge | **REFUSED** (by design) | Integration asserts two active parties after NIT collide | — |
| Split / unmerge | **MISSING** | No `SplitParty` / unmerge command in `packages/os-contracts/src/party-commands.ts` | Merge is one-way in command set. |
| Data Health as merge UI | **REFUSED** | Explicit action/boundary: “No se fusiona” | Correct. |

**Recommendation (tenant-safe):** Build merge ops UI only after operator walkthrough on **SYNTH**; any REAL merge is a governed `org.admin` decision with lineage — never bulk from Salud de datos.

---

## 3. Import Center vs engineering-governed import

| Surface | State | Paths |
|---------|-------|-------|
| Admin Import Center (upload / preview / column mapping UI) | **MISSING** | No route under `apps/os-web/app/(app)/administracion/` (only equipo, capacidades, accesos). No ImportCenter components. |
| Engineering-governed import package | **IMPLEMENTED** · **TESTED** (unit + prisma integration) · execute **GATED** | `packages/os-import/` — `ImportCommandService`: `DryRunClientImport`, `ValidateClientImport`, `ExecuteClientImport`, `ReverseImportBatch`, `GetImportBatchReceipt`; store models `OsImportBatch` / `OsImportRow` in schema.prisma; wired in `apps/os-api/src/os-store.module.ts` + `commands.controller.ts` |
| Real execute gate | **IMPLEMENTED** (fail-closed) | `OS_REAL_CLIENT_IMPORT_ENABLED === 'true'` else `IMPORT_DISABLED` (`packages/os-import/src/receipt.ts`, `import-command-service.ts`) |
| Mapping plan (design) | **PLANNED** doc (partially stale vs package) | `docs/data/CLIENT_DATA_INTAKE_MAPPING_PLAN.md` still says “no importer implemented” in header — **contradicts** `packages/os-import` existence. Treat plan as intake policy, package as code truth. |
| Staff section AuthIdentity | **BLOCKED by design** | Receipt `staff.blockedAuthCreates`; section A not executed as party create in execute path |
| Location on import | **IMPLEMENTED** (offline parse, no geocoder) | `packages/os-import` + `docs/operations/MAP_GEO_BOUNDARY.md` |

**Recommendation:** Do **not** recommend admin self-serve Import Center as next step without authority. Prefer keeping import engineering-governed. If REAL intake is ever enabled: dry-run receipts on **REAL** only with explicit approval + backup gate; fixture/adversarial imports stay on **SYNTH** only (`assertNotRealTenant`).

---

## 4. Exports (who / what / PII / tenant / audit)

| Export kind | State | Who | What | PII | Tenant | Audit |
|-------------|-------|-----|------|-----|--------|-------|
| Customer / party CSV or spreadsheet dump | **MISSING** | — | — | — | — | — |
| Work / attention / ops list export | **MISSING** | — | — | — | — | — |
| Audit log export / viewer download | **MISSING** in os-web/os-api controllers searched | BusinessEvent/AuditLog exist as write path elsewhere | No `/audit` export UI found under `apps/os-api` / `apps/os-web` | — | — | Writes exist; **export UI MISSING** |
| Quote PDF | **LIVE** (document render, not data export) | Session with quote access | Quote commercial document | Contact/name/lines may appear | Session org via API client | Command/event path of quote lifecycle; PDF route `apps/os-web/app/api/quotes/[quoteId]/pdf/route.ts`, button `quote-pdf-download-button.tsx` |
| Report builder | **MISSING** (explicit) | — | — | — | — | `productivity/not-implemented.ts` `report-builder` |

**Recommendation:** Any future export must be capability-scoped, tenant-filtered, PII-minimized, and audited. Do not prototype exports against REAL without a retention/PII decision.

---

## 5. KPI / Metric truth on dashboards

| Surface | State | Source of truth | Population | Real vs synthetic |
|---------|-------|-----------------|------------|-------------------|
| Inicio operator attention | **LIVE** (exception lists, not KPI cards) | Loaded work/attention read models | Session-scoped queues | Tests forbid fake KPI language (`apps/os-web/lib/work/inicio-attention.test.ts` bans `MetricCard`/`StatGroup`/SLA invent) |
| Management command center | **LIVE** (exception count) | Tenant-filtered exception records | `sameTenant` drop before count (`apps/os-web/lib/management/command-center.ts`) | Count null when denied — no leak |
| Executive command center | **LIVE** (exceptions only) | Overdue work, pending decisions, submitted quotes already loaded | Cap `EXECUTIVE_VISIBLE_LIMIT`; partial note | Lead: “No es un indicador ni un total de la empresa.” (`apps/os-web/lib/executive/command-center.ts`). Tests forbid revenue/KPI MetricCards. |
| Role homes | **LIVE** | Operating queues | Scope + coverage grants | `role-homes.test.ts` forbids revenue/margin/KPI copy |
| Mapa coverage StatGroup | **LIVE BUT PARTIAL** (honest coverage, not sales KPI) | Derived from same party search page | Up to 100 active parties; optional partial | Counts are location facts only. REAL pilot expected 2/7 plottable per `MAP_GEO_BOUNDARY.md` — **HOSTED BROWSER-VERIFIED UNPROVEN** here. SYNTH fixture orgs must not be reported as REAL coverage. |
| MetricCard company KPIs (revenue, stock, etc.) | **ABSENT BY DESIGN** | — | — | Multiple tests assert absence |

**Truth rules observed:** no invented coordinates; no confirmed payment from customer message; no company totals disguised as exceptions; synthetic fixture copy filtered (`isEngineeringFixtureCopy` in executive path).

---

## 6. Cross-cutting verdict

| Area | Verdict |
|------|---------|
| Data Health (Salud de datos) | **LIVE BUT PARTIAL** — strong honesty boundaries; limited issue catalog; capped population; no corrective actions. |
| Party Duplicate/Merge/Split | Duplicate **BACKEND+PARTIAL UI**; Merge **BACKEND ONLY**; Split **MISSING**. |
| Import | Engineering path **IMPLEMENTED/GATED**; Admin Import Center **MISSING**. |
| Exports | Quote PDF **LIVE**; bulk/PII/audit exports **MISSING**. |
| Dashboard KPIs | Exception-first **LIVE**; vanity/KPI MetricCards **ABSENT**; map coverage counts are the main numeric strip and are location-facts only. |

## 7. Safe next steps (no implementation in this pass)

1. **SYNTH only:** browser-verify Salud de datos issue list against fixture parties (phones, shared provenance, unassigned owner).  
2. **REAL only (read):** when hosted auth allows, confirm seven-customer coverage sentence matches `MAP_GEO_BOUNDARY` (2 de 7) without mutating.  
3. **Policy:** decide whether terminated-owner-of-active-work is an Attention signal or Data Health finding (**BUSINESS DECISION REQUIRED**).  
4. **Docs drift:** reconcile `CLIENT_DATA_INTAKE_MAPPING_PLAN.md` header with `packages/os-import` reality.  
5. Do **not** ship Import Center UI or CSV export until PII + audit + REAL gates are explicit.

---

*End Agent 05 receipt. No code changes beyond this file.*
