# OA-6 — Ops / map / finance / mgmt honesty (receipt)

**Date:** 2026-09-17  
**Lane:** OA-6  
**Branch:** `ct3/oa6-ops-mgmt`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-oa6-ops-mgmt`  
**Base tip:** `7ea9719` (`ct3/owner-demo-completeness`)  
**Scope:** SYNTH org + Demo filter (`resolveDemoDataMode` / `datos=demo` + cookie)  
**Code changes:** **NONE** (receipt-only honesty — no crash; all target surfaces already honor demo mode)  
**REAL_SEVEN_MUTATED:** **NO**  
**Deploy / hosted BV:** **UNPROVEN** this lane  
**INVENTED_BUSINESS_RULES:** **0**  
**Lane status:** **RECEIPT COMPLETE** (code audit + seed classification; hosted BV deferred)

---

## Carmen plain language

Under Demo on SYNTH, ops / map / finance / gerencia pages show **recorded commercial and operational facts only**. They do **not** invent revenue, profit, margin, official accounting, or confirmed cobranza. Empty purchase-request and ledger surfaces stay empty on purpose.

---

## Steering — accounting

| Claim | Verdict |
|---|---|
| Official accounting / libro mayor / asientos | **NOT EVIDENCED** |
| Ingresos oficiales / cobranza confirmada / profit / margen | **NOT EVIDENCED** (forbidden presentation) |
| Finanzas operational desk (pago reportado, pendiente de confirmar) | Implemented product surface — **not** accounting |

---

## Revenue / profit honesty audit (code paths)

| Surface | Invents revenue/profit? | Evidence |
|---|---|---|
| `/produccion` | **NO** | Pedido context + prep/update Work counts; no money labels; no ProductionRun invented |
| `/almacen` | **NO** | Stat “Ingresos de producto terminado” = **finished-goods receipt citations**, not money; copy forbids official stock |
| `/compras` | **NO** | Linked DEMO pedidos only; process-local PR repo has **no sample rows**; “Sin OC automática” |
| `/entregas` | **NO** | Fulfillment + DN facts; progress Nota/Salida/Entrega from recorded facts only |
| `/finanzas` | **NO** | Operational desk + disclaimer; `FINANCE_FORBIDDEN_COPY` blocks confirmed-revenue language; demo seed payment is **pendiente de confirmar** |
| `/mapa` | **NO** | `AUTHORITATIVE_REVENUE_LAYER` default **NO**; hover/portfolio use **Valor cotizado / Valor de pedidos** |
| `/inicio?lente=gerencia` | **NO** | Count-only funnel; org metrics separate quoted/order **values** — never revenue/profit/margin (tests assert) |

**Verdict:** No code fix required for revenue/profit invention under SYNTH+Demo.

---

## `resolveDemoDataMode` wiring

| Page / loader | Uses `resolveDemoDataMode`? | Notes |
|---|---|---|
| `produccion/page.tsx` | **YES** (`{}` → cookie) | Filters via `loadPostSalePedidos(..., { dataMode })` |
| `almacen/page.tsx` | **YES** (`{}` → cookie) | Post-sale pedidos + `demoFinishedGoodsOrderIds(dataMode)` |
| `compras` linked orders | **YES** (`load-linked-orders.ts`) | PR queue is process-local (no demo invent) |
| `entregas` | **YES** (`load-entregas.ts`) | Filters linked orders + fulfillment by DEMO party names |
| `finanzas/page.tsx` | **YES** (searchParams) | `loadFinanceSubjectOptions(dataMode)`; demo payment seed only when `dataMode === 'demo'` |
| `mapa/page.tsx` | **YES** (searchParams) | Parties + commercial lens + attention filtered |
| `inicio` gerencia | **YES** (searchParams) | Demo lens on org/team commercial inputs |

No crash path found from missing demo-mode resolution. Cookie-only SSR (no `?datos=`) is intentional shared OA-1 bridge — not an OA-6 rewrite.

---

## OWNER page classifications (SYNTH + Demo)

Seed basis: `DEMO_SEED_ACTUAL_STATE.md` + `seeded-ids.json` (SYNTH `01M2JKF77TXMJNDTKNCYNHH9G5`): **5 DEMO parties**, **3 open orders**, **2 DNs**, **2 FG receipts**, **1 warehouse exit**, **0** DEMO quote approvals, **0** durable purchase requests, **0** official ledger.

### Classification strip (primary job)

| Page | Primary classification | Sub-surfaces |
|---|---|---|
| produccion | **POPULATED** | Plant annotations without recorded Work → empty until fact (honest) |
| almacen | **POPULATED** | Official stock qty → **NOT EVIDENCED** (citations only) |
| compras | **POPULATED** (linked pedidos) | PR/OC queue → **LEGITIMATELY_EMPTY** |
| entregas | **POPULATED** | Progress steps without DN/exit/delivery fact → pending (honest) |
| finanzas | **POPULATED** (operational desk) | Official accounting / Ingresos → **NOT EVIDENCED** |
| mapa | **POPULATED** | Authoritative revenue layer → off (**NOT EVIDENCED**) |
| gerencia | **POPULATED** | Pending-approvals count **0** → **LEGITIMATELY_EMPTY** metric |

| Page | Classification | Code path | Seed / expected rows |
|---|---|---|---|
| **produccion** | **POPULATED** | `loadPostSalePedidos` + open Work for prep/update flags | **3** DEMO pedidos (Maderas / Hotel / Ferretería). Plant annotations stay empty until recorded — honest. |
| **almacen** | **POPULATED** | Post-sale pedidos + FG citation set from seed map | **3** pedidos; **2** “Ingreso PT citado” (Maderas, Hotel). No stock qty invented. |
| **compras** | **POPULATED** (linked pedidos) · PR/OC queue **LEGITIMATELY_EMPTY** | `loadComprasLinkedOrders` demo-filtered; `comprasRepository` empty | **3** linked pedidos. **0** seeded purchase requests — empty queue is correct, not a bug. |
| **entregas** | **POPULATED** | `loadEntregaPage` demo-filtered orders + fulfillment + per-order DN lookup | **3** linked pedidos; seed DNs/exit/delivery facts for Maderas (+ Hotel DN without exit). Progress pending where facts absent. |
| **finanzas** | **POPULATED** (operational subjects + demo reported payment) · accounting **NOT EVIDENCED** | Subject options demo-filtered; optional seed `payment` fact pending confirm | Open DEMO orders/quotes as subjects; one Maderas reported payment **pendiente de confirmar**. **No** ledger / Ingresos oficiales. |
| **mapa** | **POPULATED** | Party search + DEMO name filter; catalog lat/lng seeded | **5** DEMO clients; coordinates in owner-demo catalog. Commercial values labeled cotizado/pedidos only. |
| **gerencia** | **POPULATED** | `inicio` + `lente=gerencia` + demo-filtered opps/quotes/orders | Funnel counts + Valor cotizado / Valor de pedidos from DEMO commercial records. Pending-approvals card may read **0** → **LEGITIMATELY_EMPTY** for that metric (seed approvals = 0). |

### Classification legend (this receipt)

- **POPULATED** — under SYNTH+Demo, code + seed imply visible DEMO rows/facts for the page’s primary job.
- **LEGITIMATELY_EMPTY** — empty UI matches absence of seed/product authority (not a missing densify bug).
- **NOT EVIDENCED** — no product authority / policy to show the claim (accounting).

---

## Explicit non-claims

- Does **not** prove hosted/browser populate for Carmen (OA-1 membership apply may still be blocked).
- Does **not** claim official Contabilidad, profit, or confirmed cash collected.
- Does **not** invent OC, stock available, or auto-entrega from pedido status.
- Almacén “ingresos” ≠ revenue.

---

## Deliverable

| Item | State |
|---|---|
| Ops/map/finance/mgmt revenue honesty | **AUDITED** — no invent paths found |
| OWNER classifications (7 pages) | **DOCUMENTED** — POPULATED / LEGITIMATELY_EMPTY / NOT EVIDENCED |
| Minimal code fix | **NOT NEEDED** |
| Hosted proof | **UNPROVEN** (OA-1 membership apply still blocks Carmen row BV) |
| Tip sync vs `origin/ct3/owner-demo-completeness` | **ALIGNED** at `7ea9719` (no rebase needed) |

**LANE_RECEIPT_SHA:** `b5dac08` (content commit; pin commit follows on same branch)
