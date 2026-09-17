# PP-7 — Demo / SYNTH data · normal-route reachability · empty / misleading states

**Lane:** PP-7  
**Mode:** READ-ONLY audit (no product code edited)  
**As of:** 2026-09-17  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo`  
**RC2 failed SHA (immutable):** `8f1ac76185af432bb244ea94b7ae6a647eaa0ebc`  
**SYNTH org:** `01M2JKF77TXMJNDTKNCYNHH9G5`  
**Seed map:** `apps/os-web/lib/demo/seeded-ids.json` (`seededAt: 2026-09-17T13:10:41.619Z`)  
**REAL_SEVEN_MUTATED:** NO  

---

## Verdict strip

| Question | Answer |
|---|---|
| Is the DEMO graph coherent enough for major V1 Story / owner desks? | **YES for primary loop (DEMO MADERAS ORIENTE)** on SYNTH + Demo — party → opp → Q-000002 → O-000002 → DN → FG → work → commitment. Other four clients are intentionally sparse (convert / draft / ops-gap stories). |
| Do empty states hide existing records? | **YES historically (RC2 Pedidos=0)** — auth/own-lens empty looked like “no pedidos.” RC3 local graph fix **PASS**; **hosted Resumen Pedidos still UNPROVEN**. Other empties are mostly legitimate or org/mode mismatch, not missing seed. |
| Story Mode vs normal nav mismatch risk? | **MEDIUM–HIGH** until Carmen is on SYNTH and Demo SSR state is stable. Deep links target SYNTH IDs; sidebar / most Links still **drop** `?datos=demo` (cookie-dependent). OA-5 now appends `datos=demo` on Story app CTAs (code); older forensics that said “NO” are **stale**. |
| Known Pedidos=0 (RC2) context? | **PRODUCT P0**, not seed absence. Root cause: orders used `canViewCommercialRecord` (owner \| `people.admin`); Carmen had `commercial.org.read` only. Cliente360 own-lens list → Pedidos=0 while O-000002 existed. |

**PP7_DEMO_GRAPH_COHERENT_ENOUGH = YES (SYNTH+Demo, Maderas primary)**  
**PP7_EMPTY_HIDES_RECORDS_RISK = OPEN until hosted Pedido / Cliente360 BV**  
**PP7_STORY_NORMAL_NAV_PARITY = PARTIAL**  
**HOSTED_BV = UNPROVEN** (post-cut; not claimed here)

---

## Sources (read-only)

| Artifact | Role |
|---|---|
| `DEMO_SEED_ACTUAL_STATE.md` | Staging DB forensic counts vs catalog |
| `final-rc-evidence-0268843/FINAL_V1_DEMO_RECORD_GRAPH.md` | Normal-route ID matrix |
| `RC2_TO_RC3_DEFECT_DELTA.md` / `RC3_STATUS_SNAPSHOT.md` / `RC3_CLIENTE360_GRAPH_LOCAL.md` | Pedidos=0 root cause + local fix |
| `workers/oa6-receipt.md` | Ops/map/finance/gerencia POPULATED vs LEGITIMATELY_EMPTY |
| `DEMO_MODE_STATE_RECONCILIATION.md` / `NAVIGATION_STATE_PRESERVATION_AUDIT.md` | Query vs cookie vs localStorage |
| `STORY_MODE_20_STEP_RECONCILIATION.md` + `workers/oa5-receipt.md` | Story deep-link parity (forensic vs OA-5 code fix) |
| `CARMEN_OWNER_PATH_REPRO.md` | REAL-org Demo empty vs SYNTH people-admin PASS |
| `apps/os-web/lib/demo/story-mode-steps.ts` | Current Story CTA `withStoryDemoDatos` |
| `apps/os-web/app/(app)/conversaciones/page.tsx` | Durable rows vs JSON fixture fill |
| `workers/pf7-seed-requests.md` | Audit href / event density requests |

---

## 1. DEMO / SYNTH graph coherence

### Density (seed forensic)

| Type | Count (5 DEMO parties) | Notes |
|---|---:|---|
| parties | 5 | All catalog IDs present |
| opportunities | 7 | Includes densify extras |
| quotes | 5 | One per client |
| orders | 3 | Maderas, Hotel, Ferretería |
| delivery notes | 2 | Maderas + Hotel (Hotel no salida) |
| finished-goods receipts | 2 | Maderas + Hotel |
| warehouse exits | 1 | Maderas only |
| work / commitments / issues | 8 / 2 / 3 | Densify present |
| DEMO quote approvals | **0** | Desk empty is intentional |
| `os_customer_conversations` (DB forensic) | **0** | UI may use JSON fixtures under Demo |

### Scenario matrix (intentional sparsity)

| Client key | Quote | Order | Story purpose | Empty that is OK |
|---|---|---|---|---|
| `maderas_oriente` | Q-000002 accepted | O-000002 + DN + FG + exit | **Primary full loop** | — |
| `constructora_andina` | Q-000006 **draft** | none | Pre-send / draft desk | Pedidos / DN |
| `proyectos_del_sur` | Q-DEMO-001 **submitted** | none | Convert-path remaining | Pedidos until convert |
| `hotel_central` | Q-000004 accepted | O-000003 + DN **no** exit | Pedido sin salida | Salida / Entrega progress pending |
| `ferreteria_norte` | Q-000005 accepted | O-000004, **no** DN | Issues densify / ops gap | DN / FG |

**Coherence bar for V1:** Maderas graph is enough to walk commercial → pedido → nota → almacén facts on normal routes **when** actor is SYNTH + Demo + Pedido read auth. Sparse siblings must not be scored as “seed bugs.”

### Conversation coherence caveat

- `conversaciones/page.tsx`: prefer durable `listCustomerConversations`; JSON fixtures (`ownerDemoConversationFixtures`) only when `dataMode === 'demo'` **and** `durableRows.length === 0`.
- Forensic DB: **0** durable rows for DEMO parties → Demo desk relies on fixtures.
- `FINAL_V1_DEMO_RECORD_GRAPH.md` lists natural keys `owner-demo-conversation:*` as durable — treat as **desired / partial proof**, not guaranteed staging SoR until re-verified after deploy/seed.
- **Mismatch risk:** if durable API returns a non-empty but incomplete set, fixtures are **not** merged in → Story “Llega una conversación” can look thinner than fixture catalog.

---

## 2. Known Pedidos=0 (RC2) — context for empty/misleading UI

| Field | Value |
|---|---|
| DEFECT | Carmen Owner Evaluation (SYNTH, no View As) cannot read DEMO MADERAS Pedido |
| HOSTED_REPRO_BEFORE | `/clientes/01M2PM95…/pedidos/01M2PMA280…` → AccessDenied; **Cliente360 Resumen Pedidos=0** |
| ROOT_CAUSE | `getOrder` / `listOrders` used `canViewCommercialRecord` (owner **or** `people.admin`). Quotes already used `canReadOwnedRecord` / `commercial.org.read`. Order owned by `w2.asesor`. |
| NOT the cause | Missing seed order — O-000002 **exists** in SYNTH |
| UI misleading copy | Walkthrough empty: *“Todavía no hay pedidos activos para este cliente.”* (`lib/walkthrough/copy.ts`) — reads as absence of records, not auth/visibility |
| RC3-A local | Orders aligned to `resolveOwnerReadScope` + `canReadOwnedRecord`; Cliente360 `listPartyScoped` prefers `visibility: 'org'` then own fallback (`load-cliente-360.ts`) |
| Local proof | `RC3_CLIENTE360_GRAPH_LOCAL.md` **PASS**; `order-owner-eval-read.test.ts` **G** (org list returns Pedido; own lens empty for non-owner) |
| Hosted after | **UNPROVEN** until RC3 deploy + freeze BV |

**Classification:** AUTH_HIDDEN / VISIBILITY_LENS empty — highest-severity “empty hides existing records” defect in this train.

---

## 3. Empty / misleading state taxonomy (major V1 pages)

Legend:

- **POPULATED** — seed + code imply visible DEMO rows for the page’s primary job (SYNTH + Demo).
- **LEGITIMATELY_EMPTY** — empty matches zero seed / product authority.
- **MISLEADING_EMPTY** — UI implies “nothing exists” while records exist but are filtered/denied/wrong org/mode.
- **NOT_EVIDENCED** — product forbids the claim (e.g. official accounting).

| Route | Primary job under SYNTH+Demo | Empty class | Misleading risk |
|---|---|---|---|
| `/clientes` | 5 DEMO parties | POPULATED if Demo SSR; else MISLEADING on REAL or cookie miss | **HIGH** if chrome says Demo and list filters as real / REAL org |
| `/clientes/{maderas}` Cliente360 | Opp/quote/order graph | POPULATED after RC3 org lens; RC2 was MISLEADING Pedidos=0 | **HIGH until hosted BV** |
| `/oportunidades` / `/cotizaciones` | DEMO commercial lists | POPULATED (filterByDemoDataMode) | MEDIUM (same mode split) |
| Pedido deep link Maderas | O-000002 | POPULATED after auth fix; RC2 AccessDenied | **HIGH until hosted** |
| `/conversaciones` | Fixtures if no durable | POPULATED (fixture path) or sparse durable | MEDIUM (fixture vs durable) |
| `/aprobaciones` | Pending queue | **LEGITIMATELY_EMPTY** (0 DEMO quote approvals) | LOW — copy says no one asked yet; example notes approve ≠ pedido |
| `/trabajo` | DEMO work labels | POPULATED (seed + densify) | MEDIUM assignee/View As |
| `/compromisos` | Seed + densify | POPULATED / partial buckets | LOW–MEDIUM |
| `/incidencias` | Ferretería densify | POPULATED for that party | LOW |
| `/produccion` `/almacen` `/compras` `/entregas` | 3 DEMO pedidos | POPULATED; PR/OC queue **LEGITIMATELY_EMPTY** | LOW (OA-6 honesty) |
| `/finanzas` | Ops desk + pending confirm | POPULATED ops; accounting **NOT_EVIDENCED** | LOW if copy held |
| `/mapa` | 5 DEMO pins | POPULATED | LOW |
| `/inicio` / `?lente=gerencia` | Funnel from DEMO records | POPULATED; pending-approvals **0** LEGITIMATELY_EMPTY | LOW |
| `/auditoria` | Org audit search | Depends on real event density | MEDIUM — empty copy *“Sin registros con estos filtros”* can hide missing seed events vs filter miss; Story paso 19 still points at `/inicio`, not `/auditoria` (`hrefHints.audit`) |

### Mode / org empties (not seed gaps)

1. **ORG_MISMATCH** — Demo toggle filters **inside** session org. Carmen on REAL + `?datos=demo` → *“No hay clientes registrados”* while Story IDs are SYNTH (`CARMEN_OWNER_PATH_REPRO.md`).
2. **STATE_SPLIT** — Client banner/toggle can show Demo while SSR `resolveDemoDataMode` reads real (cookie/query miss). Sidebar Links **omit** `?datos=` by design (`NAVIGATION_STATE_PRESERVATION_AUDIT.md`: 82/89 drop query).
3. **Cookie-only desks** — `almacen` / `produccion` / entregas linked loaders pass `{}` to `resolveDemoDataMode` (query ignored; cookie only).

---

## 4. Story Mode vs normal navigation

### Current code (this worktree)

- `story-mode-steps.ts` wraps app CTAs with `withStoryDemoDatos` → appends `?datos=demo` (PDF `/api/.../pdf` unchanged).
- OA-5 receipt: **IMPLEMENTED + TESTED** locally; hosted **UNPROVEN**.
- Older `STORY_MODE_20_STEP_RECONCILIATION.md` / nav audit “Story CTAs DROPS 20” / Carmen path “href without datos” are **pre–OA-5** for query param; do not treat as current code truth.

### Residual mismatch risks (still open)

| Risk | Evidence | Severity |
|---|---|---|
| Story deep-links SYNTH record IDs while session org is REAL | Carmen path FAIL; empty list + “Cliente no disponible” | **P0 for owner path** until SYNTH membership |
| Sidebar / breadcrumbs / commercial href builders still drop `datos` | Nav audit DROPS 82 | MEDIUM — cookie must stay `demo` |
| Story paso 19 “Auditoría” → `/inicio`, not `/auditoria` | `hrefHints.audit: "/inicio"`; PF-7 seed request unmet | LOW–MEDIUM narrative mismatch |
| Story claims conversation evidence while DB may have 0 durable rows | Fixture fill only when durable empty | MEDIUM honesty |
| View As / ops suppressNegotiation can empty commercial sections on purpose | RC3 View As narrowing | Expected — do not score as seed hole |

**STORY_MODE_NORMAL_NAV_PARITY:**

- **PASS-ish** for SYNTH people-admin / owner-eval after OA-1 membership + Demo cookie (deep link + list both can work).
- **FAIL** for Carmen on REAL Staging with Demo chrome.
- Hosted re-proof after RC3 cut: **required**.

---

## 5. Normal-route reachability checklist (Maderas primary)

Assuming: SYNTH org · Demo mode resolved on SSR · RC3 Pedido auth deployed · no View As (or commercial View As).

| Record | Normal route | Reachable without Story? | Hosted proven? |
|---|---|---|---|
| Client | `/clientes/{partyId}` (+ list `/clientes`) | YES if Demo list | PRIOR PARTIAL / RC BV; RC3 re-prove pending |
| Opportunity | Cliente360 comercial / opp URL | YES | PARTIAL |
| Quote Q-000002 | `/clientes/.../cotizaciones/{quoteId}` | YES | PARTIAL |
| Quote PDF | `/api/quotes/{id}/pdf` | YES (auth) | PARTIAL |
| Pedido O-000002 | `/clientes/.../pedidos/{orderId}` | YES after RC3-A | **RC2 FAIL; RC3 UNPROVEN** |
| DN + PDF | Entregas / pedido / API PDF | YES | PARTIAL |
| FG / salida facts | Almacén / pedido context | YES | UNPROVEN / PARTIAL |
| Work / commitment | `/trabajo`, `/compromisos` | YES | PARTIAL / UNPROVEN |
| Conversation | `/conversaciones` | YES via fixture or durable | PARTIAL |
| Approval | `/aprobaciones` | N/A — none seeded | LEGITIMATELY_EMPTY |
| Audit events | `/auditoria` | IF events exist | UNPROVEN density |

---

## 6. What is *not* a PP-7 densify bug

- `/aprobaciones` empty with 0 DEMO approvals.
- Compras PR/OC queue empty.
- Gerencia pending-approvals metric 0.
- Hotel without salida; Ferretería without DN; Andina draft without order; Sur submitted without order.
- Finanzas without official ledger / confirmed revenue.
- Map without authoritative revenue layer.

---

## 7. PP-7 scoreboard (honest)

| Gate | Status |
|---|---|
| DEMO_GRAPH_MADERAS_COHERENT | **YES** (seed + ID map) |
| DEMO_GRAPH_FIVE_CLIENT_INTENTIONAL_SPARSE | **YES** |
| NORMAL_ROUTE_IDS_DOCUMENTED | **YES** (`FINAL_V1_DEMO_RECORD_GRAPH` + `seeded-ids.json`) |
| EMPTY_HIDES_PEDIDOS_RC2 | **CONFIRMED defect** (auth) |
| EMPTY_HIDES_PEDIDOS_RC3_LOCAL | **FIXED locally** — `CLIENTE360_GRAPH_LOCAL = PASS` |
| EMPTY_HIDES_PEDIDOS_HOSTED | **UNPROVEN** |
| DEMO_MODE_SSR_COOKIE_RISK | **OPEN** (design residual) |
| STORY_DATOS_DEMO_ON_CTA | **CODE YES (OA-5)** · hosted UNPROVEN |
| STORY_VS_REAL_ORG_CARMEN | **FAIL until SYNTH membership** |
| APPROVALS_EMPTY_LEGITIMATE | **YES** |
| CONVERSATIONS_FIXTURE_VS_DB | **CAVEAT OPEN** |
| AUDIT_STORY_HREF | **MISALIGNED** (`/inicio` vs `/auditoria`) |
| REAL_SEVEN_MUTATED | **NO** |

---

## 8. Unblock / next proof (not performed in this lane)

1. Cut + deploy RC3 → hosted BV: Cliente360 Resumen **Pedidos > 0** for Maderas; Pedido deep link 200 (not AccessDenied).
2. Confirm Carmen session org = SYNTH before owner acceptance of Demo lists / Story.
3. Spot-check cookie-only desks (`/produccion`, `/almacen`, `/entregas`) after sidebar nav without `?datos=demo`.
4. Reconcile durable conversations vs fixtures on staging after any seed re-apply.
5. Optional: `hrefHints.audit` → `/auditoria` + event density (PF-7 → PF-1 request).

---

## Explicit non-claims

- Does **not** authorize deploy or declare `READY_TO_CUT_RC3 = YES`.
- Does **not** claim hosted Pedidos count fixed.
- Does **not** mutate seed, REAL seven, or product code.
- Does **not** treat LEGITIMATELY_EMPTY desks as incompleteness failures.

---

## Bottom line

The SYNTH DEMO graph is **coherent enough** for the V1 owner story around Maderas and for intentionally sparse companion clients. The dangerous empty is not “seed forgot the pedido” — it is **auth/visibility empties** (RC2 Pedidos=0) and **org/mode empties** (Demo on REAL, or Demo chrome vs real SSR). Story Mode deep links and normal nav can agree on SYNTH+Demo after OA-5 query hygiene, but parity **fails** for Carmen on REAL and remains cookie-fragile on sidebar navigation. Hosted re-proof after RC3 is mandatory before treating empties as honest.
