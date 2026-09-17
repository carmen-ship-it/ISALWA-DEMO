# RC3 — SEARCH_NEGATIVES_LOCAL

**As of:** 2026-09-17  
**Scope:** Command palette search + demo/real filtering + evaluation narrowing after RC3-A `visibility=org` on orders.  
**Deploy:** Not deployed. Hosted BV **UNPROVEN**.

---

## Scoreboard

| Gate slice | Result | Evidence |
|---|---|---|
| **COMMAND_SEARCH_SESSION / NO_ORG_OVERRIDE** | **PASS** | `command-palette.test.ts` source contract |
| **COMMAND_SEARCH_PEDIDO_LENSES (visibility + evaluation)** | **PASS** | Extended source contract (RC3 gap fill) |
| **EVALUATION_NARROWING (lists / View As)** | **PASS** | `role-preview.test.ts` + `order-role-matrix.test.ts` |
| **DEMO_VS_REAL_FILTER** | **PASS** | `owner-demo.test.ts` + `demo-lens.test.ts` |
| **API_ORDER_ORG_NEGATIVES (advisor / cross-tenant)** | **PASS** | `order-owner-eval-read.test.ts` D–F |

---

## What was proven

### Command search (`apps/os-web/lib/shell/command-search.ts`)

| Negative / contract | Proof |
|---|---|
| Search uses session auth only — no `organizationId` override | `palette search stays on the session` → `does not accept an organization override` |
| Forbidden member/approval reads fail-closed (`isDenied` → continue) | `fail-closes forbidden member and approval reads without marking partial` |
| Pedido fan-out uses evaluation query + team/org lenses + `filterByCommercialOwner` | **Extended:** `narrows Pedido search via evaluation + visibility lenses (RC3 org.read)` |
| Own/team evaluation skips org probe | Same source contract (`commercialVisibility === 'own'` / team→skip org) |

**Why extend:** After RC3-A, `listOrders` honors `visibility=org`. Palette already called orders with lenses; the prior suite did not cite that wiring. Light source contract closes the local gap without a parallel search implementation.

### Evaluation narrowing (shared helpers used by search + desks)

| Negative | Proof |
|---|---|
| Asesor list → `visibility=org` + `ownerMemberId=subject`; missing subject → impossible owner | `role-preview.test.ts` — `narrows Asesor lists…` |
| Jefe → `team`; Gerencia → `org` | `uses team visibility for Jefe…` |
| Asesor owner filter drops non-subject rows | `filters commercial owner lists for Asesor subject` |
| View As Asesor B blocks foreign Pedido owner | `order-role-matrix.test.ts` — `View As Asesor B → Maderas… blocked` |
| Ops personas exclude commercial desk | `G–K: Ops View As excludes commercial Quote desk` |

### Demo vs real

| Negative | Proof |
|---|---|
| `datos=real` drops DEMO-prefixed rows; demo mode keeps only DEMO | `owner-demo.test.ts` — `keeps real and demo counts separate` |
| Management funnel does not mix demo/real party ids | `demo-lens.test.ts` |

### API order negatives (auth truth under org.read)

| Negative | Proof |
|---|---|
| Advisor without org/team cannot open peer Pedido | `order-owner-eval-read.test.ts` **D** |
| Cross-company Pedido id → `NOT_FOUND` | **E** |
| REAL-org actor cannot see SYNTH Pedido | **F** |

---

## Commands run (local)

```bash
# os-web search / evaluation / demo
cd apps/os-web && node --import tsx --test \
  lib/shell/command-palette.test.ts \
  lib/role-preview/role-preview.test.ts \
  lib/role-preview/order-role-matrix.test.ts \
  lib/demo/owner-demo.test.ts \
  lib/management/demo-lens.test.ts
# → pass (includes new Pedido lens contract)

# API order negatives
cd packages/os-query && node --import tsx --test \
  src/commercial/order-owner-eval-read.test.ts
# → 6 pass / 0 fail (A–G)
```

---

## Test inventory

| File | Role |
|---|---|
| `apps/os-web/lib/shell/command-palette.test.ts` | **Extended** — Pedido `listOrders` visibility + evaluation narrowing source contract |
| `apps/os-web/lib/role-preview/role-preview.test.ts` | Evaluation list query + owner filter |
| `apps/os-web/lib/role-preview/order-role-matrix.test.ts` | View As Pedido / desk exclusion |
| `apps/os-web/lib/demo/owner-demo.test.ts` | Demo/real identity filter |
| `apps/os-web/lib/management/demo-lens.test.ts` | Party-id demo lens |
| `packages/os-query/src/commercial/order-owner-eval-read.test.ts` | API deny/cross-tenant (D–F) |

---

## Explicit non-claims

| Claim | Status |
|---|---|
| Hosted ⌘K / View As search BV | **UNPROVEN** |
| End-to-end cross-tenant palette HTTP | **UNPROVEN** (unit/source only) |
| Deploy | **Not done** |

---

## Verdict

**SEARCH_NEGATIVES_LOCAL = PASS** for local unit/source contracts (command-search wiring after `visibility=org` on orders, evaluation narrowing, demo/real separation, API order deny paths). Hosted search BV remains separate.
