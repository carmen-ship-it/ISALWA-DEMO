# ISALWA V1 repair ledger

Owner: Cursor (repair integration lead). Independent review: Claude Code (read-only).
Base of this wave: Claude's reviewed SHA `52a9f9e90014ea81c92f949f171bcaac9f0efca0`.
Product rules for this wave: `docs/adr/0003-v1-delivery-quantities-and-commercial-approvals.md`.

Proof states are kept separate and never collapsed: **confirmed / disproven /
pending** for a finding, and **fixed in source / tested / deployed /
independently verified** for a repair. Hosted authenticated verification is
blocked (staging sign-in), so nothing in this wave is independently verified yet.

## Live deployment

| Service | Live SHA | Checked |
|---|---|---|
| `os-web-staging` `srv-dajddb67bikc73bl42q0` | `93a9ca1facfe659562d1f2701e248aaf8775aadf` | 2026-10-01, unchanged |
| `os-api-staging` `srv-dajd64gae00c739gpk20` | `52a9f9e90014ea81c92f949f171bcaac9f0efca0` | 2026-10-01, unchanged |

Both Render services track `main`, which does **not** contain the V1 lineage
(R1). Deploys must name an exact SHA. Never deploy latest `main`.

## Parallel batch (current)

Shared base SHA for all lanes: `1de4cda2bd744c863455fc2c30c46f699e7db30a`.

| Lane | Owner | Branch / worktree | Findings |
|---|---|---|---|
| Integration + gates | Cursor | `ct3/v1-repairs` — `isalwa-wt-v1-repairs` | S1, S2, D1, D2, D4, D6, E1–E3 |
| Delivery integrity | Agent A | `ct3/v1-delivery-integrity` — `isalwa-wt-v1-delivery-integrity` | D3, D5 |
| Read authorization | Agent B | `ct3/v1-read-authorization` — `isalwa-wt-v1-read-authorization` | S4, S14, S5 |

Agents may commit on their own branch. Agents may not deploy, touch shared
staging data, or reset fixtures. Protected and untouched: `main` (`ca3821f`),
`ct3-owner-demo` (`d4c4ed1`, 11 WIP files), Claude's review worktree.

## Repairs completed in source

| Finding | Status | Commit | Regression evidence |
|---|---|---|---|
| S1 cross-company shared identity | fixed in source, tested | `a45199f` | `workforce-cross-company-identity.test.ts` — 9 cases; 3 reproduced the defect before the fix |
| S2 delegation / role escalation | fixed in source, tested | `a45199f` | `workforce-delegation-escalation.test.ts` — 12 cases; 7 reproduced the defect |
| E2 test discovery | fixed in source, tested | `0eebd1e` | `os-api` 5 files → 119 tests; `os-database` 3/30, `os-query` 8/9 corrected |
| D1 outbox lost updates | fixed in source, tested | `1de4cda` | failing-delivery retry test (was red) + P2002 classifier test, no database needed |
| D2 re-request after resolve → 500 | fixed in source, tested | `2affa01` | `open-request-rerequest.test.ts` — re-request reproduced the real P2002 before the fix |
| D4 shared idempotency-key instance state | fixed in source, tested | `5efed5a` | concurrency test in the same file: red with the old field, green with the async scope |
| E3 `os-commercial` 3 red | fixed in source, tested | `7773dc8` | 59/59; the duplicate-conversion CONFLICT it exists to prove now actually runs |
| E3 `os-purchasing` 1 red | fixed in source, tested | `a8c8405` | 18/18; guard follows the shared-copy binding |
| E3 `os-database` 2 red | fixed in source, tested | `19e4ba1` | 70/70; pinned count checked against the migrations on disk |
| E2/E3 `os-web` 1 red + 20 undiscovered | fixed in source, tested | `491f221` | 1287/1287, up from 1267 |
| D3 delivery writes not transactional (.2–.4) | fixed in source, tested | `9fff05a`, `7e8f3ef` | agent A: 27 of 35 new tests red first; `os-delivery` 36 → 98 |
| D5 cumulative over-delivery | fixed in source, tested | `36e7890`, `7e8f3ef` | agent A: enforced under an order lock inside the transaction |
| S4 timeline bypasses commercial policy | fixed in source, tested | `f79b134`, `6b9b0d7` | agent B: 14 of 15 red first, then 16/16 |
| S14 member detail readable by any member | fixed in source, tested | `b773dbf`, `ffb9610` | agent B: 4 red first, then 7/7 |
| S5 conversation actor/id spoofing | fixed in source, tested | `96c7bbd` | agent B reproduced the spoof: client `id`, `enteredByMemberId` and label all won |
| S19 ten unclassified reads | classified, **not** verified | `42874be` | labels claim no proof; backlog count pinned |
| Suspended owner on create | fixed in source, tested | `bf1f4ed` | red without the check; `AssignOpportunityOwner` already had it |
| Timeline direct-report wiring | fixed in source | `bf1f4ed` | prevented a fail-closed regression for team leads |

