# ISALWA Enter-Once / Closed-Loop Closure Matrix

**Lane:** SERIAL LANE 7 — CLOSE-THE-LOOP IMPLEMENTATION PASS  
**Date:** 2026-09-16  
**Worktree:** `.worktrees/wave2-remediation-integrate`  
**Branch:** `pre-pilot/company-os-pass`  
**FINAL_RUNTIME_SHA (lane-7 loop claim / ancestral BV):** `29b6f3f37fcf848a4a16248f34e39eeb33d1e463` (map + Almacén/Entregas/Compras read BV)  
**CURRENT LIVE (superseding product tip):** `e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed` — includes this matrix’s product wiring as ancestor + opaque-ID selectors  
**Evidence basis:** code + contracts + Prisma SoR + automated tests + hosted BV after deploy (`loop-visual-close/`)  
**Policy:** Manual initial entry **once** is OK. Manual **re-entry of the same canonical fact across pages** is NOT OK. Historical records inside ISALWA stay; external archives need not bulk-migrate.  
**Addendum:** Visual constitution preserved (navy/teal/sky/porcelain/white). No Wave C. No Isa/Álvaro accounts. No invented business policy. Version-1 individual Supabase Auth OK.

### State vocabulary (this matrix)

| STATE | Meaning |
|-------|---------|
| **PASS** | Same canonical record; surfaces where designed; no retype of that fact; history path exists in code/contracts |
| **FAIL/LOOP_GAP** | Wiring incomplete or operator must re-enter a fact that already exists as canonical SoR |
| **NOT PRODUCTIZED / PILOT BOUNDARY** | Intentionally out of closed commercial loop or deferred by product policy |
| **UNPROVEN** | Code may exist but hosted / browser proof for this loop slice is absent on claimed runtime |
| **FOUNDATION_GAP** | Schema/scopes may exist but hosted API command/persistence authority is missing — do not fake |

### Hosted proof shorthand

| Tag | Meaning |
|-----|---------|
| **CODE+TESTS** | Domain commands/tests prove behavior |
| **HOSTED-SSR** | Authenticated SSR HTML 200 on staging |
| **HOSTED-BV** | Hosted browser verification on affected routes |
| **WAVE-B-BV** | Independent Wave B hosted BV |
| **WAVE-A-BV** | Wave A continuity / coverage hosted BV |
| **PI-HOSTED** | Product-intelligence hosted pass |
| **NONE** | No hosted proof for this slice |

---

## Matrix

