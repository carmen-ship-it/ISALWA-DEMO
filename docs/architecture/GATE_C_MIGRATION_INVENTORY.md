# Gate C — migration inventory (reconciled to live staging + `ef7eeab`)

**Exact candidate:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Integration pin (unmoved):** `316426f272bce29924ffd4991da88ffe7d421bbd`  
**Live DB evidence:** **ACCEPTED** (Carmen read-only from Render `os-api-staging` shell @ `1f767fa`)  
**DB:** `isalwa_os_staging` · PG **16.15** · applied migrations **11** · Wave 2 applied **NONE**  
**Do NOT apply until recovery is proven and Carmen authorizes.**

Classification is from **SQL file inspection** reconciled to live state.

---

## A. Already applied (exact — do not re-apply)

| Migration | Live |
|---|---|
| `20260823120000_os_foundation_step10` | APPLIED |
| `20260824120000_os_step11_outbox_delivery` | APPLIED |
| `20260824140000_os_step12_partygraph` | APPLIED |
| `20260824160000_os_step14_work_approval` | APPLIED |
| `20260824180000_os_step15_query_projection` | APPLIED |
| `20260824190000_os_step15_1_work_attention_projection` | APPLIED |
| `20260824200000_os_step16_commercial_core` | APPLIED |
| `20260824210000_os_step16_1_commercial_projection` | APPLIED |
| `20260824220000_os_step16_1a_party_timeline` | APPLIED |
| `20260913140000_os_location` | APPLIED |
| `20260913150000_os_client_import` | APPLIED |

---

## B. Pending migrations (exact chronological order)

Staging ends at `20260913150000_os_client_import`. Every row below is **pending**.

| Migration | Dependency | Tables / columns | Class | Live-data impact (this staging) | Needed for pilot | Safe before/after purchase rewrite |
|---|---|---|---|---|---|---|
| `20260914120000_os_reported_operational_fact` | orgs | CREATE `os_reported_operational_facts` | ADDITIVE | none (new empty) | YES (payment evidence) | Independent |
| `20260914133000_os_commitments_internal_notifications` | orgs | CREATE commitments + internal notifications | ADDITIVE | none | Supporting | Independent |
| `20260915100000_os_product_catalog` | orgs | CREATE catalog products/attrs/events | ADDITIVE | none (no seed INSERT) | YES | Independent |
| `20260915110000_os_order_line` | orders/quotes | CREATE `os_order_lines` + FKs | ADDITIVE | none (no backfill from 9 orders) | YES | Independent |
| `20260915120000_os_operational_case` | orgs | CREATE case/fact/release tables | ADDITIVE | none | YES (Resolver) | Independent |
| `20260915130000_os_production_trace` | orgs | CREATE quema/trace tables | ADDITIVE | none | YES (Producción) | Independent |
| `20260915140000_os_customer_conversation` | orgs | CREATE conversation tables | ADDITIVE | none | Supporting | Independent |
| `20260915150000_os_delivery` | orders/members | CREATE `os_warehouse_exits`, outbound notes, `os_deliveries`, delivery notes, evidence | ADDITIVE | none | YES (Cumplir/Entregar) | Independent |
| `20260915160000_os_customer_committed_date` | orgs | CREATE committed/internal dates + issues | ADDITIVE | none | Supporting | Independent |
| `20260915170000_os_order_allocation` | orgs | CREATE `os_order_allocations` | ADDITIVE | none | YES | Independent |
| `20260915180000_os_purchase_request` | orgs | CREATE purchase request + history + notes | ADDITIVE | **creates empty** purchase schema (EN status ids) | YES (Compras model) | **Must precede** rewrite |
| `20260916100000_os_price_list` | catalog | CREATE price lists/entries | ADDITIVE | none; **no purchase touch** | Supporting | Between create & rewrite; safe |
| `20260916120000_os_special_order` | orgs | CREATE special-order classifications | ADDITIVE | none; **no purchase touch** | Schema for P1 | Between create & rewrite; safe |
| `20260916140000_os_purchase_status_workflow` | purchase create | DROP EN CHECKs; UPDATE status columns; SET default; ADD Isa CHECKs | **REWRITE** (constraint + value remap) | **0 rows** → no live remap; empty UPDATEs succeed | YES (Compras transitions / app default `solicitado`) | **This is the rewrite** |
| `20260916160000_os_coordination_decision` | orgs | CREATE `os_coordination_decisions` | ADDITIVE | none | YES (write) | After rewrite; independent of purchase data |
| `20260917120000_os_finished_goods_receipt` | orgs | CREATE `os_finished_goods_receipts` | ADDITIVE | none | YES | Independent |
| `20260917140000_os_external_document_number` | delivery tables | ADD nullable `external_document_number` + CHECKs on outbound/delivery notes | ADDITIVE ALTER | none (nullable; empty notes tables) | YES | After delivery; independent of purchase |
| `20260918120000_os_customer_coverage_grant` | orgs | CREATE `os_customer_coverage_grants` | ADDITIVE | none | YES (covering advisor) | Independent |