Notes on choices that departed from the review's suggested fix:

- **S2** — a flat delegable-scope allowlist broke an existing expectation that a
  holder may delegate authority they hold (vacation coverage). Implemented rule:
  never a reserved technical/QA scope (`system.admin`, `integration.admin`,
  `qa.access`), never self-delegation, admin scopes only when the delegator
  holds them, unrecognized strings rejected. Role keys stay free text for job
  keys but cannot carry a reserved scope, and no member may raise their own
  admin authority.
- **S1** — self-service email change still works for the person themselves;
  only cross-company mutation by another org's admin is refused. Terminate and
  suspend still revoke membership access in the acting org and simply leave the
  shared login alone.
- **D2** — the review suggested giving business events a freshly generated key.
  Instead the event now carries only the caller's key and no key at all when the
  caller sent none, which keeps event-level dedup meaningful for retried HTTP
  requests. Claim keys stay in `os_idempotency_keys`, which is where they are
  released on resolve.
- **D4** — rather than adding a tenth positional argument to every `emit` call
  across eight services, the key lives in an `AsyncLocalStorage` scope entered by
  `execute`. Each service's command body is unchanged and moved verbatim into a
  private `runCommand`.
- **D1** — consumers are pure upserts, so a duplicate delivery is safe while a
  lost update is not. A failed attempt releases its own dedup claims, and only a
  unique-constraint violation counts as an existing claim.

## Open findings

Confirmed in source, not yet repaired:

| Finding | Severity | Owner | Note |
|---|---|---|---|
| D6 Compras work-list pagination + free-text authority | Medium | Cursor | introduced by the live commit `52a9f9e` |
| S3 approval self-dealing | Medium | unassigned | ADR 0003 now defines the approval rules |
| S19 read-authorization review for 10 reads | Medium | unassigned | classified as unreviewed in source; the review itself is still owed |
| S20 every conversation readable tenant-wide | Medium | unassigned | found by agent B while fixing S5: `GET /customer-conversations` returns all conversations, including `pastedEvidence`, to any active member |
| S21 conversation links unvalidated | Low | unassigned | `opportunityId`, `quoteId`, `orderId` on a new conversation are client-supplied and unchecked |
| D3.1 hosted delivery events still not emitted | High | unassigned | **decision required**, see below |
| D5.1 receipt not capped at dispatched quantity | Medium | unassigned | ADR 0003 bounds dispatch, not receipt |
| D5.2 order revision command | Medium | unassigned | ADR 0003 requires a revision before extra quantity; no command exists |
| A1 unlinked salida can double-dispatch | Medium | unassigned | the two ledgers are capped separately, so a note for 10 plus an *unlinked* warehouse exit for 10 both pass on a line of 10 |
| S7 QA "Ver como" drops operator attribution | Medium | unassigned | staging only |
| S11 idempotent replay before authorization | Low | unassigned | |
| S12 issue journal/outcome lack ownership check | Medium | unassigned | |
| S13 any role can quote any customer | Medium | unassigned | |
| S15 delivery-ops documents broader than delivery-notes | Low–Med | unassigned | the `os-api` read inventory independently flags `GET /delivery-ops/orders/:orderId/documents` as unclassified |
| P1 Compras boundary copy | Low | product | the full `PURCHASE_REQUEST_BOUNDARY` sentence now renders only in the permission-denied state; the authorized queue shows a shorter hand-written line. Copy decision for Carmen, not a security repair |
| S16 payload validated before authentication | Low | unassigned | no write possible |
| S17 open redirect via encoded control characters | Medium | unassigned | needs an end-to-end router test, not just URL parsing |
| S18 collapsed sign-in errors; fixtures reset shared passwords | Low | unassigned | do **not** rerun fixtures to unblock review |
| S10 no rate limiting; unbounded org-wide reads | Low | unassigned | |
| D7/S8 raw error messages leak; 500s unlogged | Medium | unassigned | |
| D8 quote/order numbers = count + 1 | Medium | unassigned | concurrent creates collide |
| D9 quote PDF built from projection | Medium | unassigned | worse while D1 was open |
| D10 Compras/Producción/Almacén not wired; ephemeral queue | High | unassigned | ADR 0003 puts this in V1 scope |
| D11 unbounded/capped reads | Low | unassigned | |
| D12 delivery FK drift between migrations and Prisma models | Low | unassigned | do not generate a migration that drops constraints |
| E1 CI runs no tests or lint | High | Cursor | |
| E4 os-web lint non-functional; os-api lint is `echo` | Low | unassigned | |
| E5 generated Prisma client embeds an absolute path | Low | unassigned | rewritten by every local build |
| H1 no security headers; `X-Powered-By` present | Low | unassigned | |
| H2 login label contrast 2.73:1 | Low | unassigned | |
| R1 Render tracks `main`, which lacks V1 | High | Cursor | deployment-process change, not code |
| DEP next ≥ 15.5.24 | Low | unassigned | image-optimizer advisory |