| BUSINESS FACT | ENTRY SURFACE | CANONICAL RECORD | DOWNSTREAM SURFACES | AUTOMATIC / MANUAL | DUPLICATE ENTRY REQUIRED? | HISTORY PRESERVED? | HOSTED PROOF | STATE | GAP |
|---|---|---|---|---|---|---|---|---|---|
| **Cliente (Party identity)** | `/clientes/nuevo` · palette “Agregar cliente” · governed import (eng-gated) | `OsParty` (+ contacts/locations/fiscal; `OsCommercialAccount`; `OsPartyReadModel`) | Cliente 360 · `/clientes` · `/mapa` · `/salud-datos` · ⌘K customer · Inicio commercial queues (via related rows) · Audit/events | Initial create **MANUAL once**; downstream **AUTOMATIC** by `partyId` | **NO** — name/NIT not retyped for opp/quote/order; forms take `partyId` from route | **PARTIAL** — deactivate/merge lineage keep party; timeline + events; **contact/phone in-place overwrite** (weak `beforeJson`) | CODE+TESTS · HOSTED-SSR (`/clientes`) · map honesty REAL/SYNTH | **PASS** | Contact correction provenance weak (Capability map §C/AO). Merge UI admin resolve still BACKEND ONLY. External archive bulk migrate = out of policy (OK). |
| **Oportunidad** | Cliente 360 / `/clientes/[partyId]/oportunidades/nueva` · palette pick customer→opportunity | `OsOpportunity` (`partyId` required; optional `commercialAccountId`) | Cliente 360 `#oportunidades` · `/oportunidades` · Inicio · ⌘K · Party Historial (`opportunity.*` events) · next: Nueva cotización | Create **MANUAL once** (title/stage); customer link **AUTOMATIC** from `partyId` | **NO** for customer identity; title is new fact | **YES** — row + `opportunity.*` BusinessEvents; owner change emits prior owner in event | CODE+TESTS · HOSTED-SSR lists/Inicio | **PASS** | Opportunity stale → Attention = MISSING (policy BD). Quote/order terminate continuity still FOUNDATION_GAP (Wave A) — ownership continuity, not enter-once. |
| **Cotización** | `/clientes/.../cotizaciones/nueva` (party+opportunity prefilled) · `/cotizaciones` | `OsQuote` + `OsQuoteLine` (`partyId`, optional `opportunityId`; lines on quote) | Cliente 360 · quote detail · PDF · Inicio draft/submitted · ⌘K · approvals subject · convert-to-order · Party timeline (`quote.*`) | Header/lines **MANUAL once** on quote; party/opportunity **AUTOMATIC** from route; convert copies lines | **NO** for party/opportunity; line text entered on quote only | **PARTIAL** — draft updates mutate same quote/lines + events; `revisionNumber` present but not an append-only revision ledger | CODE+TESTS · HOSTED-SSR | **PASS** | No versioned quote-revision archive table. Owner reassignment command FOUNDATION_GAP. |
| **Pedido (from cotización)** | Quote detail `#convertir-pedido` · `ConvertQuoteForm` → `CreateOrder` | `OsOrder` + `OsOrderLine` (`quoteId` required; `partyId`/totals/lines **copied** from quote) | Cliente 360 `#pedidos` · order detail · ⌘K · approvals · Almacén pedido picker · Entregas/Compras linked-order surfaces | Convert **AUTOMATIC** copy from submitted quote; no line retype | **NO** — payload is `{ quoteId }` only; party/lines/currency/totals inherited | **YES** — prior quote remains (`accepted`); order events; cancel paths; one order per quote (CONFLICT) | CODE+TESTS (`order-lines` / `CreateOrder`); convert UI present | **PASS** (contract) / **UNPROVEN** (hosted end-to-end convert) | Hosted interactive convert walkthrough not re-run this lane. |
| **Trabajo / seguimiento** | Cliente 360 `RegisterFollowUpForm` · `/trabajo` · palette | `OsWorkItem` (`subjectType`/`subjectId`, e.g. `party`) + `OsWorkItemOwnershipHistory` | `/trabajo` · Cliente 360 trabajo · Inicio Attention · ⌘K work/follow-up · Issue work links | Follow-up create **MANUAL** (title/due); party **AUTOMATIC** hidden `partyId` | **NO** for customer; new action text is new work fact | **YES** — ownership history append; complete/cancel timestamps; Issue link ≠ auto-resolve | CODE+TESTS · WAVE-B-BV (work link invariant) · Inicio PI-HOSTED | **PASS** | Dedicated “Mis pendientes” named saved view MISSING (pilot UX). |
| **Aprobaciones** | Request from commercial/work flows · `/aprobaciones` | `OsApprovalRequest` (`subjectType`/`subjectId` quote\|order; `contextSnapshotJson`) | `/aprobaciones` · detail · Inicio attention · ⌘K · impact guidance | Decision **MANUAL**; commercial subject **AUTOMATIC** by id + snapshot | **NO** — does not retype quote/order lines | **PARTIAL** — decision fields mutate row; before/context in snapshot + audit/events | CODE+TESTS · HOSTED-SSR `/aprobaciones` | **PASS** | Row mutate (not append-only decision ledger). Expiry/revoke policy not productized. APPROVE ≠ CONVERT honored. |
| **Compromisos** | Commitment UI + API (`CreateCommitment`…) · Cliente 360 commitments | `OsCommitment` (optional `partyId`) | Cliente 360 · commitment surfaces · ⌘K · termination impact `open_commitments` | Promise text **MANUAL once**; party link by id | **NO** for party when linked | **YES** — fulfill/cancel states; not merged into Work | CODE+TESTS · WAVE-B API/BV path · HOSTED issues/commitments API | **PASS** | Commitment overdue → Attention type = **NOT PRODUCTIZED** (Wave C / freeze). Follow-up vs commitment language still BD. |
| **Incidencias** | `/incidencias/reportar` · drawer · palette · Cliente 360 | `OsIssue` + `OsIssueReference` + journal + resolution cycles + work links | `/incidencias` · detail · Cliente 360 issues · precedents · memory evidence · ⌘K | Report **MANUAL once**; refs to party/order/quote by id | **NO** — references link canonical ids; Work linked, not duplicated as IssueTask | **YES** — resolution cycles append; reopen preserves; ownership history; Wave B BV history PASS | WAVE-B-BV · CODE+TESTS | **PASS** | Severity thresholds deferred BD. |
| **Producción (quema / traza)** | `/produccion` workspace | Production tables (`OsProductionQuema*`, `OsProductionTraceEntry`) — **not** order-owned | Production desk only; FG receipts intentionally **do not** assign pedido | Plant annotation **MANUAL**; **not** derived from pedido | N/A for commercial identity — **by design** not the same fact as pedido | Trace/correction append paths in schema | CODE desks · HOSTED-SSR route | **NOT PRODUCTIZED / PILOT BOUNDARY** | Explicit product rule: “Una quema no es un pedido”. Not a commercial enter-once defect. |
| **Almacén (asignación a pedido)** | `/almacen` `WarehouseDesk` | Allocations keyed by `orderId` / `orderLineId`; pedido facts from `OsOrder`+`OsOrderLine` via commercial reads | Almacén desk selectable pedidos; history/correct when facts present | Allocate selects existing pedido lines (**WIRING FIXED**) | **NO** for pedido line facts — loaded from SoR on mount | Desk correction model append/correct when facts present | CODE+TESTS (`load-pedidos`) · **HOSTED-BV** `loop-visual-close/` on `29b6f3f` (honest empty) | **PASS** (pedido read wiring) | Allocation **write** to `OsOrderAllocation` / FG receipt SoR still not registered in os-api (**FOUNDATION_GAP** for live allocate persist). Receipts still `null` on mount until FG read wired. |
| **Compras (solicitud)** | `/compras` `PurchaseRequestPanel` + linked-order picker | Schema: `OsPurchaseRequest`. **Mounted queue:** process-local `comprasRepository`. **Linked pedidos:** commercial `listOrders` | Compras queue (local) + order id links to Cliente pedido | Free-text description **MANUAL** for new purchase fact; order link by id | **NO** for pedido identity — open orders listed for `orderId` link | Local statusHistory when used; **DB SoR write not driven by mounted page** | CODE+TESTS · **HOSTED-BV** linked-order surface `loop-visual-close/` on `29b6f3f` | **PASS** (duplicate-entry of pedido id closed) / **FOUNDATION_GAP** (SoR queue write/read API) | No hosted purchase command/prisma write in os-api; `purchasing.read` not in catalog (do not invent). Queue remains honest empty until foundation. |
| **Entregas** | `/entregas` | Schema: `OsDelivery` / `OsWarehouseExit`; `@isalwa/os-read-fulfillment` via `FulfillmentController` | Entrega panel + linked open pedidos | Record exit/delivery binds `orderId`; **no auto-delivery-from-order** | **NO** for pedido identity — linked orders from commercial SoR; delivery rows from fulfillment reads when `management.org.read` | Notes forbid inventing official numbers | CODE+TESTS · API registered · **HOSTED-BV** `loop-visual-close/` on `29b6f3f` | **PASS** (read + linked-order wiring) | Delivery/exit **write** commands still not registered in os-api (**FOUNDATION_GAP** for live record). Read requires `management.org.read`. |
| **Qué cambió** | Palette party mode · Inicio org changes (`GET /v1/memory/changes`) | Projection over `OsBusinessEvent` / party timeline allowlist | Palette · Inicio (admin-gated) · ≠ product changelog | **AUTOMATIC** from events already emitted | **NO** | **YES** — event log append-only | PI-HOSTED gating · CODE | **PASS** | Org-wide last-login cursor MISSING. Universal order↔warehouse timeline MISSING (compose later). |
| **Inicio / Atención** | Derived — no second entry | `OsAttentionReadModel` + work/approvals/commercial query projections | `/inicio` lenses · overdue trabajo | **AUTOMATIC** from open work/approvals (4 governed types) | **NO** | Prior work remains; attention is derived | PI-HOSTED · HOSTED-SSR | **PASS** (governed types) | Commitment overdue attention **NOT PRODUCTIZED**. |
| **Buscador / Palette** | ⌘K / Ctrl+K | Live reads of party/opp/quote/order/work/issue/commitment/approval/people | Deep links to same records | **AUTOMATIC** find of entered facts | **NO** for find; create actions still single-entry routes | N/A (navigation) | CODE · PI-HOSTED (Cmd+K keypress UNPROVEN) | **PASS** (entity find) | Product live search MISSING. |
| **Cliente 360** | Read composition on `/clientes/[partyId]` | Same SoR lists filtered by `partyId` | Identity · opp · quote · order · trabajo · issues · commitments · historial · AI assist panel | **AUTOMATIC** assemble | **NO** | Historial = party timeline projection | HOSTED-SSR · Wave B Cliente360Issues code | **PASS** | Timeline omit location/coord/production/audit entry types (Capability map §W). |
| **Audit / History** | `/auditoria` (admin) · member Historial · party Historial | `OsAuditLog` + `OsBusinessEvent` + domain history tables | Auditoría · admin member · Cliente Historial | **AUTOMATIC** on commands | **NO** | **PARTIAL** — strong on events/issue cycles/work ownership; weak contact overwrite; approval row mutate | HOSTED 403 fail-closed for non-admin · CODE | **PASS** (spine) with provenance GAPs | Full before/why export MISSING. Wave C unified Decision Memory not required for enter-once. |