---

## C. Purchase create migration (detail)

**Filename:** `20260915180000_os_purchase_request`

Creates:

- `os_purchase_requests` — `status TEXT NOT NULL DEFAULT 'requested'` with CHECK `('requested','in_progress','received','cancelled')`
- `os_purchase_request_status_history` — EN status CHECKs; open row must open as `requested`; **append-only** UPDATE/DELETE trigger
- `os_purchase_request_notes` — append-only trigger

No INSERT of pilot/customer rows.

---

## D. Purchase rewrite (detail)

**Filename:** `20260916140000_os_purchase_status_workflow`

| Item | Exact |
|---|---|
| A. Prerequisites | `20260915180000_os_purchase_request` (tables + old CHECKs) |
| B. Tables modified | `os_purchase_requests`, `os_purchase_request_status_history` |
| C. Constraints removed | `os_purchase_requests_status_chk`; `os_purchase_request_status_history_status_chk`; `os_purchase_request_status_history_open_chk` |
| D. UPDATE mappings | `requested→solicitado`, `in_progress→cotizandose`, `received→entregado`, `cancelled→cancelled` (requests.status + history.from/to) |
| E. New constraints | status IN (`solicitado`,`cotizandose`,`pedido_preparandose`,`entregado`,`cancelled`); open history must open as `solicitado`; default status → `solicitado` |
| F. Unmapped value? | `pedido_preparandose` is **new allowed**, not an old EN source. ELSE branch leaves unknown statuses unchanged until new CHECK fails |
| G. Matters on empty? | **No** — zero rows; no live `pedido_preparandose` to preserve/remap |
| H. Inserts between create and rewrite? | **No** (`price_list`, `special_order` only) |
| I. Transaction / partial failure | No `prisma:disable-transaction`; Prisma wraps PG migration in a transaction. Mid-failure rolls back that migration |
| J. Empty schema success? | **Yes** — DROP/ADD CHECKs on empty tables; 0-row UPDATEs; history append-only trigger does not fire with zero updated rows |

**Isa semantics after apply (stored ids → labels):**

| Stored id | Label |
|---|---|
| `solicitado` | Solicitado |
| `cotizandose` | Cotizándose |
| `pedido_preparandose` | Pedido y Preparándose |
| `entregado` | Entregado |
| `cancelled` | Cancelado (stop-state) |

Matches `packages/os-contracts/src/purchase-request.ts` and Prisma `@default("solicitado")`.

---

## E. Full-chain safety (this staging)

**Assessment:** **MIGRATION_SQL_SAFE** for applying **all 18 pending migrations as written**, including the purchase REWRITE, via normal `prisma migrate deploy`.

Reasons:

- No Wave 2 tables/rows exist to corrupt.
- Baseline commercial/foundation tables are not mutated by pending SQL (CREATE/ADD COLUMN only; no baseline UPDATE/DELETE/INSERT).
- Purchase create → empty → rewrite is coherent and matches app contracts.
- No need to skip or manually mark migrations.

**Not yet:** recovery proof → overall apply authorization remains **BLOCKED_RECOVERY_NOT_PROVEN**.

---

## F. Planned apply set (after recovery + Carmen authorize)

**Include entire pending chain in timestamp order** (no exclusion of purchase rewrite for this empty staging):

`20260914120000` → … → `20260918120000` (18 migrations)

Expected `_prisma_migrations` count after success: **29** (11 + 18).
