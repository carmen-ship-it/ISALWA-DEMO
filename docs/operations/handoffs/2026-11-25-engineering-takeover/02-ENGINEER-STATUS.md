# Engineer status — 2026-11-25 (La Paz / AST overnight)

**Parent outcome: PARTIAL**  
**Writer:** Cursor agent on thread `b6a344b1-1bdb-4b47-be28-1a0cab32bca6`  
**Purpose of this branch:** move Mac-only WIP + decisions onto GitHub so a new engineering agent can continue without depending on a slow Mac.

## Repo / tree

| Item | Value |
| --- | --- |
| Repo | `carmen-ship-it/ISALWA-DEMO` |
| Working branch for takeover | `wip/overnight-handoff-20261125` |
| Pre-WIP local HEAD | `09cfedfb4842274e521b7b569fd482d0fa3fa9e9` |
| `origin/ct3/v1-repairs` before push | `7fe8772a…` (missing ~40 local commits through `09cfedfb`) |
| Dirty before this WIP commit | **114 paths** (87 modified, 27 untracked) |
| Disposable PG | `isalwa_v1_repairs_verify_20261124_disposable` `:54329` |
| Auth | `OS_AUTH_MODE=dev`, cookie name `os_dev_session` |
| Note | Live API PID **42680** on `:4001` was started **before** A1 + elapsed-notice code landed → **stale until reload** |

## Canonical spine (same IDs HTTP + browser)

See `04-SPINE-IDS.sanitized.json` and `05-EVIDENCE.json`.

| Step | Status | Notes |
| --- | --- | --- |
| Cliente / Party | BROWSER + HTTP | `partyId` `01M88GGQDBWN…` |
| Oportunidad | BROWSER + HTTP | `opportunityId` `01M88GGQFDP…` |
| Cotización + PDF | BROWSER + HTTP | `Q-000001` / quote `…F8KGMC`; PDF sha recorded; drain outbox after SubmitQuote or PDF 404 |
| Conversation / follow-up | BROWSER + HTTP | simulated WhatsApp; commitment on Hoy |
| CreateOrder | BROWSER + HTTP | `O-000001` / `01M88GGRD0S9…` canonical `os_orders` |
| Producción | BROWSER + HTTP | CreateWorkItem plant update — not Order→ProductionRun |
| Almacén | BROWSER + HTTP | delivery-ops path; **do not** treat preserved non-proof `P-WH-N30G8Z` / `01M868ZQYY…` as CreateOrder proof |
| Nota / Salida / Entrega | HTTP persisted | Pedido UI still showed **empty circles** for Nota/Salida/Entrega despite rows |
| Finanzas | HTTP | payment **report** present; ≠ confirm |
| Cliente 360 | BROWSER | same spine IDs |

**HTTP:** `apps/os-api/src/spine-canonical.http.test.ts` → **9/9 PASS**  
**A1:** dispatch-ledger + cumulative → **37/37 PASS** (unit/Nest on then-current tree)  
**Elapsed notices:** unit TESTED LOCALLY; migration `20261125050000_elapsed_notice_kinds`; live API **not** reloaded

## Matrix (short)

| Area | Ladder | Gap |
| --- | --- | --- |
| Conversation coverage `commercial.work` only | IMPLEMENTED + tested | keep scope; not `quote.convert` blanket |
| Warehouse CreateOrder visibility | BROWSER VERIFIED LOCALLY (spine) | pedido indicator UI lag |
| A1 unlinked salida physical cap | TESTED LOCALLY | re-prove on **reloaded** API |
| 48h / 60m / 15m elapsed clock | TESTED LOCALLY (unit) | live catch-up after API reload |
| Campana | button on Inicio | drawer click / ack **not** proven |
| Hoy | spine commitment visible | — |
| people.admin | sales_rep correctly blocked | seat journeys with admin still open |
| 390px | no overflow observed | F5 clipped top bar known historically |
| Hosted separate preview | blocked | needs commit (done here as WIP), new Vercel, hosted API/DB, Supabase identities — evaluation URL forbidden |
| WhatsApp real | blocked | Meta/WABA |

## Discoveries the new agent must keep

1. Duplicate CreateOrder may return **HTTP 404** (not always 409) — assert carefully; row count must stay 1.  
2. PDF 404 until commercial projection/outbox drain after SubmitQuote.  
3. Playwright: prefer `domcontentloaded` over flaky `networkidle`.  
4. Warehouse read path: `GET /delivery-ops/orders` + canonical `os_orders`, not copied read models.  
5. A1: linked salida shares nota goods; **unlinked** salida adds physical qty and must fail when cumulative > line.  
6. GitHub recovery branch `recovery/ct3-v1-repairs-20261124` @ `a967633e` holds Nov evaluation receipts; local `09cfedfb` was not on remote until this WIP push.  
7. Isa/Álvaro evaluation page journeys / slowness cause remain **NOT VERIFIED LIVE** in this WIP track.

## Next concrete actions (priority order)

1. Pin this branch; treat GitHub as SoT.  
2. On any runtime: reload os-api onto this tree; re-run A1 + spine HTTP.  
3. Trace Pedido empty Nota/Salida/Entrega indicators (UI vs projection).  
4. Campana drawer + notice ack.  
5. people.admin authorized seat journeys.  
6. Elapsed clock live catch-up after reload.  
7. Hosted only after local completeness + Q-DEPLOY-01 separate stack.

## Non-goals right now

- Redesign / token language change  
- Touch evaluation Vercel project  
- Fabricate WhatsApp or prices/hours  
- Merge this WIP to `main` without review  
- Depend on Mac filesystem for agent memory
