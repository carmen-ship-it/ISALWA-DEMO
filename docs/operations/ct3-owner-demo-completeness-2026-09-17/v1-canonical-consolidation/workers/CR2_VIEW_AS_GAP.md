# CR-2 View As / Vista de evaluación — GAP RECEIPT

**Worker:** CR-GAP / CR-2 analyst  
**Date:** 2026-09-17  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo`  
**Authority:** V1 canonical consolidation (View As contract + role projections)  
**Scope:** Inspect only — no implementation in this receipt.

---

## CR2_STATUS

**FAIL** — View As is **client-side nav labeling + banner** only. It does **not** narrow server/API reads, does **not** disable mutations in product code, and has **no Asesor member picker**. Authenticated actor correctly remains Carmen at the session layer, but **evaluation preview does not change what data Carmen can load or mutate**, which violates the narrowing contract for owner evaluation.

---

## 1) Current implementation map

### Entry points (UI)

| Artifact | Path | Role |
|---|---|---|
| Shell wiring | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/components/shell/app-shell.tsx` | `canUseRolePreview(grantedScopes)` gates menu; wraps `RolePreviewProvider` + banner/desktop control; ties `canUseOwnerDemo` to same gate |
| Provider | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/components/shell/role-preview-provider.tsx` | `persona`, `presentationScopes`, `blocksMutations` (context only) |
| Menu / control / banner | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/components/shell/role-preview-menu.tsx`, `role-preview-desktop-control.tsx`, `role-preview-banner.tsx` | Persona selection; non-impersonation copy |
| Nav consumption | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/components/shell/app-nav.tsx` | `presentationScopes` → `roleNavPresentation()` (labels/emphasis only) |

### Core library

| Artifact | Path | Role |
|---|---|---|
| Access gate | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/role-preview/access.ts` | `canUseRolePreview`, `effectiveNavScopes`, `rolePreviewBlocksMutations` |
| Persona presets | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/role-preview/presets.ts` | Maps persona → scope **strings for display** |
| Types | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/role-preview/types.ts` | **`previewScopes` — "Display-only … never sent to the API"** |
| Persistence | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/role-preview/storage.ts` | `localStorage` key `isalwa-os-role-preview-v1:{orgId}:{memberId}` |
| Nav labels | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/navigation/role-nav-labels.ts` | Explicit: does not hide/lock nav |
| Tests / shell contract | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/role-preview/role-preview.test.ts` | Gate, storage safety, banner strings |

### Session / cookies (distinct from View As)

| Mechanism | Path | Role |
|---|---|---|
| REAL vs SYNTH company | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/demo/owner-company-context.ts` | Cookie `isalwa-owner-effective-company`; **not impersonation; distinct from role-preview** (comment L3–4) |
| Demo data mode | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/demo/resolve-demo-data-mode.ts` | Cookie `DEMO_DATA_MODE_COOKIE` + `?datos=` — filters **DEMO-named** rows, not role projection |
| Shell scopes | `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/shell/load-shell-context.ts` | Loads **real** `grantedScopes`, `showAdmin`, `actorKey` from API — **no role-preview read** |

### Forensic / prior CT3 note

`/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/docs/operations/ct3-owner-demo-completeness-2026-09-17/PDF_AND_ROLE_PREVIEW_FORENSIC.md` — documents UI-only overlay; data filtering gap already suspected.

---

## 2) Contract clause compliance

| Clause | Status | Evidence |
|---|---|---|
| Projection narrowing only, not impersonation | **PARTIAL** | Banner: `role-preview-banner.tsx` ("No estás actuando como esta persona"); session/member unchanged (`load-shell-context.ts`, `getServerOsAuthContext` path). **But** no projection narrowing on reads. |
| Authenticated actor remains Carmen | **IMPLEMENTED** | No member swap; `actorKey` from real session only (`load-shell-context.ts` L115–121). |
| Must NOT elevate authority | **IMPLEMENTED** (no elevation via preview) | Preview replaces nav scopes with **subset** presets (`presets.ts`); real API auth unchanged. **Inverse gap:** preview also does not **restrict** Carmen's people.admin reads. |
| Must NARROW visible data to selected role | **MISSING** | No cookie/header/query param to API; list pages use real auth only (see §3). |
| Asesor preview: pick WHICH synthetic Asesor | **MISSING** | Single persona `asesor`; no `ownerMemberId` / member picker in role-preview UI or storage. |
| Mutations DISABLED while View As active | **MISSING** (logic exists, unwired) | `rolePreviewBlocksMutations` + test (`access.ts`, `role-preview.test.ts`); **`blocksMutations` consumed nowhere** outside `role-preview-provider.tsx` (repo grep). Server actions unchanged. |
| Jarvis: narrowed projection + read-only in preview | **MISSING** | No `rolePreview` in `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/components/ai/**` or `apps/os-api/**`. AI uses real session (`lib/ai/actions.ts` → `getServerOsAuthContext`). |

### Authoritative role projections vs presets

| Role (contract) | Preview persona | Preset scopes (`presets.ts`) | Gap |
|---|---|---|---|
| ASESOR (owned + coverage) | `asesor` | `commercial.customer.create`, `commercial.quote.convert.own` only | No coverage grants, no subject member; server lists for Carmen still **unrestricted** under `people.admin` (`leadership-visibility.ts` L40–42). |
| JEFE COMERCIAL (company commercial team) | `jefe-comercial` | `commercial.team.read` | Aligns with `visibility=team` **if** API were called with narrowed auth; not wired to pages. |
| GERENCIA (business, no tech admin) | `gerencia` | `commercial.org.read` only | Real Gerencia home also uses `management.org.read` (`lib/management/scope.ts`, `OWNER_DEMO_SYNTH_BUSINESS_SCOPES`); **`showAdmin` still from real probe** (`load-shell-context.ts` L98–101). |
| PRODUCCION / ALMACEN / COMPRAS | `produccion`, `almacen`, `compras` | respective operational **write** scope strings | Used for **nav emphasis only**; ops pages load by real capabilities — no preview gate. |
| COORDINACION | — | **No persona** (`OPERATIONS_COORDINATOR` exists in `lib/roles/access.ts` DEPARTMENT_LENSES only) | **MISSING** persona in View As menu. |
| FINANZAS operational | `finanzas` | `finance.operational.record` | Nav lens only unless page fail-closed by scope (unaffected by preview). |
| Entregas | `entregas` | `delivery.record` | Extra persona vs contract list; not harmful but not in authoritative list. |

---

## 3) Does View As only change nav chrome?

**Yes, effectively.**

- `AppNav` uses `presentationScopes` only for kicker, Inicio label override, and dot emphasis (`app-nav.tsx`, `role-nav-labels.ts` L1–4, L14–15).
- `resolveShellNavSections` / `filterNavByAccess` use **real** `capabilities` and `showAdmin` — not preview persona (`resolve-nav.ts`, `app-shell.tsx` L201–205).
- **No** RSC page imports `useRolePreview` (client-only). Server pages (`clientes`, `oportunidades`, `cotizaciones`, `mapa`, `inicio`) call `getServerOsAuthContext()` + `createOsApiClient(auth)` with **Carmen's scopes**.

### Resource queries (representative)

| Surface | Path | Narrowing today |
|---|---|---|
| Clientes list | `apps/os-web/app/(app)/clientes/page.tsx` | `searchParties` — **no owner filter** at query layer (`party-query-service.ts` L32–68). Demo name filter only. |
| Oportunidades | `apps/os-web/app/(app)/oportunidades/page.tsx` | `listOpportunities` **without** `visibility` → for `people.admin`, `resolveOwnerReadScope` → **`unrestricted`** (`leadership-visibility.ts` L40–42). |
| Cotizaciones | `apps/os-web/app/(app)/cotizaciones/page.tsx` | Same pattern as oportunidades (no `visibility` in page grep). |
| Mapa | `apps/os-web/app/(app)/mapa/page.tsx` | `searchParties` limit 100 + `listOpportunities/listQuotes/listOrders` without visibility (L75–80, L123). |
| Command palette | `apps/os-web/lib/shell/command-search.ts` | Probes team/org with **real** session; `searchParties` unfiltered (L72–92). |
| Inicio leadership | `apps/os-web/lib/leadership/load-inicio-leadership.ts` | Uses `visibility: team|org` based on **real** API permission probes — not preview persona. |
| Ops search helper | `apps/os-web/lib/shell/ops-search.ts` | Client-side `asesorMaySee` / `jefeMaySee` — **not wired to palette**; would need `RoleSession` with preview scopes + asesor member + coverage grants. |

---

## 4) Asesor resource filtering (ownerMemberId / coverage)

### Server (canonical for real Asesor login)

| Mechanism | Path | Behavior |
|---|---|---|
| Owned commercial rows | `packages/os-query/src/leadership/leadership-visibility.ts` | Default `visibility=own` → `{ kind: 'self', ownerMemberId: ctx.auth.memberId }` unless `people.admin` → unrestricted |
| Single-record read | `packages/os-query/src/commercial/commercial-auth.ts` | `canViewCommercialRecord` — owner match or `people.admin` |
| List filtering | `packages/os-query/src/commercial/commercial-query-service.ts` | `readScope` + `ownerInReadScope` on opportunities/quotes/orders |
| UI model (client-side) | `apps/os-web/lib/roles/access.ts` | `asesorMaySee`, `coversCustomer` via `continueCoveredCustomerWorkflow` + `coverageGrants` |
| Used in | `apps/os-web/lib/shell/ops-search.ts`, `lib/roles/homes.ts`, `lib/roles/attention.ts` | **Not** used on main list pages or View As |

### Gaps for evaluation preview

1. **No** substitution of `ctx.auth.memberId` with selected synthetic Asesor for queries.  
2. **No** injection of `coverageGrants` for preview session.  
3. **Party search** remains org-wide at API — Asesor contract (owned + coverage) is **not enforced** on `/clientes` or palette party hits.  
4. Locked REAL staff names in CONTROL_TOWER (`YUSELKA…`, `JOSE LUIS…`) — **no** mapping from View As to those member IDs in product code.

---

## 5) Jefe Comercial — `commercial.org.read` vs `commercial.team.read`

| Concern | Where | Finding |
|---|---|---|
| Preview preset | `apps/os-web/lib/role-preview/presets.ts` L16–17 | Jefe → **`commercial.team.read`** only; Gerencia → **`commercial.org.read`**. |
| API team lens | `packages/os-query/src/leadership/leadership-visibility.ts` L55–70 | `visibility=team` requires `commercial.team.read` + direct reports lookup |
| API org lens | Same file L50–52 | `visibility=org` requires `commercial.org.read` |
| Inicio | `apps/os-web/lib/inicio/page-lens.ts`, `lib/inicio/queues.ts` | Team tab ↔ `visibility: team`; org/gerencia ↔ `visibility: org` — driven by **real** `roleKeys` + leadership probes |
| Jefe row visibility rules | `apps/os-web/lib/roles/access.ts` L136–141 | `jefeMaySee` — team visibility rows + own rows |
| Gerencia commercial | `apps/os-web/lib/roles/access.ts` L143–147 | `gerenteMaySeeCommercial` — org/team visibility; separate from `management.org.read` company ops |
| Owner SYNTH policy doc | `packages/os-database/src/staging-carmen-synth-demo-scopes.ts` | Both scopes granted for Carmen **evaluation membership** — distinct from View As overlay |

**Gap:** View As Jefe/Gerencia personas do not cause web pages to call `listOpportunities({ visibility: 'team'|'org' })` or equivalent; Carmen's `people.admin` bypasses own-scope narrowing on default lists.

---

## 6) Top 10 gaps (priority)

1. **No server-trusted evaluation projection** — preview is `localStorage` only; SSR/RSC/API unaware.  
2. **`blocksMutations` unwired** — mutations remain available to Carmen while banner shows preview.  
3. **List/map/search load full org data** for people.admin actor regardless of persona.  
4. **No synthetic Asesor selector** — cannot preview per-Asesor owned+coverage slice.  
5. **Party search unfiltered** by owner/coverage at query layer (`party-query-service.ts`).  
6. **Gerencia preview incomplete** — missing `management.org.read` mirror; admin chrome still on.  
7. **COORDINACION persona missing** from View As presets.  
8. **AI / Jarvis ignores View As** — no read-only narrowed retrieval (CR-6 collision).  
9. **Command palette** uses unrestricted session probes + broad `searchParties`.  
10. **Documented intent vs code** — CT2 salvage says "UI preview only" (`docs/operations/ct2-executive-ux-2026-09-16/STARTING_STATE_RECONCILIATION.md` L53); **contradicts** V1 contract requiring data narrowing unless explicitly superseded.

---

## 7) Recommended shared mechanism (single boundary — not 80-page patches)

**Do not patch each page.** Add one vertical slice:

1. **`EvaluationProjection` (shared contract)** — e.g. extend `apps/os-web/lib/role-preview/` with server-readable shape: `{ active, persona, subjectMemberId?, effectiveReadScopes, commercialVisibility?: 'own'|'team'|'org', readOnly: true }`.  
2. **HttpOnly cookie (or signed header) set via server action** when owner changes persona — only if `canUseRolePreview(realScopes)`; validate persona + optional `subjectMemberId` against org roster (SYNTH/REAL company from CR-1 cookie). **Never** change JWT/memberId.  
3. **`getEvaluationProjection()`** parallel to `getServerOsAuthContext()` in `apps/os-web/lib/auth/actions.ts` (CR-1 collision — coordinate one writer).  
4. **API query context** — os-api accepts projection header; builds **synthetic `QueryContext` auth snapshot**: scopes = intersection(real, persona preset), memberId stays Carmen, but `resolveOwnerReadScope` uses **`requestedOwnerMemberId` / visibility** from projection for **read handlers only** (reuse `packages/os-query/src/leadership/leadership-visibility.ts` — do not fork filters).  
5. **Mutation gate** — single `assertEvaluationReadOnly(projection)` at top of server actions / command execution paths; client disables primary CTAs when `blocksMutations` synced from same cookie.  
6. **AI (CR-6)** — pass projection into `requestAiAssist`; gateway refuses tools/mutations when `readOnly`.  
7. **Asesor picker** — reuse active-member search pattern (`lib/productivity/` / `coverage-summary.tsx` member select) constrained to Asesor role keys; store in projection cookie.

Pages then call one helper: `createOsApiClient(auth, { projection })` instead of per-page filters.

---

## 8) Collision risks (other CR lanes)

| Lane | Risk | Mitigation |
|---|---|---|
| **CR-1** (tenant / org cookie) | Evaluation cookie + `OWNER_EFFECTIVE_COMPANY_COOKIE` + demo mode cookie — three lenses | Single `getEvaluationProjection()` reads company cookie; document precedence in CR-1 receipt |
| **CR-3** (coverage / reassign) | Asesor picker + coverage grants overlap ownership model | Picker IDs only; coverage rules stay in `packages/os-commercial` / `continueCoveredCustomerWorkflow` |
| **CR-6** (AI gateway) | Projection must filter retrieval | One header from web → os-api ai.controller |
| **CR-7** (Inicio / Cliente360 / Map) | Lens tabs use real scopes | Inicio should read projection for default lens, not only `?lente=` |
| **UX-1 salvage** (`lib/role-preview/**`, shell) | CR-2 extends same tree | Extend, do not parallel `view-as-v2` |
| **Demo toggle** | Owners conflate Demo data filter with View As | Keep `owner-company-context.ts` separate; UI copy already partially distinct |

---

## 9) Business rule register (CR-2 fills)

| RULE_ID | Receipt status | Notes |
|---|---|---|
| BR-VAS-01 | **IMPLEMENTED** | Identity unchanged |
| BR-VAS-02 | **PARTIAL** | Preview cannot elevate, but fails to narrow — owner still sees/mutates full org |
| BR-VAS-03 | **MISSING** | Mutations not disabled in UI/actions |

---

## 10) Implementation note

**No code changes in this worker.** Optional 1-line safety comment not applied — gap is structural (unwired `blocksMutations`), not a misleading comment.

---

**End CR-2 GAP RECEIPT**
