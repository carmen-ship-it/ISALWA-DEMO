# PP-5 — View As / search / map / management / finance

**Lane:** PP-5  
**As of:** 2026-09-17  
**Audit mode:** READ-ONLY (no product code edited)  
**RC2 failed SHA (immutable tip at audit):** `8f1ac76185af432bb244ea94b7ae6a647eaa0ebc`  
**Working tree:** dirty (RC3 View As / Pedido narrowing + related uncommitted)  
**Deploy / hosted BV:** NOT performed — mark **UNPROVEN** for browser claims

---

## Verdict (local code + unit contracts)

| Slice | Local | Hosted |
|---|---|---|
| View As personas + desk allow-list | **IMPLEMENTED** — `DESK_PERSONAS` + page gates | **UNPROVEN** |
| Data narrowing (lists / detail / search) | **IMPLEMENTED** (+ RC3 Pedido detail gate) | **UNPROVEN** |
| Mutations disabled under View As | **PARTIAL** — server gate on commercial/party/work/issue/delivery; finance + ops desks weak | **UNPROVEN** |
| ⌘K command palette | **IMPLEMENTED** (evaluation + commercial desk filter) | **UNPROVEN** |
| Map | **IMPLEMENTED** (desk + owner + demo lens; no revenue labels) | **UNPROVEN** |
| Finanzas desk | **IMPLEMENTED** (desk gate + operational-only copy) | **UNPROVEN** |
| Gerencia / Empresa lens | **IMPLEMENTED** (`/inicio?lente=empresa\|gerencia`; factual metrics) | **UNPROVEN** |

**PP5_LOCAL_CONTRACT = PASS with residuals** (see §Residuals).  
**PP5_HOSTED_BV = UNPROVEN.**  
**SAFE_TO_CLAIM_OWNER_ACCEPTANCE_ON_PP5 = NO.**

---

## Contract (what View As is)

| Rule | Mechanism | Evidence |
|---|---|---|
| Not impersonation | Banner: “Sigue siendo Carmen · Solo lectura”; identity stays session Carmen | `role-preview-banner.tsx`; `role-preview.test.ts` |
| Who may open View As | `people.admin` **or** `management.org.read` (not plain commercial; not `system.admin` alone) | `access.ts` `canUseRolePreview` |
| Presentation ≠ auth | `presentationScopes` / `effectiveNavScopes` never sent as API elevation | `evaluation-projection.ts`; `access.ts` |
| Mutations blocked | Cookie `isalwa-os-role-preview-persona` → `assertRolePreviewAllowsMutation` | `mutation-gate.ts`; commercial/party/work/issue/delivery actions |
| Desk exclusion | `evaluationAllowsDesk` → `EvaluationDeskExcluded` | `evaluation-resource-access.ts` |
| Commercial list slice | `commercialListQueryFromProjection` (Asesor owner / Jefe team / Gerencia org) | `commercial-list-query.ts` |
| Commercial detail slice | `evaluationBlocksDirectParty` on party / quote / pedido | Cliente360, Quote, Pedido pages + RC3 tests |

**Personas (preset labels):** Asesor · Jefe comercial · Gerencia · Producción · Almacén · Compras · Entregas · Finanzas  
(`ROLE_PREVIEW_PRESETS` in `presets.ts`)

---

## Shell nav vs usable V1 routes

**Important:** View As does **not** hide primary nav destinations. `AppNav` only re-labels / emphasizes via `roleNavPresentation(presentationScopes)`. Fail-closed happens on the **page** (`EvaluationDeskExcluded` / `AccessDeniedState`).

Nav may still show e.g. Cotizaciones under Producción; opening `/cotizaciones` renders “Fuera de esta proyección”.

---

## Persona × V1 desk matrix

Source of truth: `DESK_PERSONAS` in `evaluation-resource-access.ts`.  
✓ = `evaluationAllowsDesk` true (desk page renders). ✗ = excluded empty state.

