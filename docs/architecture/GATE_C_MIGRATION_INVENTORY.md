# Gate C — controlled migration inventory (reconciled to `ef7eeab`)

**Exact candidate:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Integration pin (unmoved):** `316426f272bce29924ffd4991da88ffe7d421bbd`  
**Gate C live DB evidence this pass:** **NOT OBTAINED** → `BLOCKED_DB_STATE_UNKNOWN`  
**Staging identity (label only):** `isalwa-os-staging` · `dpg-dajd3kh5efls738falcg-a` · `isalwa_os_staging`  
**Do NOT apply. Do NOT alter allow list. Do NOT infer live DB contents.**

Companion: `docs/operations/GATE_C_READ_ONLY_EVIDENCE.sql`

Classification below is from **SQL inspection**, not filename trust.  
`SAFE-TO-APPLY` means “SQL shape is additive / recoverable **if** Gate C confirms prerequisites and apply-state.” It is **not** permission to apply now.

## A. Foundation migrations (likely already on staging — Gate C must prove)

| Migration | SQL class | Notes | SAFE-TO-APPLY (after evidence) |
|---|---|---|---|
| `20260823120000_os_foundation_step10` | ADDITIVE CREATE | orgs/members foundation | Only if missing from `_prisma_migrations` |
| `20260824120000_os_step11_outbox_delivery` | ADDITIVE ALTER/INDEX | outbox columns | Only if missing |
| `20260824140000_os_step12_partygraph` | ADDITIVE CREATE | parties | Only if missing |
| `20260824160000_os_step14_work_approval` | ADDITIVE + **NULL backfill UPDATE** | `created_by_member_id` NULL→owner then NOT NULL | Review row count before apply if unapplied |
| `20260824180000_os_step15_query_projection` | ADDITIVE | projections | Only if missing |
| `20260824190000_os_step15_1_work_attention_projection` | ADDITIVE | attention | Only if missing |
| `20260824200000_os_step16_commercial_core` | ADDITIVE | commercial core | Only if missing |
| `20260824210000_os_step16_1_commercial_projection` | ADDITIVE | commercial reads | Only if missing |
| `20260824220000_os_step16_1a_party_timeline` | ADDITIVE | timeline | Only if missing |
| `20260913140000_os_location` | ADDITIVE CREATE | locations | Only if missing |
| `20260913150000_os_client_import` | ADDITIVE CREATE | import lineage | Only if missing |

## B. Wave 2 operating migrations (chronological)

| # | Migration | Purpose | Dependencies | SQL class | Pilot feature | SAFE-TO-APPLY decision |
|---|---|---|---|---|---|---|
| 1 | `20260914120000_os_reported_operational_fact` | Payment evidence / reported ops facts | orgs | ADDITIVE CREATE | Caja payment evidence | **YES after Gate C** (independent of purchase REWRITE) |
| 2 | `20260914133000_os_commitments_internal_notifications` | Commitments / internal notifications | orgs | ADDITIVE CREATE | Supporting | YES after Gate C |
| 3 | `20260915100000_os_product_catalog` | Product master | orgs | ADDITIVE CREATE | Producción / Cumplir | YES after Gate C |
| 4 | `20260915110000_os_order_line` | Order line snapshots at convert | commercial orders/quotes | ADDITIVE CREATE + FKs | Vender / Cumplir / Entregar | YES after Gate C (requires commercial tables) |
| 5 | `20260915120000_os_operational_case` | Operational case facts | orgs | ADDITIVE CREATE | Resolver | YES after Gate C |
| 6 | `20260915130000_os_production_trace` | Quema / entry / loss / consumption | orgs | ADDITIVE CREATE + append-only triggers | **Producción** | YES after Gate C |
| 7 | `20260915140000_os_customer_conversation` | Conversation evidence | orgs | ADDITIVE CREATE | Comms | YES after Gate C |
| 8 | `20260915150000_os_delivery` | Warehouse exit + customer delivery tables | orders, members | ADDITIVE CREATE | **Entregar / Cumplir→Exit** | YES after Gate C |
| 9 | `20260915160000_os_customer_committed_date` | Customer/internal dates + date-issue informed | orgs | ADDITIVE CREATE | Dates / Jefe | YES after Gate C |
| 10 | `20260915170000_os_order_allocation` | Finished-goods → OrderLine allocation | orgs | ADDITIVE CREATE | **Cumplir Pedido** | YES after Gate C |
| 11 | `20260915180000_os_purchase_request` | Purchase request base model | orgs | ADDITIVE CREATE | Compras **read/model only** | YES after Gate C (**does not unlock Spanish status workflow**) |
| 12 | `20260916100000_os_price_list` | Versioned price lists | catalog/orgs | ADDITIVE CREATE | Vender price context | YES after Gate C |
| 13 | `20260916120000_os_special_order` | Pedido especial classification rows | orgs | ADDITIVE CREATE | Special order **P1** (write still closed) | YES after Gate C (schema only) |
| 14 | `20260916140000_os_purchase_status_workflow` | Remap EN→ES status ids; drop/readd CHECKs | `#11` present | **REWRITE** (DROP CONSTRAINT + UPDATE rows) | Compras transitions | **NO — HOLD / BLOCKED** until live status evidence clears mapping |
| 15 | `20260916160000_os_coordination_decision` | Coordination decision write rows | orgs/members | ADDITIVE CREATE | Coordinar write | YES after Gate C |
| 16 | `20260917120000_os_finished_goods_receipt` | Listo / FG receive | orgs | ADDITIVE CREATE | **Cumplir / Listo** | YES after Gate C |
| 17 | `20260917140000_os_external_document_number` | ADD `external_document_number` on outbound/delivery notes | `#8` tables | ADDITIVE ALTER (DROP CONSTRAINT IF EXISTS + ADD COLUMN/CHECK) | Entregar evidence | YES after Gate C **only if `#8` applied** |
| 18 | `20260918120000_os_customer_coverage_grant` | Covering advisor grants | orgs | ADDITIVE CREATE | **Vender** coverage convert | YES after Gate C |

## C. Planned additive apply set (after Gate C clears)

**Exclude:** `#14` purchase REWRITE.

**Include (exact order, skip any already in `_prisma_migrations`):**

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 15 → 16 → 17 → 18

**First-pilot minimum subset** (if pruning temporary):  
`1, 3, 4, 6, 8, 10, 15, 16, 17, 18`  
(plus any missing commercial/foundation prerequisites proven by Gate C).

## D. Purchase REWRITE disposition

- Live evidence this pass: **UNKNOWN** (DB not readable)  
- Classification: **REWRITE**  
- Decision: **HOLD**  
- If later evidence shows relevant rows + unmapped values → `MIGRATION_CHANGE_REQUEST`  
- If no `os_purchase_requests` table / zero rows + deterministic map proven → may reopen under separate Carmen authorization  

## E. Independence from purchase REWRITE

All listed ADDITIVE migrations (except `#17` depending on `#8`) have **no SQL dependency** on `#14`.  
Compras may deploy with `#11` only and **truthful limited UX** (no Spanish transition writer).
