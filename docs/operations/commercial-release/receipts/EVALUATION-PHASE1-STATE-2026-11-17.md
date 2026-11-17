# Phase 1 — Exact current state (evaluation pause)

Date: 2026-11-17. Integrator sole writer: `/Users/carmen/projects/isalwa-wt-v1-repairs` · `ct3/v1-repairs`. Authority: `CONTINUATION-2026-11-16.md`. New implementation batches paused for evaluation candidate.

## 1. Identity

| Field | Value |
|---|---|
| Branch | `ct3/v1-repairs` |
| HEAD | `b5a78be6a8efc476416926528e8858bc1a61d427` |
| Tree | `7ddfe6d6834f0c2dbb9369e33cffca9187900d46` |
| Tip subject | `docs(commercial-release): note Batch 8B commit SHA on receipt` |
| Stage A commit (ancestor) | `11e4f38b1c7e637c66fda0f95a8bb1cc1233fb23` · tree `bdef1b92fb7a0a498067ae6b9720e9f2c210d715` |
| Not pushed | yes |

Commits after Stage A (12): Batch 2 → 3 → 4-blocked → 5 → 6 → 7 → 8 → 9 → 3B PDF pin → 8B Cliente 360 header → docs note.

## 2. Modified / untracked application files (worktree)

**Not Stage A.** All dirty application files belong to incomplete **Batch 5B** (Nota interna / attention states), plus regenerated Prisma client and migration count bump for that WIP.

| Path | Class |
|---|---|
| `apps/os-api/src/customer-conversations.controller.ts` | B5B WIP |
| `apps/os-api/src/batch5b-conversation-state-notes.http.test.ts` (untracked) | B5B WIP |
| `apps/os-web/components/conversations/*` (list/thread/workspace + new attention/composer/notes) | B5B WIP |
| `apps/os-web/lib/conversations/*`, `lib/api/os-api-client.ts` | B5B WIP |
| `packages/os-contracts/src/customer-conversation*.ts` | B5B WIP |
| `packages/os-database/prisma/fragments/customer-conversation.prisma`, `schema.prisma` | B5B WIP |
| `packages/os-database/prisma/migrations/20261024000000_os_conversation_attention_state_notes_b5b/` | B5B WIP (untracked) |
| `packages/os-database/src/generated/client/*` | Generated Prisma output for B5B schema |
| `packages/os-database/src/staging-wave2-role-fixtures-guards.ts` (+ test) | `EXPECTED_MIGRATION_COUNT` 44→45 for B5B |
| `.tmp/`, `apps/os-api/.tmp-stage-a/` | Local evidence / seed; keep untracked |

**Committed HEAD has 44 migrations.** Working tree and disposable DB currently show **45** because the B5B migration was applied locally during WIP. Evaluation candidate must use **committed** bytes (44), not this dirty tree.

## 3. Stage A customer finishing

Already **committed** at `11e4f38b` with receipt `STAGE-A-CUSTOMER-FINISHING.md` (2026-11-16). Checklist items (archive/former/legal-name/forms/corrections/coverage/bulk follow-up/tests) are recorded as implemented and locally tested. No Stage A source remains uncommitted.

## 4. Generated / unrelated

- Generated: Prisma client under `packages/os-database/src/generated/client/` (dirty, tied to B5B).
- Unrelated noise: `.tmp/**`, `apps/os-api/.tmp-stage-a/**` (local).
- Accidental `git stash` during inspection was restored; `stash@{0}: temp-check` remains as a backup of the same B5B snapshot and must not be treated as Stage A.

## 5. Processes and disposable database

| Resource | State |
|---|---|
| Postgres | Listening on **54329** (PID 83430) |
| Exact DB for Stage A / commercial local | `isalwa_stage_a_disposable` · user `isalwa_disposable` · TCP `127.0.0.1:54329` (also historically `host=/tmp`) |
| Migrations applied in that DB | **45** (includes uncommitted B5B `20261024000000_…`) |
| os-api `:4001` | **Not listening** |
| os-web `:3200` | **Not listening** |
| Other node/nest/next | None found |

