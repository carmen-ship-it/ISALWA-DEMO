# CR-7 gap receipt — Cliente360 · Inicio · Map (V1 canonical consolidation)

**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo`  
**Date:** 2026-09-17  
**Contract (this pass):** Cliente360 tabs Resumen / Comercial / Operación / Trabajo / Documentos / Historial — **role-filtered**; unauthorized tabs must **not leak via URL**. Inicio is **role-aware** (not one universal dashboard). Map is **resource-filtered by role** (Asesor = own clients only; Producción / Almacén / Compras / Finanzas = no general client map by default).  
**Method:** Source + automated test inspection only. **No implementation.**  
**Status vocabulary:** `IMPLEMENTED` · `PARTIAL` · `MISSING`

**Matrix intent (authority):** `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/docs/operations/ct3-owner-demo-completeness-2026-09-17/v1-canonical-consolidation/FINAL_ROLE_RESOURCE_MATRIX.md` (Cliente360 row, Map row).

---

## A) Cliente360 — six-tab shell

| Check | Status | Evidence |
| --- | --- | --- |
| Exactly six tabs in canonical order | **IMPLEMENTED** | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/cliente/nav-sections.ts` — `CLIENTE360_NAV_SECTIONS` (resumen → historial). Test: `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/cliente/cliente360-ux.test.ts` (“exposes exactly six sections in order”). |
| Single visible panel (not long-page anchors) | **IMPLEMENTED** | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/app/(app)/clientes/[partyId]/page.tsx` — conditional render per `tab === '…'`. Nav comment: `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/components/cliente/cliente-360-nav.tsx` L21–24. |
| `?tab=` URL persistence + invalid → resumen | **IMPLEMENTED** | `parseCliente360Tab` in `nav-sections.ts`; deep links `clienteSectionHref` in `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/commercial/navigation.ts`. Tests in `cliente360-ux.test.ts`. Legacy `#section` → `?tab=` once in `cliente-360-nav.tsx` L29–35. |
| Hosted structural BV (six tabs, refresh) | **IMPLEMENTED** (structural only) | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/docs/operations/ct3-owner-demo-completeness-2026-09-17/CT3_HOSTED_BV.md` — Cliente360 `?tab=` ×6 PASS for demo Asesor; **does not assert role-filtered tabs**. |

**Shell rollup:** **IMPLEMENTED** for CT3 product tab UX; **not** the V1 role-narrowing contract (below).

---

## B) Cliente360 — role-filtered tabs

| Check | Status | Evidence |
| --- | --- | --- |
| Tab visibility matrix by role (nav hides disallowed tabs) | **MISSING** | `Cliente360Nav` maps **all** `CLIENTE360_NAV_SECTIONS` with no role/scopes prop (`cliente-360-nav.tsx` L61–85, L71–85). `[partyId]/page.tsx` does not compute allowed tabs from `roleKeys` / scopes. |
| Per-tab authorization helper / shared contract | **MISSING** | No `allowedCliente360Tabs`, `cliente360TabAccess`, or similar under `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/cliente/` (only structural `nav-sections.ts`). |
| Sub-resource denial inside tabs (API-driven) | **PARTIAL** | Section fetch uses `fetchCommercialSection` → `forbidden` / `unavailable` (`/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/commercial/fetch-outcome.ts`). `CommercialSectionState` renders `AccessDeniedState` on `forbidden` (`commercial-section-state.tsx` L30–31). Operación locations: explicit `forbidden` branch in `[partyId]/page.tsx` L464–465. Documentos / finanzas loaders define `forbidden` outcomes (`document-links.ts`, `finance-summary.ts` COPY) but finance loader maps **all** errors to `unavailable` (`finance-summary.ts` L55–57), not `forbidden`. |
| Party detail gate before tabs | **PARTIAL** | `loadCliente360` always calls `getParty(partyId)` (`load-cliente-360.ts` L41). API `getParty` returns party for any active org member with **no** commercial ownership / coverage check (`/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-api/src/parties.controller.ts` L124–154). Commercial list APIs filter rows via `canViewCommercialRecord` when invoked (`packages/os-query/src/commercial/commercial-auth.ts`) — **tab shell still mounts** and nav still lists all six. |
| Matrix intent (ops / finance / warehouse **subsets**) | **MISSING** | No code maps PRODUCCIÓN / ALMACÉN / COMPRAS / FINANZAS / COORDINACIÓN scopes to a subset of the six tabs. Finanzas appears as subsection under Operación (`Cliente360Finanzas` in `[partyId]/page.tsx` L472–474), not a separate tab — subset contract unimplemented at tab level. |

**Role-filter rollup:** **MISSING** at tab/nav layer; **PARTIAL** at nested section/API outcome layer only.

---

## C) Cliente360 — unauthorized tabs must not leak via URL

| Check | Status | Evidence |
| --- | --- | --- |
| `?tab=` clamped to **allowed** tabs for viewer | **MISSING** | `parseCliente360Tab` accepts any valid section id (`nav-sections.ts` L18–25); page uses `tab` directly for panel switch (`[partyId]/page.tsx` L96, L245–585). No redirect to default/resumen when tab disallowed. |
| Direct URL must not reveal tab chrome for forbidden areas | **MISSING** | Disallowed user still sees tab in nav and can activate via `?tab=comercial` etc.; worst case sees empty nest or `AccessDeniedState` **inside** the tab panel — still confirms tab existence and party context. |
| Tests for URL fail-closed tab gating | **MISSING** | `cliente360-ux.test.ts` covers parsing only, not role × tab matrix. |

**URL anti-leak rollup:** **MISSING** (explicit contract gap).

---

## D) Inicio — role-aware (not one universal dashboard)

| Check | Status | Evidence |
| --- | --- | --- |
| Multiple lenses (personal / team / org) | **IMPLEMENTED** | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/inicio/page-lens.ts` — `InicioPageLens`, `availableInicioPageLenses`, `resolveInicioPageLens`. UI: `InicioLensTabs` (`inicio-lens-tabs.tsx`). Page wiring: `[partyId]/page.tsx` → `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/app/(app)/inicio/page.tsx` L195–201, L459, L461–559. |
| Lens derived from **real** scopes + leadership probes | **IMPLEMENTED** | `canShowTeamLens` / `canShowOrgLens` use `hasTeamCommercialRead`, `viewerHasManagementOrgRead`, leadership ready flags (`page-lens.ts`). Command queues: `resolveInicioRoleLens` + `workItemsQueryForLens` (`/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/inicio/role-lens.ts`, `queues.ts`); tests `inicio-command.test.ts`. |
| Distinct content per lens (not same dashboard) | **PARTIAL** | Personal: Mi día, Centro de mando, commercial responsibility blocks, command queues (`inicio/page.tsx` L461–537). Team: `ManagementTeamTable` + insights when `activeLens === 'team'` (L539+). Org: metrics, funnel, Para revisar / Oportunidades de mejora when `activeLens === 'org'` (L559+). **Shared** summary band + Mi día render for **all** lenses (L452–457 before lens branch). Ops-only roles (production / warehouse scopes, no commercial team/org read) get **operator** lens only — same page chrome as generic operator, not department-specific home (`role-lens.ts` L16–23; no production/warehouse branch in `page-lens.ts`). |
| Shell Inicio label emphasis by role | **IMPLEMENTED** (nav copy) | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/navigation/role-nav-labels.ts` + `requests/roles.ts` — Asesor/Jefe/Gerente Inicio labels; **does not change page data**. |
| Legacy stacked role homes removed | **IMPLEMENTED** | `inicio-ux2.test.ts` asserts no `OperatingHomes` on inicio page; `inicio-command.test.ts` same. |

**Inicio rollup:** **PARTIAL** — strong commercial/management tri-lens; **not** full role-matrix homes for ops departments; shared header blocks remain universal.

---

## E) Inicio — URL / lens anti-leak

| Check | Status | Evidence |
| --- | --- | --- |
| Unauthorized `?lente=equipo` / `?lente=empresa` / `gerencia` | **IMPLEMENTED** | `resolveInicioPageLens` returns `'personal'` unless `canShowTeamLens` / `canShowOrgLens` (`page-lens.ts` L15–22). Org metrics / team table gated by `activeLens === 'org'|'team'` **and** loaded leadership data (`inicio/page.tsx` L360–422, L539–559). |
| Lens tabs UI only shows allowed lenses | **IMPLEMENTED** | `InicioLensTabs` receives `available={availableLenses}`; hidden when `available.length <= 1` (`inicio-lens-tabs.tsx` L15–16). |
| Automated tests for lens fail-closed | **PARTIAL** | Scope/lens **logic** tested in `inicio-command.test.ts` for `resolveInicioRoleLens` and queue queries; **no** direct unit tests for `resolveInicioPageLens` unauthorized URL cases. |

**Inicio URL rollup:** **IMPLEMENTED** for management/commercial lens params (fail-closed to personal).

---

## F) Map — resource-filtered by role

| Check | Status | Evidence |
| --- | --- | --- |
| Asesor: own (+ coverage) clients only on map | **MISSING** | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/app/(app)/mapa/page.tsx` L123 — `client.searchParties({ status: 'active', limit: 100 })` with **no** owner / visibility / coverage filter. Same pattern noted in CR-2 receipt (`CR2_VIEW_AS_GAP.md` §3 Mapa row). Server-side own-scope exists for **commercial list** APIs (`packages/os-query/src/leadership/leadership-visibility.ts`, `commercial-query-service.ts`) but **not applied** on map party search or map commercial lens fetch (L75–80). |
| Producción / Almacén / Compras / Finanzas: no general client map by default | **MISSING** | No route guard or empty-state on `/mapa` by scope. `PRIMARY_NAV` marks `mapa` as `VISIBLE+ACTIVE` for all members (`nav-config.ts` L109–116). `filterNavByAccess` only hides admin items (`requiresAdminProbe`); does not hide map for ops roles. QA access matrix treats map like any nav id (`access-matrix.ts` L44–47, L79–87). |
| Coordinación: delivery locations (matrix) | **MISSING** | Map layers are presentation filters on **same** party set (`layers.ts` — clientes/atencion/oportunidades…); no delivery-only geography mode wired to role. |
| Demo data mode filter | **IMPLEMENTED** (demo only) | `filterByDemoDataMode` on parties and commercial rows (`mapa/page.tsx` L128–131, L155–169) — **not** role resource narrowing. |
| Map nav link from Clientes | **IMPLEMENTED** | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/app/(app)/clientes/page.tsx` L89–92 — unconditional link to `/mapa`. |

**Map rollup:** **MISSING** for V1 role resource matrix; **IMPLEMENTED** only for map UX layers + demo mode + org-wide party search.

---

## G) Cross-surface dependencies (read-only notes)

| Topic | Status | Note |
| --- | --- | --- |
| View As / evaluation projection | **MISSING** for CR-7 surfaces | CR-2 documents preview does not narrow map/clientes/inicio SSR (`CR2_VIEW_AS_GAP.md` §3–§5). CR-7 contract assumes **real** role/resource boundaries — same gaps apply until shared projection exists. |
| Clientes list vs map consistency | **MISSING** | `/clientes` uses unfiltered `searchParties` (CR-2); map uses same API — Asesor contract not enforced on either entry point. |

---

## H) Summary rollups

| Surface | Contract area | Rollup | Primary gap |
| --- | --- | --- | --- |
| **Cliente360** | Six-tab shell + URL persistence | **IMPLEMENTED** | — |
| **Cliente360** | Role-filtered tabs | **MISSING** | No tab matrix; nav always shows six |
| **Cliente360** | URL tab anti-leak | **MISSING** | `?tab=` renders disallowed panels |
| **Inicio** | Role-aware dashboard | **PARTIAL** | Personal/team/org lenses; ops roles share operator shell |
| **Inicio** | Lens URL anti-leak | **IMPLEMENTED** | Unauthorized `lente` → personal |
| **Map** | Role resource filter | **MISSING** | Org-wide `searchParties`; map nav always visible |

**CR-7 overall:** **PARTIAL** — CT3 tab/lens **mechanics** are in place; V1 **role-narrowed Cliente360 tabs**, **Cliente360 URL tab gating**, and **map resource filtering** are **MISSING** in code inspected.

---

## I) Evidence index (absolute paths)

- Cliente360 structure: `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/cliente/nav-sections.ts`, `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/app/(app)/clientes/[partyId]/page.tsx`, `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/components/cliente/cliente-360-nav.tsx`, `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/cliente/cliente360-ux.test.ts`
- Cliente360 data: `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/cliente/load-cliente-360.ts`, `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-api/src/parties.controller.ts`, `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/packages/os-query/src/commercial/commercial-auth.ts`
- Inicio: `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/inicio/page-lens.ts`, `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/inicio/role-lens.ts`, `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/inicio/queues.ts`, `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/app/(app)/inicio/page.tsx`, `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/inicio/inicio-command.test.ts`, `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/inicio/inicio-ux2.test.ts`
- Map: `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/app/(app)/mapa/page.tsx`, `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/map/layers.ts`, `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/navigation/nav-config.ts`
- Intent matrix: `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/docs/operations/ct3-owner-demo-completeness-2026-09-17/v1-canonical-consolidation/FINAL_ROLE_RESOURCE_MATRIX.md`
- Related gap (View As / list narrowing): `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/docs/operations/ct3-owner-demo-completeness-2026-09-17/v1-canonical-consolidation/workers/CR2_VIEW_AS_GAP.md`

**Implementation performed in this task:** none (gap receipt only).
