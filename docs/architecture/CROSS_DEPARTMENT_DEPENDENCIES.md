# Cross-Department Dependencies

**Status:** Increment 5.1 — architecture only — departments **LOCKED** except Commercial (future activation)

Departments share **one event spine**, **one PartyGraph**, **one capability registry**. Dependencies are **event + projection contracts**, not direct database coupling between mini-apps.

---

## Foundation shared by all lanes

| Layer | Shared |
|-------|--------|
| Identity | Person, Member, Party |
| Events | BusinessEvent |
| Work | WorkItem, ApprovalRequest |
| Attention | AttentionItem |
| Audit | AuditLog |
| Query | Scoped read APIs |
| AI | Same auth boundary |

---

## Dependency matrix

| From | To | Authoritative source | Consumption | LOCKED behavior | ACTIVE behavior | Stale / degraded |
|------|-----|----------------------|-------------|-----------------|-----------------|------------------|
| Commercial | Finance | External accounting (projection) | Invoice status, balance, credit hold | “Finance not connected”; no fake AR | Projection + events | Stale TTL → attention |
| Finance | Commercial | Finance projection / events | Credit hold, overdue | N/A if Finance locked | `credit.hold` blocks quote | Reconciliation queue |
| Commercial | Warehouse | Warehouse (future) | Availability | “Cannot verify stock” | `availability.*` events | Indicative vs confirmed |
| Warehouse | Commercial | Warehouse events | ATP updates | — | Updates commercial promise state | Stale stock attention |
| Commercial | Operations | Operations (future) | Delivery schedule | “Delivery not connected” | Delivery exceptions | — |
| Operations | Commercial | Operations events | Fulfillment status | — | Updates order/attention | — |
| Purchasing | Warehouse | PO/receipt events | Incoming supply | Locked | Receipt events | — |
| Production | Warehouse | Production events | Finished goods | Locked | FG availability | — |
| Commercial | Customer Service | Shared Party/messages | Threads | Uses messaging foundation | Unified inbox on Party | — |
| All lanes | Knowledge | ApprovedKnowledge | SOP citations | Versioned docs | Workflow refs | Retired version warning |
| All lanes | AI | Events + projections | Summaries | No locked-dept fake intel | Scoped summaries | Model/kill switch |

---

## Capability-gated emission

Locked department **cannot emit** authoritative facts in its domain (e.g. Warehouse cannot emit `stock.confirmed` until ACTIVE).

Commercial may emit **request** events: `availability.check.requested`, `invoice.requested`.

---

## Customer + Collections example

Same Party with roles `customer` + active Collections capability (future):

- Commercial: Opportunity, Quote  
- Collections: FinanceProjection aging, promise-to-pay  
- **One Party** — not duplicate customer in collections DB  

---

## Supplier + Purchasing + Finance

Party with `supplier` role:

- Purchasing lane (future): PO against supplier Party id  
- Finance projection: AP balance from external  
- **One Party id** across lanes  

---

## Rules

1. No fabricated cross-department KPIs when target LOCKED.  
2. AI states dependency gaps with evidence — not fake confirmation.  
3. Reconciliation path for projection conflicts.  
4. Ops plane (integration health) separate from business Command Center.

---

## Planificación

`finance-dependency.ts`, `party-lifecycle.ts`, `workforce-lifecycle.ts`, `admin-governance.ts`
