# OWNER_JOURNEY_DEAD_END_AUDIT

**Forensic · read-only · 2026-09-17**  
**Scope (minimum):** approval → quote → convert → pedido  
**Related:** `APPROVAL_QUOTE_ORDER_RECONCILIATION.md`, `DEMO_SEED_ACTUAL_STATE.md`

---

## Executive verdict

| Path | Classification | Why |
|---|---|---|
| Approve on `/aprobaciones/[id]` expecting a Pedido | **DEAD_END** (by product design + UX) | Approve never creates order; post-decision CTA is refresh + “Volver” to list, not Convert |
| Approve → open quote → Convert | **PARTIAL** (live when quote `submitted` + authority) | Two intentional steps; easy to miss if owner stays on approval page |
| Q-000015 (REAL smoke) approve → pedido | **DEAD_END** | Cancelled quote; 0 orders; leftover pending approval; not DEMO |
| DEMO `Q-DEMO-001` (PROYECTOS) convert | **OPEN PATH** (no approval gate in DB) | Quote `submitted`, no order yet, no approval rows — convert is the intended next commercial action |

---

## Intended chain (architecture)

```
RequestApproval (optional exception/decision)
    → status pending on os_approval_requests
Approve / Reject
    → records decision ONLY
    → does NOT CreateOrder
    → does NOT mark quote accepted
[human navigates to cotización]
CreateOrder (“Cliente aceptó · Convertir a Pedido”)
    → requires quote.status === submitted
    → inserts os_orders + sets quote accepted
    → redirects to pedido
```

---

## Dead-end / friction points

### 1. Approval detail page (primary UX dead-end)

**Where:** `apps/os-web/app/(app)/aprobaciones/[approvalRequestId]/page.tsx`

- Header description: “La decisión no crea un pedido.”
- After decide: `ApprovalDecisionForm` refreshes in place; primary nav out is **Volver** → `/aprobaciones`.
- Subject “Registro” link to quote exists **if** quote fetch succeeds — not a Convert CTA.
- No button “Continuar a convertir” / “Crear pedido”.

**Owner expectation failure mode:** Approve → look for Pedido in list/desks → empty → blame product.

### 2. Success copy reinforces no pedido (correct) but does not guide convert

**Where:** `commercial-approval-panel.tsx`

- Success: “Decisión registrada. No se creó un pedido…”
- No deep-link to `#convertir-pedido` on the quote.

### 3. Convert is gated independently of approval

**Where:** `CommercialCommandService.createOrder` + quote detail `authority.canConvertToOrder`

- Approval approved ≠ convert unlocked.
- Convert needs `submitted` + ownership/coverage/`commercial.order.convert`.
- Already-`accepted` quotes with orders show “Ver pedido”, not convert.
- `cancelled` quotes: next-step “No se puede enviar ni convertir.”

### 4. Pending approval next-step is waiting-only

**Where:** `lib/commercial/next-step.ts` (`hasPendingApproval`)

- Statement: “Hay una aprobación pendiente. La decisión no crea un pedido.”
- `href: null` — no CTA to approval or convert.

### 5. Q-000015 owner trap (REAL smoke)

| Fact | Impact |
|---|---|
| REAL org, not SYNTH DEMO | Wrong tenant for owner-demo story |
| Party `ZZV1SMOKEmu0jcmos-EDIT` inactive | Looks like test residue |
| Quote **cancelled** | Convert impossible |
| One approval still **pending** | Can still open approval UI and “approve” with no commercial progress |
| 0 orders | Confirms approval≠pedido |

**DEMO_OR_REAL = REAL (smoke).**

### 6. DEMO convert story vs DB conversations

- Story / JSON fixtures describe PROYECTOS acceptance of `Q-DEMO-001`.
- DB: quote `submitted`, no order, **0** `os_customer_conversations` rows.
- Convert path is code-live; conversation desk may look empty unless demo JSON/mode is on — separate friction, not approval-created.

---

## Minimum happy path (what should work)

1. SYNTH org · DEMO PROYECTOS · quote `01M2PMEKQCXMJ99Z36S77EMD37` (`Q-DEMO-001`, submitted).
2. Skip approval (none required in DB).
3. Open quote → “Cliente aceptó · Convertir a Pedido” if actor has convert authority.
4. `CreateOrder` → pedido + quote `accepted`.

Optional approval branch (any submitted quote): request → approve on `/aprobaciones/:id` or quote panel → **manually** return to quote → convert. Missing that manual hop = perceived dead-end.

---

## Proof anchors (no product changes in this audit)

| Claim | Evidence |
|---|---|
| Approve ≠ CreateOrder | `packages/os-work/src/work-command-service.ts` `decideApproval`; `commercial-approval.test.ts` |
| CreateOrder creates pedido | `packages/os-commercial/src/commercial-command-service.ts` `createOrder` |
| UI states no pedido on approve | approval detail page + `APPROVE_DOES_NOT_CREATE_ORDER` guidance |
| Q-000015 no order | staging `os_orders` count 0 for quote_id |
| DEMO seed intact | `DEMO_SEED_ACTUAL_STATE.md` |

---

## Residual risks for owner demo narrative

1. Showing REAL-org smoke approvals in people-admin queues pollutes the demo mental model.
2. Leftover **pending** approval on a **cancelled** quote is a clickable dead-end.
3. Approval→Convert is two screens with weak bridging CTA — document as known journey gap, not a seed failure.