| V1 route / desk | Desk key | Asesor | Jefe | Gerencia | Producción | Almacén | Compras | Entregas | Finanzas |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `/cotizaciones`, `/oportunidades`, Quote detail | `commercial` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `/produccion` | `produccion` | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/almacen` | `almacen` | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `/compras` | `compras` | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| `/entregas` | `entregas` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `/finanzas` | `finanzas` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| `/mapa` | `map` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `/conversaciones` | `conversations` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `/trabajo` | `trabajo` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/aprobaciones` | `aprobaciones` | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `/compromisos` | `compromisos` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/incidencias` | `incidencias` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Gerencia desk key | `gerencia` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

**Always available under Carmen session (no desk key / not excluded by persona):** `/inicio`, `/ayuda`, and other non-gated “Más” routes Carmen already can open.  
**Admin-only:** `/auditoria`, `/administracion` remain admin/owner-eval gated; View As Asesor without subject → `EvaluationDeskExcluded` on auditoría.

**Ops personas** (`produccion|almacen|compras|entregas|finanzas`): `evaluationIsOpsPersona` → Cliente360 loads with `suppressCommercialNegotiation` (negotiation docs/history stripped). Quote desk excluded (RC3 `order-role-matrix` G–K).

---

## Data narrowing (by persona)

| Persona | Commercial visibility | List behavior | Detail behavior |
|---|---|---|---|
| **Asesor** | `own` → query `{ visibility: 'org', ownerMemberId: subject }` | Clients / quotes / orders / map / ⌘K filtered to subject; missing subject → empty / impossible owner | Party / Quote / Pedido blocked if `ownerMemberId ≠ subject` |
| **Jefe comercial** | `team` | Lists use `visibility=team` | No person-slice; team lens |
| **Gerencia** | `org` | Lists use `visibility=org` | Org lens; presentation adds `management.org.read` + `commercial.org.read` for labeling only |
| **Ops (Prod/Almacén/Compras/Entregas/Finanzas)** | `null` | Commercial desks excluded; no commercial list query from projection | Ops desks allowed per matrix; commercial Quote excluded |

Related RC3 evidence: `../RC3_VIEW_AS_ORDER_NARROWING.md`, `../RC3_SEARCH_NEGATIVES_LOCAL.md`.

---

## Mutations disabled

| Path | Under active View As |
|---|---|
| Banner | “Las acciones están deshabilitadas” when `blocksMutations` |
| Server actions with gate | `assertRolePreviewAllowsMutation` in `commercial/actions`, `party/actions`, `work/actions`, `issue/actions`, `delivery/actions` |
| Clientes “Agregar cliente” | Forced off when `evaluation.active` |
| Cliente360 master-data edit | Forced off when `evaluation.active` |
| Unit proof | `rolePreviewBlocksMutations(persona) === true` for all non-own personas; history-filter J |

**Residuals (do not over-claim):**

1. **Finanzas operational desk** — page gated by `evaluationAllowsDesk('finanzas')`, but client write path uses `authorizeFinanceOperationalWrite` on Carmen’s **real** scopes and does **not** call `assertRolePreviewAllowsMutation`. Facts are local/reported (not ledger), but UI still allows “record” while banner says read-only.
2. **Producción / Almacén / Compras** action modules — no `assertRolePreviewAllowsMutation` grep hits under those libs.
3. **⌘K Acciones** — palette still lists “Agregar cliente / Nueva oportunidad / …” under View As; navigation may occur; server mutations should fail where gated.

---

## ⌘K command palette coverage

| Capability | Status | Evidence |
|---|---|---|
| Shortcut | ⌘K / Control+K | `CommandPaletteTrigger` `aria-keyshortcuts="Control+K Meta+K"` |
| Live entity kinds | customer, opportunity, quote, order, work, follow-up, issue, commitment, people, approval, document | `PALETTE_LIVE_ENTITY_KINDS` |
| Session-only search | No `organizationId` override | `command-palette.test.ts` |
| View As on search | `getEvaluationProjection` + `commercialListQueryFromProjection` + `filterByCommercialOwner` | `command-search.ts` |
| Desk-aware commercial | If `!evaluationAllowsDesk(..., 'commercial')` → no party/opp/quote/order fan-out | Ops View As: commercial hits suppressed |
| Approvals in palette | Only if `evaluationAllowsDesk(..., 'aprobaciones')` | Asesor/ops: no approval search |
| Documents | Commercial **or** Entregas desk | Entregas can still hit delivery-note docs |
| Pedido lenses post RC3-A | Own/team skip org probe; orders use commercialQuery + owner filter | `RC3_SEARCH_NEGATIVES_LOCAL.md` **PASS** |
| Hosted View As search negatives | — | **UNPROVEN** |

---

## Map (`/mapa`)

| Contract | Local evidence |
|---|---|
| Desk allow | Asesor, Jefe, Gerencia, Entregas only |
| Party list | `filterByDemoDataMode` + `filterByCommercialOwner` (Asesor subject) |
| Commercial overlay | `commercialListQueryFromProjection` into opp/quote/order lists |
| Coordinates | Confirmed lat/lng only (`locationHasConfirmedCoordinates`) |
| No revenue labeling | `commercial-lens.ts`: Valor de oportunidades / cotizado / pedidos — never ingresos/facturación |
| Provider | Live vs unavailable via `resolveMapProviderStatus` (hosted interactive map separate) |

---

## Finanzas desk (`/finanzas`)

| Contract | Local evidence |
|---|---|
| View As desk | Finanzas + Gerencia only |
| Unlock | Real session `finance.operational.record` via `resolveFinancePageAccess` (cargo/title never grant) |
| Product capability | `finance` remains LOCKED — operational reported evidence only, not official ledger / Ingresos |
| Copy / UI | `FinanceOperationalDesk` + `FinanceDisclaimer`; demo seed payment marked pending confirmation |
| View As mutation residual | See §Mutations — write UI not wired to View As gate |

---

## Gerencia lens (`/inicio`)

| Contract | Local evidence |
|---|---|
| Deep link | `?lente=empresa` or `?lente=gerencia` → `InicioPageLens = 'org'` when `canShowOrgLens` (`management.org.read` or leadership org ready) | `page-lens.ts` |
| View As Gerencia | Presentation scopes include `management.org.read` + `commercial.org.read` (labeling); commercial lists use `visibility=org` | `evaluation-projection.ts` |
| Empresa band | `ManagementCommercialFunnel` + `ManagementOrgMetrics` + insights | `inicio/page.tsx` |
| Factual metrics only | Allow-list in `org-metrics.ts`; tooltips “No es ingreso”; unit forbids revenue/profit/margen | `org-metrics.test.ts` |
| Demo lens | Management funnel does not mix demo/real party ids | `demo-lens.test.ts` (cited in SEARCH_NEGATIVES) |
| Desk key `gerencia` | Defined in `DESK_PERSONAS` but **no page** calls `evaluationAllowsDesk(..., 'gerencia')` — Empresa lens is Inicio URL + real org-read, not a separate `/gerencia` route |

View As **Jefe/Gerencia** also widens Inicio approvals summary to org pending (same universe as `/aprobaciones` under that projection).

---

## Local test inventory (PP-5 relevant)

| File | What it proves |
|---|---|
| `apps/os-web/lib/role-preview/role-preview.test.ts` | Access gate, scopes, list narrowing, desk samples, banner, mutation source contract, Pedido/Quote detail gates |
| `apps/os-web/lib/role-preview/order-role-matrix.test.ts` | Asesor B Pedido block; ops exclude commercial Quote |
| `apps/os-web/lib/role-preview/evaluation-history-filter.test.ts` | Doc/history/audit View As negatives + mutation block |
| `apps/os-web/lib/shell/command-palette.test.ts` | Session search + Pedido evaluation lenses |
| `apps/os-web/lib/management/org-metrics.test.ts` | No revenue/profit language |
| `apps/os-web/lib/management/demo-lens.test.ts` | Demo/real party separation |
| `../RC3_SEARCH_NEGATIVES_LOCAL.md` | Aggregate SEARCH_NEGATIVES_LOCAL = PASS |

Commands (already used in RC3 evidence; not re-run in this read-only PP-5 pass):

```bash
cd apps/os-web && node --import tsx --test \
  lib/shell/command-palette.test.ts \
  lib/role-preview/role-preview.test.ts \
  lib/role-preview/order-role-matrix.test.ts \
  lib/management/org-metrics.test.ts \
  lib/management/demo-lens.test.ts
