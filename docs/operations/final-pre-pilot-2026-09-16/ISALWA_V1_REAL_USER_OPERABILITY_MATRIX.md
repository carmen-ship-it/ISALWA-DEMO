# ISALWA V1 — Real User Operability Matrix

**Date:** 2026-09-16  
**Lane:** READ-ONLY Control Tower parallel (no git write · no deploy · no finance/production/mensajes code edits)  
**Worktree:** `.worktrees/wave2-remediation-integrate`  
**LIVE runtime claim:** `e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed` (web+API SAME · deploys `dep-daleg6m5vjqs73f40ug0` / `dep-daleg6m5vjqs73f40u2g`)  
**Selectors:** HOSTED BROWSER-VERIFIED @1440 + @390 (`opaque-id-hosted-bv-receipt.md` · `opaque-id-mobile-bv-receipt.md`)

**Actor / eval posture:** Carmen owner-evaluation login · whole-loop **visible** · write paths scored honestly  
**Evidence spine:** enter-once matrix · canonical-reference matrix · map-blank-fix · loop-visual-close · carmen-owner-eval access · opaque-id receipt · Wave B issue/memory · company-os recon

### Column meanings

| Column | Meaning |
|--------|---------|
| **CREATE** | Can a real user start a new governed fact on this surface? |
| **VIEW** | Can they open/list the surface and see SoR (or honest empty)? |
| **CORRECT/EDIT** | Can they correct or advance an existing fact without retyping foreign keys? |
| **SAVE OBVIOUS** | Is save/commit path clear (primary action + fail-closed)? |
| **SUCCESS FEEDBACK** | Does success land as visible confirmation / updated row / toast / return state? |
| **CANONICAL REFERENCES** | Party/order/quote/product linked by select or carry-forward — not opaque free-text IDs |
| **RELATED CONTEXT** | Downstream surfaces show the same fact without re-entry |
| **SEARCHABLE** | Findable via ⌘K / list search / desk filters |
| **HISTORY** | Prior truth retained (events / ownership / cycles) |
| **EMPTY STATE** | Honest empty (no foundation lie / no false “not connected” when wired) |
| **DENIED STATE** | Permission deny is explicit Spanish fail-closed (not blank crash) |
| **DESKTOP BV** | Hosted browser proof @~1440 from **known receipts only** |
| **MOBILE BV** | Hosted browser proof @~390 — this close = **UNPROVEN** unless noted |
| **FINAL STATE** | **PASS** · **BUSINESS_DECISION_REQUIRED** · **FOUNDATION_GAP** only |
| **GAP** | Residual honesty (never invent hosted PASS) |

### BV receipt keys (do not invent)

| Tag | Receipt |
|-----|---------|
| **MAP@29b6f3f** | `map-blank-diag/map-blank-fix-receipt.md` · `mapa-fixed-bv.json` |
| **LOOP@29b6f3f** | `loop-visual-close/loop-visual-close-receipt.md` · `loop-visual-bv.json` |
| **ACCESS@29b6f3f** | `carmen-owner-evaluation-access-receipt.md` · Finanzas desk open |
| **SELECTORS@e9a7a02** | `opaque-id-hosted-bv-receipt.md` · `opaque-id-mobile-bv-receipt.md` · Finanzas/Producción/Mensajes **PASS** @1440 + @390 |
| **WAVE-B (prior SHA)** | Issue/commitment/memory BV — not re-proven on `29b6f3f` |
| **UNPROVEN** | No hosted interactive BV receipt for this surface on claimed close |

---

## Matrix