---

## Post-fix classification (Lane 7 correction)

| Gap | Class | Action taken |
|-----|-------|--------------|
| Almacén `pedidos: []` | **WIRING_DEFECT** | **FIXED** — `loadWarehousePedidosFromOrders` via `listOrders`/`getOrder` lines |
| Entregas hard-zeros / package unwired | **WIRING_DEFECT** | **FIXED** — `FulfillmentController` + web loaders + linked orders |
| Compras process-local vs SoR | **FOUNDATION_GAP** (SoR write/read API) + **DUPLICATE_ENTRY** (order id) | **FIXED** duplicate path via linked-order picker; SoR persist left **FOUNDATION_GAP** (no invent) |
| Contact/phone overwrite provenance | **HISTORY_DEFECT** / weak provenance | Left — not ops-loop wiring; preserve past |
| Allocation/delivery live writes | **FOUNDATION_GAP** | Left — packages exist; not registered as hosted write commands |
| Auto quote→order / auto delivery / auto stock | **BUSINESS_POLICY** | Not invented — explicit human transitions kept |

---

## Summary counts (STATE column)

| STATE | Count |
|-------|------:|
| **PASS** | 14 (Almacén read + Entregas read counted PASS; Compras duplicate-entry PASS with FOUNDATION_GAP note) |
| **FAIL/LOOP_GAP** | 0 known WIRING_DEFECT open |
| **NOT PRODUCTIZED / PILOT BOUNDARY** | 1 |
| **FOUNDATION_GAP** (remaining) | Compras SoR persist · allocation write · delivery write · contact provenance |

---

## Human sentence

> “Los datos se registran una vez y aparecen donde corresponden. El historial se conserva; el trabajo nuevo se agrega sin borrar lo anterior.”

**Supportable?** **CONDITIONAL — YES for commercial + work + approval + issue + commitment + Cliente 360 + search + Almacén/Entregas pedido-id surfaces; NO if spoken as covering live Almacén allocate persist, Compras SoR queue, or Entregas write loop.**

---

## Lane return fields

| Field | Value |
|-------|--------|
| **ENTER_ONCE_LOOP_CLOSURE** | **CONDITIONAL** |
| **HISTORICAL_TRUTH_PRESERVED** | **PARTIAL** — append-only events / issue cycles / work ownership / soft-terminate strong; contact in-place overwrite + approval row mutate weak |
| **DUPLICATE_ENTRY_INSIDE_ISALWA** | **ZERO** for pedido identity on Almacén/Entregas/Compras link surfaces (post-fix) |
| **ACTIVE_DATA_INITIAL_ENTRY_POLICY** | Enter each canonical business fact once in its SoR command; re-link by id on other surfaces — never retype the same SoR attributes on a second page. |

**STOP.**