```

---

## Residuals / open gaps

| ID | Gap | Severity |
|---|---|---|
| PP5-R1 | Shell nav still lists excluded desks (emphasis only) | P3 UX honesty |
| PP5-R2 | `/clientes` list not `commercial`-desk-gated for ops (Asesor owner filter only; full Carmen-visible list for ops) | P2 |
| PP5-R3 | Finance (+ ops desk) writes lack `assertRolePreviewAllowsMutation` | P2 |
| PP5-R4 | ⌘K mutation actions still offered under View As | P3 |
| PP5-R5 | Opportunity detail still missing `evaluationBlocksDirectParty` (cited in RC3 View As doc) | P2 |
| PP5-R6 | Hosted View As × ⌘K × map × Empresa × Finanzas matrix | P1 proof — **UNPROVEN** |
| PP5-R7 | `DESK_PERSONAS.gerencia` unused by any route gate | P3 hygiene |

---

## Explicit non-claims

- Hosted BROWSER-VERIFIED PASS for any PP-5 persona walk  
- Interactive map provider live on hosted  
- View As = real RBAC impersonation  
- Finanzas = official ledger / confirmed payment  
- Gerencia metrics = revenue / profit / rankings  
- Cross-tenant palette HTTP end-to-end (unit/source only)

---

## Cross-links

- `../RC3_VIEW_AS_ORDER_NARROWING.md`  
- `../RC3_SEARCH_NEGATIVES_LOCAL.md`  
- `../RC3_LOCAL_CUT_GATE.md`  
- `../00_INDEX.md`  
- Prior RC requirements: `FINAL_V1_REQUIREMENTS_RECONCILIATION.md` C01–C08, L01, M01, N01, O01  

---

## Bottom line

PP-5 View As is a **web evaluation projection** with a clear persona × desk matrix, commercial/map/search narrowing, and mutation gates on core commercial/work paths. Map and Gerencia lenses stay factual (no revenue). Finanzas is an operational desk behind View As + real finance scope. Hosted proof and several mutation/nav honesty residuals remain open — do not treat PP-5 as owner-acceptance ready.
