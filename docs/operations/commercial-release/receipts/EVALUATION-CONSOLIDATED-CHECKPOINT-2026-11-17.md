# Consolidated evaluation checkpoint — 2026-11-17

Authority: Carmen evaluation-deployment instruction (this turn). Product candidate `7ddf258b`. Docs tip `813e170d`. Integrator sole writer on `ct3/v1-repairs`. No push. No deploy in this document.

## 1. Full SHA and tree

| Ref | Full SHA | Tree |
|---|---|---|
| Product candidate | `7ddf258bab696e3fa3a0767d9205a03f42a46af5` | `9c42e782ab362d858601134e71ce2e28db7d38c0` |
| Docs tip (inventory/export sync) | `813e170df2ff4bd1887289b8f8ba53ddd8b11332` | `a573ccb20e4fd7aed55b1e8cfbdda0bdb79710e7` |
| Worktree HEAD | same as docs tip `813e170d` | same |

Allowlisted export is built from **product** `7ddf258b` (docs tip is not in the export allowlist).

## 2. Implementation commits since `aada5396` (through `7ddf258b`)

| SHA | Summary |
|---|---|
| `11e4f38b` | Stage A customer finishing — forms, former/archive gates, bulk follow-up |
| `5737c17b` | Batch 2 customer entry — create gate, §5.4 form, import paste |
| `5aaf8375` | Batch 3 quote approval, issuance, acceptance and order |
| `24580c1c` | Docs: Batch 4 catalog blocker |
| `6f46eede` | Batch 5 Registrar atención, filters/search, Tomar conversación |
| `a66f2bf0` | Docs: Batch 5 tested; inspection-read count |
| `9803b01f` | Batch 6 reported payments, tender verify, allocations, instructions |
| `51cc88c0` | Batch 7 commitments actions, handover, stored notices |
| `fd11db98` | Batch 8 navigation, Hoy, map honesty, Journey, 44px |
| `28353597` | Batch 9 channel honesty + hosting prep receipts |
| `a1fceaa0` | Batch 3B pin issued PDF download to frozen document hash |
| `a51358f8` | Batch 8B Cliente 360 next-step header |
| `b5a78be6` | Docs: note Batch 8B SHA |
| `a8f3fc3a` | Evaluation notice + Phase 1 inventory/script |
| `6e987719` | Phase 4 hosting prep receipt |
| `7ddf258b` | Batch 5B attention states + team-only Nota interna |

(Post-candidate docs tip `813e170d` advances inventory/export fingerprints only.)

## 3. Tests against the final candidate

No single monorepo green re-run was executed on tip after `7ddf258b` in this checkpoint. Claims are **per-receipt** on the implementation SHAs:

| Layer | Result (receipt) | Browser |
|---|---|---|
| Stage A | HTTP 20/20; os-web 1340; tsc; `next build`; browser `ok: true` | Yes (Stage A only) |
| Batch 2–4 | Per Batch 2/3 receipts; Batch 4 BLOCKED | No full-journey browser on tip |
| Batch 5 | Per `BATCH-5-CONVERSATIONS.md` | No |
| Batch 5B (`7ddf258b`) | os-api **412/412**; os-web **1471/1471**; contracts 261; database 315; tsc; `next build`; HTTP 11/11 | **No** |
| Batch 6–9, 3B, 8B | TESTED LOCALLY per receipts | 8B/3B/9 not browser-verified |

HTTP/Postgres: disposable `isalwa_stage_a_disposable` @ 54329 (45 migrations after 5B).

## 4. Mutation-filter

Stage A bulk follow-up party-filter mutation: **caught** (6 pass / 1 fail); source restored. Batch 5B: CAS/holder mutations caught; note-key pre-check is shortcut (unique index still enforces). **No intentional mutation left in source** for those checks.

## 5. Independent review

| | |
|---|---|
| Reviewer of final candidate `7ddf258b` | **None** |
| Verdict | **NOT INDEPENDENTLY REVIEWED** |
| Packet prepared now | `review-packets/REVIEW-PACKET-EVALUATION-7ddf258b.md` |

Prior reviews (earlier SHAs only) do not clear this candidate. **Deploy remains gated** until PASS / owner-accepted PASS WITH FOLLOW-UPS and any BLOCKING findings are repaired + retested.

## 6. Complete user journeys that work (local candidate, synthetic)