## 6. Tests / mutation

| Item | Status |
|---|---|
| Stage A HTTP / web / tsc / next build / browser | Recorded PASS in `STAGE-A-CUSTOMER-FINISHING.md` (evidence under receipt + `.tmp/stage-a*`) |
| Mutation `mutation-party-filter` | Deliberate removal of party filter on bulk follow-up → **caught** (6 pass / 1 fail); source hash restored. **Not** claimed complete beyond that detection. |
| Batches 2–9 local receipts | TESTED LOCALLY per checkpoint (Batch 4 BLOCKED; Batch 9 honesty only) |
| Dirty B5B | Incomplete; tests/files present but **not** evaluation candidate |
| Suites re-run on clean HEAD this morning | Not re-executed in this Phase 1 pass (API/web down) |

## 7–8. What roles can do *in the committed product* (HEAD)

Requires local API+web+DB with synthetic sessions. At this moment **no browser servers are up**, so “through the browser right now” = **unavailable until servers are started**. Capability below is from committed receipts/source, not a live session:

| Actor | Working (committed) | Visible but limited / honest disconnect |
|---|---|---|
| Advisor (commercial owner / coverage) | Clientes search/detail; Registrar cliente (if `commercial.customer.create`); edit allowed fields; Cliente 360 next-step header; Registrar atención; Tomar conversación; commitments create/reschedule; quote draft→issue→PDF→acceptance→order (with approval scope); report payment | WhatsApp send blocked; map without Mapbox token; catalog share blocked; AI/providers disconnected; payment instructions share absent without published content |
| Manager | Manager range / Hoy / commitments handover where authority exists; price approve if scope held | Price-approve **range** not modelled |
| Data steward | Import paste ValidateClientImport; archive/reactivate; phone review paths | Real customer import must stay off |
| Accounting | Per-tender verify / allocations when `payments.confirm` | No approved payment-instruction content; no cash-receiver roster |

Missing / unwired / refused: WhatsApp delivery, catalog “Compartir”, live Mapbox canvas without token, T12–T14 adapters, 48h follow-up engine, Nota interna / five attention states (**only in dirty B5B, not HEAD**).

## 9. Clean committed snapshot buildability

**Yes for source identity:** HEAD `b5a78be6` is a coherent commit chain with receipts. Working tree is **not** clean (B5B WIP). Disposable DB is **ahead** of HEAD by one WIP migration. Evaluation build must check out / export **HEAD**, use a DB at **44** migrations (or migrate deploy from HEAD only), and ignore dirty B5B files.

## 10. Hosting dependencies

| Layer | State |
|---|---|
| Web | `apps/os-web` Next.js — Vercel-capable |
| API | `apps/os-api` Nest long-running + in-process outbox/projection/attention — **not** a Vercel function |
| Worker | In-process with API |
| Postgres | New evaluation DB required; Render staging suspended/unpaid — do not use |
| Auth | Supabase Auth for hosted (`OS_AUTH_MODE=supabase`); local may use `dev` — hosted must not |
| Private files | Payment evidence in API/DB; no object storage provider configured |
| Vercel `carmen-ship-it` | MCP authenticated; **team scope** `carmen-ship-its-projects` (`team_DEQabB6VsHaNsPpEd8VuC6Nw`) needs team authorization link before inventory/deploy |

## Phase 2 verdict (immediate)

- Stage A is **already finished and committed** (`11e4f38b` + receipt). No second Stage A commit is required.
- Do **not** commit dirty Batch 5B into the evaluation candidate.
- **Proposed evaluation release candidate:** HEAD `b5a78be6` / tree `7ddfe6d6` (includes Stage A + Batches 2–9 + 3B + 8B; excludes B5B WIP).
- States: Stage A **COMMITTED** · **TESTED LOCALLY**. Batches 2–9 **COMMITTED** · **TESTED LOCALLY** (with documented gaps). **INDEPENDENTLY REVIEWED** / **DEPLOYED AS EVALUATION** / **HOSTED JOURNEYS VERIFIED**: no.