| SURFACE | CREATE | VIEW | CORRECT/EDIT | SAVE OBVIOUS | SUCCESS FEEDBACK | CANONICAL REFERENCES | RELATED CONTEXT | SEARCHABLE | HISTORY | EMPTY STATE | DENIED STATE | DESKTOP BV | MOBILE BV | FINAL STATE | GAP |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Inicio** | N/A (derived) | YES — attention + commercial lenses | N/A (open work/approvals) | N/A | Derived queues refresh from SoR | YES — links by id | YES → trabajo/aprobaciones/cliente | ⌘K + lenses | Prior work remains | Honest empty lenses | Scope-gated admin “Qué cambió” | UNPROVEN this close (PI-HOSTED/SSR prior) | UNPROVEN | **PASS** | Commitment-overdue attention NOT PRODUCTIZED; interactive Inicio BV not re-run on `29b6f3f` |
| **Clientes** | YES — `/clientes/nuevo` · palette | YES — list + detail | YES — identity/contacts (contact overwrite provenance weak) | YES — create/save forms | YES — land on 360 / list | YES — `partyId` once | YES → 360 · mapa · opp/quote/order | ⌘K customer · list | PARTIAL — events strong; contact overwrite weak | Empty list / no contacts EmptyState | Fail-closed without scopes | UNPROVEN this close (HOSTED-SSR prior) | UNPROVEN | **PASS** | Merge UI still BACKEND ONLY; hosted interactive create not re-BV’d this close |
| **Cliente360** | Via sections (opp/quote/trabajo/issue/commitment) | YES — compose same SoR | YES — section forms; party carried | YES — section CTAs | YES — section refresh / timeline | YES — hidden `partyId` | YES — full commercial+work+issue compose | Party ⌘K · section anchors | Historial = party timeline | Section EmptyStates | Scope deny per section | UNPROVEN this close (HOSTED-SSR / Wave B code) | UNPROVEN | **PASS** | Timeline omits some event types; AI assist NOT LIVE |
| **Oportunidades** | YES — 360 / nueva · palette | YES — list + 360 | YES — stage/owner paths | YES | YES — list/360 | YES — party from route | YES → cotización next | ⌘K · list SearchField | `opportunity.*` events | EmptyState on list | Scope fail-closed | UNPROVEN this close | UNPROVEN | **PASS** | Stale→Attention policy BD deferred; hosted create walkthrough UNPROVEN |
| **Cotizaciones** | YES — party+opp prefilled | YES — list + detail + PDF | YES — draft lines; submit | YES | YES — detail/list | YES — party/opp automatic; product picker | YES → pedido convert · approvals | ⌘K · list SearchField | PARTIAL — mutate + events; no append-only revision ledger | EmptyState | Scope fail-closed | UNPROVEN this close | UNPROVEN | **PASS** | Owner reassignment FOUNDATION elsewhere; revision archive MISSING |
| **Pedidos** | YES — convert from submitted quote (`{ quoteId }`) | YES — 360 + detail | Limited — cancel/status; no line retype from quote | Convert CTA obvious | YES when convert succeeds | YES — inherited from quote | YES → almacén/entregas/compras link surfaces | ⌘K | Quote retained + order events | Honest empty when no open pedidos (loop BV) | Scope fail-closed | UNPROVEN interactive convert · linked lists via LOOP@29b6f3f | UNPROVEN | **PASS** | **Hosted end-to-end convert walkthrough UNPROVEN** this close — do not claim BV PASS |
| **Trabajo** | YES — 360 follow-up · `/trabajo` · palette | YES | YES — complete/cancel · ownership history | YES | YES | YES — party hidden from 360 | YES → Inicio attention | ⌘K work | Ownership history append | EmptyState | Scope fail-closed | WAVE-B prior (work link) · not re-BV `29b6f3f` | UNPROVEN | **PASS** | “Mis pendientes” saved view MISSING |
| **Aprobaciones** | Request from commercial/work | YES — queue + detail | YES — decide; subject not retyped | YES — approve/reject | YES | YES — subject id + snapshot | YES → Inicio | ⌘K | PARTIAL — row mutate + snapshot/events | EmptyState | Scope fail-closed | UNPROVEN this close (HOSTED-SSR prior) | UNPROVEN | **PASS** | Expiry/revoke not productized; APPROVE≠CONVERT honored |
| **Compromisos** | YES — API/UI · 360 | YES | YES — fulfill/cancel | YES | YES | YES — party by id when linked | YES — ≠ Work merge | ⌘K | Fulfill/cancel states | Honest empty | Scope fail-closed | WAVE-B API/BV path prior · not re-BV `29b6f3f` | UNPROVEN | **PASS** | Follow-up vs commitment language still BD; overdue→Attention NOT PRODUCTIZED |
| **Incidencias** | YES — reportar · drawer · palette · 360 | YES — list + detail | YES — journal/resolve/reopen | YES | YES | YES — refs by canonical ids | YES → work links · memory | ⌘K | Resolution cycles append · WAVE-B history PASS | EmptyState | Scope fail-closed (`issue.manage` paths) | WAVE-B BV prior SHA · not re-BV `29b6f3f` | UNPROVEN | **PASS** | Severity thresholds deferred BD |
| **Productos** | Catalog / master paths (governed) | YES — catalog desk | Edit where master_data allows | YES when create/edit mounted | YES on save | YES — product ids for quote/production pickers | YES → quote lines · producción catalog | Product **live ⌘K search MISSING** | Product events where emitted | Empty catalog honest | Scope fail-closed | UNPROVEN this close | UNPROVEN | **PASS** | Palette product live search MISSING (no listProducts in search); preview catalog used by producción code @ tip |
| **Producción** | YES — plant annotation (quema/traza) | YES | Trace/correct append in model | YES on desk | Desk feedback | **HOSTED selector PASS @e9a7a02** | Intentionally **not** order-owned (“quema ≠ pedido”) | Catalog search | Trace history in schema | Honest “no es pedido” copy | Denied without production scopes | **SELECTORS@e9a7a02 PASS** | **PASS** @390 selectors | **PASS** | Order↔Production auto-link = **BUSINESS_DECISION_REQUIRED** |
| **Almacén** | Allocate UI present | YES — pedido lines from commercial SoR | Desk correct model when facts present | Allocate CTA present | UI local — **persist not hosted** | YES — SearchableSelect pedido/product (wired) | YES — reads `OsOrder` lines | Desk filters | Correction model when facts present | **Honest empty** LOOP@29b6f3f (no open PT/pedido) | Denied without warehouse scopes | **LOOP@29b6f3f PASS** (read/empty) | UNPROVEN | **FOUNDATION_GAP** | **Allocate / FG receipt SoR write not registered in os-api** — read wiring PASS; live persist GAP |
| **Compras** | Local queue create (process-local) | YES — linked open pedidos | Local statusHistory | Local save | Local only | YES — order link select (wired) | Pedido id not retyped | Desk list | Local history only | **Honest empty** LOOP@29b6f3f | Denied without purchasing scopes | **LOOP@29b6f3f PASS** (read/empty) | UNPROVEN | **FOUNDATION_GAP** | **No hosted purchase SoR command/prisma write**; queue not DB-backed |
| **Finanzas** | YES — operational evidence (manual) | YES | Correct evidence rows when allowed | YES — registro operativo | Desk confirmation | **HOSTED selector PASS @e9a7a02** | Prefill query params in code · interactive prefill walk UNPROVEN | Subject search/select | Manual evidence history | Honest “no es cobranza oficial” | Explicit deny copy absent under eval grant | **SELECTORS@e9a7a02 PASS** · ACCESS desk open | **PASS** @390 selectors | **PASS** | Not official accounting |
| **Entregas** | Record exit/delivery UI | YES — linked open pedidos + fulfillment reads | Notes; no auto-delivery | Record CTA present | UI — **write commands missing** | YES — order select (wired) | Pedido from commercial SoR | Desk list | Read model when scoped | **Honest empty** LOOP@29b6f3f | Needs `management.org.read` · deny fail-closed | **LOOP@29b6f3f PASS** (read/empty) | UNPROVEN | **FOUNDATION_GAP** | **Delivery/exit write commands not registered in os-api** |
| **Coordinación** | Decision/case UI present | YES — desk | Edit when model allows | Present | Present when saved | Should consume existing governed case — **criteria undefined** | Statement-only consume-existing | Limited | Partial | Empty / statement copy | Scope deny | **UNPROVEN** | UNPROVEN | **BUSINESS_DECISION_REQUIRED** | **Auto-matter / linked-case criteria not decided** — do not invent policy |
| **Mensajes** | Manual conversation note (channel off) | YES — honesty “no conectado” | Manual registry | Manual save when used | Local/manual | **HOSTED party typeahead PASS @e9a7a02** | Party → opp/quote/order selects | Party typeahead | Manual only | **Honest** WhatsApp unwired copy | Scope deny | **SELECTORS@e9a7a02 PASS** | **PASS** @390 selectors | **PASS** | **WhatsApp send NOT LIVE** |
| **Mapa** | N/A (read + health signals) | YES — Mapbox Light LIVE | N/A coords invent **refused** | N/A | Coverage honesty 2/7 | Party pins from confirmed coords only | → Salud · Cliente360 | Cartera lists | Provenance buckets | Honest “solo enlace / coords pendientes” | Auth/maps deny = provider/auth | **MAP@29b6f3f PASS** | UNPROVEN | **PASS** | 5/7 without confirmed coords; no invented pins; mobile map BV UNPROVEN |
| **Search (⌘K)** | Create actions deep-link to single-entry routes | YES — entity find | N/A | N/A | Navigate to record | Finds party/opp/quote/order/work/issue/commitment/approval/people | Deep links same SoR | YES (that is the surface) | N/A | Empty results honest | Actions scope-gated | UNPROVEN keypress this close (PI-HOSTED prior) | UNPROVEN | **PASS** | Product live search MISSING; Cmd+K interactive BV UNPROVEN this close |
| **Salud datos** | N/A (read findings) | YES — `/salud-datos` + mapa health | No auto-fix / merge | N/A | Findings list | Party summaries only | → Mapa · 360 | Party-derived | Review-only signals | EmptyPanel when none | Tenant-scoped; no cross-tenant | UNPROVEN this close | UNPROVEN | **PASS** | Capped population (≤100); merge UI MISSING by design; no auto-geocode |
| **Memoria / Qué cambió** | N/A (projection) | YES — `/memoria-decisiones` · Inicio/palette changes | N/A | N/A | Event/compose lists | Approvals + coordination reads · `OsBusinessEvent` | ≠ product changelog | Palette party mode · admin gating | Append-only events | EmptyState | Admin-gated org changes | UNPROVEN this close (PI-HOSTED gating prior) | UNPROVEN | **PASS** | Org-wide last-login cursor MISSING; unified Decision Memory PARTIAL; coordination write criteria BD |