### Agent decisions worth owner attention

- **Two ledgers, not one sum (agent A).** Delivery notes and warehouse exits are
  each capped at the current order-line quantity rather than added together,
  because a nota and its linked salida describe the same goods and summing them
  would reject the normal flow. This matches Carmen's rule that recording receipt
  must not count the quantity again. The residual hole is A1 above: an *unlinked*
  salida is counted only in its own ledger.
- **D3.1 left unwired deliberately (agent A).** `listTimelineForOrder` returns
  recorded events whenever any exist, so writing one event would silently hide an
  older order's row-derived history. Doing it properly needs outbox and audit
  append through `os-events`, which `os-delivery` does not depend on. Carmen's V1
  scope asks for delivery audit/history, so this needs a decision rather than a
  quiet omission.
- **Peer member view (agent B).** `commercial.team.read` and `commercial.org.read`
  deliberately do not widen the peer view. Cargo labels are separated from
  authority scopes by a heuristic that was not checked against real data.
- **`customerLabel` now comes from the Party (agent B).** A small intentional
  behaviour change: the stored label can differ from what the panel shows until
  reload.

### Gate state after the E2/E3 batch

Every package suite is green: os-contracts 166, os-domain 232, os-workforce 85,
os-work 19, os-events 5, os-commercial 59, os-commitment 10, os-party 6,
os-issue 72, os-import 19, os-purchasing 18, os-database 70, os-web 1287.
After integrating both agents: os-delivery 98, os-query 63, os-commercial 60,
os-api 125 pass / 0 fail / 2 cancelled. The only suite that cannot run here is
`tenant-isolation`, which requires Postgres. Full `pnpm -r build` is clean.

Disproven / not defects: pre-hydration credential leak, dev header-identity in
staging, CORS reflecting arbitrary origins, XSS sinks in the inspected web
source, PDF proxy session/authorization/cache/filename handling.

## Blocked, therefore unproven

Staging sign-in fails for the stored demo passwords, so every authenticated
hosted check is blocked and must not be reported as verified: the four fixture
checks (DEMO TALLER SAN LORENZO / `Q-000022` / `O-000008`), all desks, global
search timing, role lenses, 25/26+/100+ row behaviour, 390 px mobile, PDFs,
cross-role and cross-company negative tests, and owner acceptance. The failure
is not yet diagnosed from provider project identity and a safe error. Fixtures
must not be rerun, because that resets every shared persona password.

## Repairs after the immutable checkpoint

Checkpoint `32810573b2dab46ea0b5bae2773d4f06340601be` stays immutable and undeployed.
Integration HEAD `70dd6125e132c4f877a5ad0dec0b6767e1b6dfeb` on `ct3/v1-repairs`.
Nothing in this list is deployed, hosted, or browser-verified.

| Finding | State | Commit | Evidence |
|---|---|---|---|
| Disposable Postgres for the gated suites | TESTED on a cluster that was later recreated | `884296d`, `8090463` | os-database 258/258 and the two tenant-isolation tests passed when `OS_DATABASE_URL` pointed at local Postgres 16 on port 54329. Without that variable those files do not register, so a missing database is not a release pass. |
| D1 completion after delivery | TESTED, including SIGKILL | `9667915` | 4/4 crash tests on `isalwa_v1_d1`. Completion is written after `deliver` returns. Consumers re-apply the same event. |
| S2 closed grant allowlist | TESTED in unit suites | `6b29ab3` | `grant-scopes.test.ts` 13/13. `os-workforce` 106/106. Job titles stay stored and confer no command. |
| S11 replay authorization | TESTED for os-work only | `6746a58` | Other command services still replay before the current actor is checked. |
| S12 issue writes | TESTED in `os-issue` | `0612108` | 85/85. Unrelated members cannot journal, record an outcome, or link work. |
| S20 / S21 conversations | IMPLEMENTED, unit-tested, HTTP UNPROVEN | `70dd612` | Visibility and link rules are pure functions with passing tests. No local HTTP request was sent. |
| External Compras sentence | TESTED in the web copy helper | `af3fb82` | Stored result includes “No se creó una orden de compra.” |

Still open after that HEAD: A1, D5.1, D5.2, D3.1, the other nine unreviewed GET routes, S11 outside os-work, approval-rule enforcement, staging sign-in diagnosis, and rollback of old code against the new idempotency and outbox rows.
