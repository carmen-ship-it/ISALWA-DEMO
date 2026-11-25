# Overnight checkpoint — 2026-11-25 (in progress)

**Writer:** Cursor thread `b6a344b1-1bdb-4b47-be28-1a0cab32bca6`  
**Model/effort (configured):** Composer / Auto (record separately if Terra high was requested)  
**Handoff tip at start:** `5874fb51fe549a719d47dcc21063f1358f0bb998`  
**Parent outcome:** PARTIAL

## Remote environment — VERIFIED

| Field | Value |
| --- | --- |
| Host | `carmen-aws-dev` (`ip-172-31-19-214`, Ubuntu 24.04) |
| Checkout | `/home/ubuntu/projects/isalwa-wt-overnight-20261125` @ `5874fb51` + Pedido/A1 patches |
| Writer lock | `/home/ubuntu/projects/.isalwa-overnight-writer.lock` |
| Disposable DB | `isalwa_overnight_20261125_disposable` on `127.0.0.1:55439` |
| Runtime dir | `/home/ubuntu/test-runtime/isalwa-overnight-20261125` |
| GitHub SSH on host | `contractorcomplianceco-cmyk` (can fetch `carmen-ship-it/ISALWA-DEMO`) |
| Mac | Available for light access; **not** the active build machine |

## Results so far

| Claim | Status |
| --- | --- |
| A1 dispatch-ledger + cumulative **37/37** on AWS | **VERIFIED** |
| delivery-boundary aligned with A1 linked-salida **+14 → 51/51** with A1 suites | **VERIFIED** |
| `canListPedidoDeliveryDocuments` unit | **VERIFIED** |
| Pedido `/delivery-notes` readable by order owner without `delivery.record` | **IMPLEMENTED** (HTTP re-prove pending) |
| `hasNotaFact` also from delivery_note timeline | **IMPLEMENTED** |
| Spine HTTP 9/9 on AWS disposable | **VERIFIED** (after PDF pin + portable fixtures path) |
| Campana drawer / ack | **NOT VERIFIED LIVE** |
| Elapsed notices live catch-up | **NOT VERIFIED LIVE** (unit previously TESTED LOCALLY) |
| people.admin seat journeys | **NOT VERIFIED LIVE** |
| Hosted separate preview | **BLOCKED** (Q-DEPLOY-01 stack not provisioned) |

## Pedido indicator root cause

Commercial Pedido viewers (e.g. spine owner: `sales_rep` + convert/create, **no** `delivery.record`) called `GET /delivery-notes`, which required `delivery.record`. The page swallowed the error → empty Nota/Salida/Entrega circles. Fix: `canListPedidoDeliveryDocuments` + read-only list path; also derive Nota from timeline facts like Salida/Entrega.

## Rollback

- Git: return to `5874fb51` on the WIP branch; drop later commits.  
- AWS PG: `pg_ctl -D /home/ubuntu/test-runtime/isalwa-overnight-20261125/pgdata stop`  
- Do not touch evaluation Vercel project.
