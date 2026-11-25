# Overnight checkpoint — 2026-11-25

**Writer:** Cursor thread `b6a344b1-1bdb-4b47-be28-1a0cab32bca6` (only active ISALWA writer this session)  
**Configured model/effort:** Composer / Auto (prompt recommended Terra high; actual configured model recorded here)  
**Branch:** `wip/overnight-handoff-20261125`  
**GitHub tip:** `abf641e3c85fc308333b02ab92f65c469524065f`  
**Prior tip:** `5874fb51…`  
**Parent outcome:** **PARTIAL**

## 1. Is engineering running remotely? Can the Mac stay idle?

**Yes — VERIFIED.** Active checkout and disposable DB are on `carmen-aws-dev` (`ip-172-31-19-214`). Mac remains available for light review only. GitHub is durable SoT.

| Field | Value |
| --- | --- |
| Host | `carmen-aws-dev` / Ubuntu 24.04 / 15Gi RAM / ~367G free |
| Checkout | `/home/ubuntu/projects/isalwa-wt-overnight-20261125` @ `abf641e3` |
| Writer lock | `/home/ubuntu/projects/.isalwa-overnight-writer.lock` |
| Disposable DB | `isalwa_overnight_20261125_disposable` @ `127.0.0.1:55439` |
| Runtime | `/home/ubuntu/test-runtime/isalwa-overnight-20261125` |
| Host GitHub SSH | `contractorcomplianceco-cmyk` (reads `carmen-ship-it/ISALWA-DEMO`) |

## 2. Customer-to-delivery spine (same synthetic records)

**VERIFIED** on AWS disposable via `apps/os-api/src/spine-canonical.http.test.ts` → **9/9 PASS**.

Fixtures (sanitized, no cookies in GitHub): runtime path  
`/home/ubuntu/test-runtime/isalwa-overnight-20261125/spine-canonical/ids.json`  
Includes org, party, quote `Q-000001`, order `O-000001`, nota/salida/entrega/payment/work/conversation.

A1 on AWS: dispatch-ledger + cumulative **37/37**; with boundary (linked-salida aligned) **51/51**.

## 3. Pedido indicators, notifications, admin

| Item | Status |
| --- | --- |
| Pedido Nota/Salida/Entrega indicators | **IMPLEMENTED** + unit/scope tests; root cause was commercial owner denied `GET /delivery-notes`. **BROWSER VERIFIED LOCALLY** not re-run on AWS (no Playwright/Chrome installed on host). |
| Elapsed 48h/60m/15m unit clock | **VERIFIED** 4/4 on AWS |
| Elapsed live API catch-up | **NOT VERIFIED LIVE** |
| Campana drawer + ack | **NOT VERIFIED LIVE** (browser tooling missing on AWS) |
| Role preview non-grant | **VERIFIED** 15/15 |
| people.admin HTTP mutations + non-admin deny | **VERIFIED** 12/12 (`workforce-admin-mutation-http.test.ts`) |
| Full UI invite/team/coverage journeys | **NOT VERIFIED LIVE** |

## 4. What is on GitHub vs only on server/Mac

| Location | Content |
| --- | --- |
| GitHub `wip/overnight-handoff-20261125` @ `abf641e3` | Handoff packet + Pedido/A1/spine-portable fixes |
| AWS disposable DB + runtime fixtures | Live synthetic spine IDs/cookies — **not** uploaded |
| Mac `.tmp/` | Local leftovers only; not SoT |

## 5. Blocked / decisions for Carmen

| Blocker | Owner | Decision needed |
| --- | --- | --- |
| Campana + Pedido browser proof | Eng | Install Playwright/Chromium on AWS **or** authorize short Mac browser pass |
| Elapsed live catch-up | Eng | Start long-lived os-api on AWS with clock enabled |
| Hosted preview (Q-DEPLOY-01) | Carmen | Authorize separate Vercel + API + DB + Supabase identities |
| WhatsApp real | Carmen | Meta/WABA credentials |
| Evaluation URL | — | Remains **untouched** (locked) |

## Rollback

- Git: `git reset --hard 5874fb51` on WIP (or revert `abf641e3`)  
- AWS PG: `pg_ctl -D …/pgdata -m fast stop`  
- Never touch `https://isalwa-os-web-evaluation.vercel.app`

## Remaining queue

1. Browser: Pedido lifecycle strip + Campana ack (tooling gap)  
2. Live elapsed catch-up after API reload  
3. Hosted only after local completeness + Q-DEPLOY-01 stack  