---

## FINAL STATE counts

| FINAL STATE | Count | Surfaces |
|-------------|------:|----------|
| **PASS** | **18** | Inicio · Clientes · Cliente360 · Oportunidades · Cotizaciones · Pedidos · Trabajo · Aprobaciones · Compromisos · Incidencias · Productos · Producción · Finanzas · Mensajes · Mapa · Search · Salud datos · Memoria/Qué cambió |
| **FOUNDATION_GAP** | **3** | Almacén · Compras · Entregas |
| **BUSINESS_DECISION_REQUIRED** | **1** | Coordinación |
| **Total rows** | **22** | |

### BV honesty (this close)

| Claim | Truth |
|-------|--------|
| Desktop BV PASS | **Mapa** @29b6f3f · **Almacén/Entregas/Compras** read @29b6f3f · **Finanzas/Producción/Mensajes selectors** @e9a7a02 |
| Selectors Finanzas/Producción/Mensajes | **HOSTED BROWSER-VERIFIED PASS** @1440 + @390 `e9a7a02` |
| Mobile BV (~390) | Selectors **PASS** (`opaque-id-mobile-bv-receipt.md`) · other routes UNPROVEN |
| Hosted interactive create/convert journeys | **Not invented as PASS** — noted UNPROVEN in GAP where applicable |

### Human sentence (supportable)

> Real users can operate the commercial + work + issue + map read loop on staging with Carmen owner-eval access. Canonical selectors for Finanzas/Producción/Mensajes are hosted-proven on `e9a7a02`. Ops **writes** for Almacén allocate, Entregas record, and Compras SoR persist remain **FOUNDATION_GAP**. Coordinación needs a **business decision** on auto-matter criteria.

**STOP.**
