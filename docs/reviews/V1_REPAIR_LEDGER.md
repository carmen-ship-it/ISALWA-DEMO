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
| D3 delivery writes not transactional, no event/audit | High | Agent A | Documentos and Pedido timeline **do** work — preserve them; Historial is the gap |
| D5 cumulative over-delivery | Medium | Agent A | policy now set by ADR 0003; enforce atomically at dispatch |
| D6 Compras work-list pagination + free-text authority | Medium | Cursor | introduced by the live commit `52a9f9e` |
| S3 approval self-dealing | Medium | unassigned | ADR 0003 now defines the approval rules |
| S4 party timeline bypasses commercial policy | Medium | Agent B | |
| S5 mass assignment / actor spoofing | Medium | Agent B | |
| S14 member detail readable by any member | Medium | Agent B | |
| S7 QA "Ver como" drops operator attribution | Medium | unassigned | staging only |
| S11 idempotent replay before authorization | Low | unassigned | |
| S12 issue journal/outcome lack ownership check | Medium | unassigned | |
| S13 any role can quote any customer | Medium | unassigned | |
| S15 delivery-ops documents broader than delivery-notes | Low–Med | unassigned | |
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
| E3 failing suites at the V1 SHA | Medium | Cursor | includes `os-api inspection-reads.adversarial` revealed by E2 |
| E4 os-web lint non-functional; os-api lint is `echo` | Low | unassigned | |
| E5 generated Prisma client embeds an absolute path | Low | unassigned | rewritten by every local build |
| H1 no security headers; `X-Powered-By` present | Low | unassigned | |
| H2 login label contrast 2.73:1 | Low | unassigned | |
| R1 Render tracks `main`, which lacks V1 | High | Cursor | deployment-process change, not code |
| DEP next ≥ 15.5.24 | Low | unassigned | image-optimizer advisory |

Disproven / not defects: pre-hydration credential leak, dev header-identity in
staging, CORS reflecting arbitrary origins, XSS sinks in the inspected web
source, PDF proxy session/authorization/cache/filename handling.

## Blocked, therefore unproven

Staging sign-in fails for the stored demo passwords, so every authenticated
hosted check is blocked and must not be reported as verified: the four fixture
checks (DEMO TALLER SAN LORENZO / `Q-000022` / `O-000008`), all desks, global
search timing, role lenses, 25/26+/100+ row behaviour, 390 px mobile, PDFs,
cross-role and cross-company negative tests, and owner acceptance. Only Carmen
can resolve the credentials; fixtures must not be rerun to work around it,
because that resets every shared persona password.
