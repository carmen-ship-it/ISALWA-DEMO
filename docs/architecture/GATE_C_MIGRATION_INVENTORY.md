# Gate C — controlled migration inventory (UNAPPLIED)

**Prepared on tip:** branch tip of final local pilot unblock pass  
**Integration pin (unmoved):** `316426f272bce29924ffd4991da88ffe7d421bbd`  
**Gate C:** HOLD / BLOCKED_DB_STATE_UNKNOWN  
**Staging identity (known label only):** `isalwa-os-staging` · `dpg-dajd3kh5efls738falcg-a` · database `isalwa_os_staging`  
**Do NOT apply. Do NOT alter allow list. Do NOT infer live DB contents.**

Companion read-only evidence: `docs/operations/GATE_C_READ_ONLY_EVIDENCE.sql`

## Ordered inventory (Wave 2 / OS operating migrations)

Apply order follows filename timestamp. Earlier foundation migrations (202608*) may already be on staging — Gate C must confirm via `_prisma_migrations` before any apply.

| # | Filename | Classification | Tables / columns | Dependencies | Pilot journeys | Rollback / recovery |
|---|---|---|---|---|---|---|
| 1 | `20260914120000_os_reported_operational_fact` | ADDITIVE | `os_reported_operational_facts` CREATE | orgs/members | Payment evidence (Caja) | DROP table only if empty / unused |
| 2 | `20260914133000_os_commitments_internal_notifications` | ADDITIVE | commitment / notification tables | foundation | Supporting | DROP if unused |
| 3 | `20260915100000_os_product_catalog` | ADDITIVE | product catalog tables | foundation | Producción / Cumplir | DROP if unused |
| 4 | `20260915110000_os_order_line` | ADDITIVE | order line snapshot tables | commercial orders | Vender / Cumplir / Entregar | DROP if unused |
| 5 | `20260915120000_os_operational_case` | ADDITIVE | operational case tables | foundation | Resolver | DROP if unused |
| 6 | `20260915130000_os_production_trace` | ADDITIVE | `os_production_quemas`, `_times`, `_products`, `os_production_trace_entries` + append-only triggers | orgs | **Producción** | Triggers make UPDATE/DELETE fail; rollback = DROP tables (loses facts) |
| 7 | `20260915140000_os_customer_conversation` | ADDITIVE | conversation evidence | parties | Comms (not informed-of-order) | DROP if unused |
| 8 | `20260915150000_os_delivery` | ADDITIVE | `os_warehouse_exits`, `os_warehouse_outbound_notes`(+lines), `os_deliveries`, `os_delivery_notes`(+lines), `os_delivery_evidence` | orders, members | **Cumplir→Entregar** | DROP cascade carefully; loses exit/delivery facts |
| 9 | `20260915160000_os_customer_committed_date` | ADDITIVE | date / informed / issue tables | orders | Dates / Jefe | DROP if unused |
| 10 | `20260915170000_os_order_allocation` | ADDITIVE | `os_order_allocations` | orders / FG | **Cumplir Pedido** | DROP if unused |
| 11 | `20260915180000_os_purchase_request` | ADDITIVE | `os_purchase_requests` + history/notes | foundation | Compras (base) | DROP if unused |
| 12 | `20260916100000_os_price_list` | ADDITIVE | price list tables | catalog | Vender (price context) | DROP if unused |
| 13 | `20260916120000_os_special_order` | ADDITIVE | `os_special_order_classifications` | orders | Special order (P1) | DROP if unused |
| 14 | `20260916140000_os_purchase_status_workflow` | **REWRITE** | DROP status CHECKs; UPDATE status/from_status/to_status remap EN→ES ids; re-add checks | requires `os_purchase_requests` present | Compras transitions | **BLOCKED** — do not apply until DB state known; remaps existing rows; reverse needs reverse UPDATE map |
| 15 | `20260916160000_os_coordination_decision` | ADDITIVE | `os_coordination_decisions` | orgs/members | Coordinar write | DROP if unused |
| 16 | `20260917120000_os_finished_goods_receipt` | ADDITIVE | `os_finished_goods_receipts` | orgs | **Cumplir / Listo** | DROP if unused |
| 17 | `20260917140000_os_external_document_number` | ADDITIVE | ADD `external_document_number` on outbound + delivery notes | delivery migration | Entregar evidence | DROP COLUMN |
| 18 | `20260918120000_os_customer_coverage_grant` | ADDITIVE | `os_customer_coverage_grants` | orgs | **Vender** covering advisor | DROP if unused |

## Blocked

- **`20260916140000_os_purchase_status_workflow`** — REWRITE · Gate C HOLD · purchase transitions remain `BLOCKED_BY_GATE_C`

## Recommended controlled apply set for first-pilot writers (after Gate C clears)

Exclude #14 until purchase policy is decided. Include #6–10, #15–18 (and prerequisites #3–5, #1 as needed). Confirm `_prisma_migrations` first.

## Journey ↔ migration map

| Journey | Required migrations (if not already applied) |
|---|---|
| Vender (coverage convert) | #18 (+ commercial foundation already present) |
| Producción | #6 (+ #3) |
| Cumplir Pedido | #16, #10, #4 |
| Entregar | #8, #17 (+ #10 if allocation precedes exit) |
| Coordinar write | #15 |
| Payment evidence | #1 |
| Purchase transitions | #11 + **#14 BLOCKED** |
