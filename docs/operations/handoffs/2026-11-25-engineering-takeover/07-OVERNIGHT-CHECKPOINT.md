# Overnight checkpoint — 2026-11-25 (post-browser)

**Writer:** Cursor thread `b6a344b1-1bdb-4b47-be28-1a0cab32bca6` (only active ISALWA writer this session)  
**Configured model/effort:** Composer / Auto  
**Branch:** `wip/overnight-handoff-20261125`  
**Prior GitHub tip:** `b19641172437d778d2ba238bb24face8ca009c11` (handoff after Pedido `abf641e3`)  
**Code checkpoint before this handoff commit:** see `git rev-parse HEAD` after push  
**Parent outcome:** **PARTIAL → ADVANCED** (browser + clock + admin seat proven on AWS; hosted still open)

## 1. Is engineering running remotely? Can the Mac stay idle?

**Yes — VERIFIED.** Active checkout and disposable DB are on `carmen-aws-dev` (`ip-172-31-19-214`). Carmen’s Mac stays idle. GitHub is durable SoT for sanitized artifacts.

| Field | Value |
| --- | --- |
| Host | `carmen-aws-dev` / Ubuntu 24.04 |
| Checkout | `/home/ubuntu/projects/isalwa-wt-overnight-20261125` |
| Writer lock | `/home/ubuntu/projects/.isalwa-overnight-writer.lock` (+ checkout copy) |
| Disposable DB | `isalwa_overnight_20261125_disposable` @ `127.0.0.1:55439` |
| Runtime | `/home/ubuntu/test-runtime/isalwa-overnight-20261125` |
| Durable candidate (sanitized + PNG) | `/home/ubuntu/test-runtime/isalwa-overnight-20261125/durable-candidate` |
| Chromium | `/home/ubuntu/.cache/ms-playwright/chromium-1140/chrome-linux/chrome` (executable present) |
| Live API | process name `MainThread` / Nest os-api · `OS_API_PORT` · `OS_AUTH_MODE=dev` · `OS_ELAPSED_NOTICE_CLOCK=1` · `OS_ELAPSED_NOTICE_CLOCK_MS=5000` · `OS_OUTBOX_WORKER=1` · `OS_PROJECTION_WORKER=1` (no secret values) |
| Live web | `next-server` on `127.0.0.1:3200` |

## 2. Customer-to-delivery spine (same synthetic records)

**VERIFIED** on AWS disposable via `spine-canonical.http.test.ts` → **9/9 PASS** (prior this session; carried forward).

A1 on AWS: **51/51** including linked-salida boundary (carried forward).

## 3. Pedido indicators, notifications, admin

| Item | Status |
| --- | --- |
| Pedido Nota/Salida/Entrega indicators | **BROWSER VERIFIED on AWS** 1440 + 390 · strip ✓ Nota/Salida/Entrega · refresh holds · seed needed `os_order_read_models` |
| Pedido delivery-doc read (abf641e3) | **HTTP VERIFIED** 7/7 · owner list+PDF allow · other customer deny · other tenant NOT_FOUND · teammate/no-relationship deny · team.read+report allow |
| Elapsed 48h/60m/15m unit clock | **VERIFIED** 4/4 |
| Elapsed live catch-up | **VERIFIED** live test 1/1 + API process running with `OS_ELAPSED_NOTICE_CLOCK=1` · restart idempotent · no invented recipient |
| Campana drawer + Enterado | **BROWSER VERIFIED on AWS** 1440 + 390 · drawer opens · notice visible · Enterado click · ack persisted on reopen |
| Role preview non-grant | **VERIFIED** (prior HTTP/unit; carried forward) |
| people.admin HTTP mutations + non-admin deny | **VERIFIED** 12/12 (carried forward) |
| people.admin browser seat | **BROWSER VERIFIED on AWS** admin Equipo/Accesos/Capacidades 1440+390 · sales_rep blocked on same paths |
| Full hosted journey | **PACKAGE PREPARED** — deploy **blocked** (see `08-Q-DEPLOY-01-PREVIEW-PACKAGE.md`); evaluation untouched |

Sanitized browser JSON (no cookies):  
`docs/operations/handoffs/2026-11-25-engineering-takeover/evidence/`  
PNG evidence stays under AWS `durable-candidate/browser-proof/evidence/` (not GitHub).

## 4. What is on GitHub vs only on server

| Location | Content |
| --- | --- |
| GitHub `wip/overnight-handoff-20261125` | Handoff + Pedido/auth/clock/seed sources + sanitized JSON evidence |
| AWS disposable DB + `session.json` / cookies | Synthetic only — **not** uploaded |
| AWS `durable-candidate` | Sanitized JSON + PNG screenshots |
| Evaluation URL | Untouched |

## 5. Blocked / decisions for Carmen

| Blocker | Owner | Decision needed |
| --- | --- | --- |
| Hosted preview (Q-DEPLOY-01) | Carmen | **One decision:** approve new Railway overnight project (API+Postgres) under existing **$5** soft limit; Auth = reuse staging (prepared). Neon/no new Supabase. See `08-…`. Review of `eb8c6428` still open. |
| Independent review | Reviewer | Verdict on `eb8c6428` (builder does not self-certify) |
| WhatsApp real | Carmen | Meta/WABA credentials + authority (simulated remains) |
| Evaluation URL | — | Remains **untouched** (locked); health rechecked |

## Rollback

- Git: soft recovery to `b1964117` / `abf641e3` / `5874fb51` on WIP — **no hard reset required tonight**
- AWS PG: stop disposable only (`pg_ctl` on overnight `pgdata`)
- Never touch `https://isalwa-os-web-evaluation.vercel.app`

## Remaining queue

1. Independent review verdict on `eb8c6428` → resolve findings → re-verify changed scope if candidate moves  
2. Carmen: paid API + dedicated DB + Auth decision → then create/deploy separate preview (never evaluation)  
3. Hosted synthetic journey after deploy  
4. Real WhatsApp only after separate provider setup  

## Q-DEPLOY-01 package pointer

Sanitized: `08-Q-DEPLOY-01-PREVIEW-PACKAGE.md`  
Operator vault (export + full package, not GitHub): `~/.isalwa-secrets/overnight-preview-20261125/`  