Clientes search/detail/edit; Registrar cliente (create scope); import paste (steward); archive/reactivate; corrections path; coverage; Cliente 360 header; conversaciones (Registrar atención, claim, attention states, Nota interna; Mensaje blocked); quotes → approve → Emitir → PDF (hash pin) → acceptance → order; payments report/verify/allocate; compromisos CRUD/handover/notices; Hoy/shell; mapa list + honest no-token map; `/sistema` honesty.

## 7. Hidden / disabled / unavailable

WhatsApp/email send (No conectado; Mensaje Enviar disabled); Mapbox canvas without token; catalog share; unpublished payment-instruction share; AI authoritative answers; 48h engine/scheduler/sound; held-conversation release/reassign; inbound reopen (rule only); T12–T14 adapters; Entrar (desarrollo) must be off when hosted auth is supabase; evaluation notice when `NEXT_PUBLIC_OS_EVALUATION_NOTICE=1`.

## 8. Allowlisted export

| | |
|---|---|
| Path | `/Users/carmen/projects/isalwa-transfer-readiness/export/isalwa-source-7ddf258b.tar.gz` |
| SHA-256 | `f945d0e311b14c6772e5b3f0ec24ab68fd19205295e24342144bf1cfb9cd2eaf` |
| Source SHA/tree | `7ddf258b` / `9c42e782` |
| Files / migrations | 1868 / 45 |
| Scan | 0 private-key / JWT-like / sk_live / AKIA hits (counts only) |
| Contents | `apps` (architect/api stripped from extract), `packages`, workspace root build files, `.env.example`, CI compose — **no** `.git`, **no** `docs/**`, **no** project-memory, **no** secrets |

## 9. Why Cursor can show “>5,000 changed lines”

`git diff --shortstat aada5396..7ddf258b` → **354 files, +137,075 / −76,664**. Of that, **`**/generated/**` alone is +110,710 / −74,760** (Prisma client regenerations). Docs: +6,046. Application excluding docs+generated: +20,319 / −1,903 across 306 files. Worktree vs HEAD is clean except untracked `.tmp` (2 paths). The UI total is therefore mostly **generated client churn + docs + multi-batch product**, not uncommitted WIP.

## 10. `.tmp` (intentionally uncommitted)

Local evidence and tooling only: Stage A mutation/HTTP/browser logs, seed scripts, API/web run logs, batch mutate helpers. `apps/os-api/.tmp-stage-a/` holds local synthetic seed/fixtures. Never part of the allowlisted export; must stay untracked.

## Access checks (this turn) — deploy not started

| Check | Result |
|---|---|
| Vercel MCP | User authenticated; default list hits team `carmen-ship-its-projects` → **403** until team session grant |
| Team grant URL (existing team, not a new team) | Issued; single-use (~10 min) |
| Vercel CLI | Not installed globally; `npx vercel whoami` → **login_required** |
| CLI device login | URL `https://vercel.com/oauth/device?user_code=CJWL-SGWB` |
| Supabase | Inventory host `qbpxuywtoycjpitxoblo.supabase.co` now responds (auth health **401** without key — host alive). Local `~/.isalwa-secrets/supabase-url` file does **not** hold a URL (contents are a paste instruction). Architect app remains separate. |
| API host | Still **no** always-on no-cost destination authorized without purchase |
| Hobby | Personal/non-commercial Hobby terms remain a business judgment; Pro would be a purchase (not authorized) |

## Exact deploy blockers (ordered)

1. **Independent review** of `7ddf258b` (packet ready) — required before deploy per instruction.  
2. **Vercel project ops**: CLI installed (`~/.local/bin/vercel` 65.17.0); MCP user `carmen-ship-it` (Hobby). Team scope grant / project list still needed for deploy ops — pause briefly if the session rejects team access, then resume when Carmen re-opens the plan’s hosting step.  
3. **API + Postgres + workers**: compatible always-on destination without purchase — unresolved.  
4. **Supabase Auth**: confirm commercial project identity, redirects, free-tier pause risk; fix local URL secret file before configuring hosted env (do not print values).

Web-only Vercel deploy is **not** sufficient and will not be called “deployed.”

## Evaluator seats prepared

See `EVALUATION-EVALUATOR-ROLES.md` — Asesor + Jefe comercial/cobertura; emails deferred.
