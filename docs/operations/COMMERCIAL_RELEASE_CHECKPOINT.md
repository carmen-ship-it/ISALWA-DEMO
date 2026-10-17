# Commercial Release V2 — Checkpoint

Contract: `docs/product/COMMERCIAL_RELEASE_V2.md` (SHA256 `cc3f1436…0581588`) + Addendum A1 `docs/product/COMMERCIAL_INTERACTIONS_A1.md` (SHA256 `f24cab99…0261871`) + Addendum A2 `docs/product/COMMERCIAL_SELF_SERVICE_A2.md` (SHA256 `1b16dd90…7e9d67869`). Deltas per task: `commercial-release/REUSE_MAP.md` §9 (A1), §10 (A2). Writer: `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. One writer, one task.

| Task | State | Commit | Receipt |
|---|---|---|---|
| T00 | LOCAL_COMPLETE (docs only) | `30077c6` | `commercial-release/receipts/T00.md` |
| T01 | LOCAL_COMPLETE (tested fake + disposable PG + local HTTP; NOT INDEPENDENTLY REVIEWED) | `1d69341` | `commercial-release/receipts/T01.md` |
| T02 | LOCAL_COMPLETE (customer visibility boundary + operational reads + shared rate limit; tested fake + disposable PG + local HTTP; NOT INDEPENDENTLY REVIEWED) | `f76751d` | `commercial-release/receipts/T02.md` |
| T03 | IN_PROGRESS (part 1 `3183c36`; part 2 `1d20081`; part 3 `7f9286f`; not complete) | `receipts/T03.md` (partial) | `commercial-release/evidence/T03/part2/` (run4), `part3/` (run5 all green, HTTP + Postgres, 2 mutation checks) |
| R1 (review: grant provisioning F03/F04) | LOCAL_COMPLETE (unit + disposable PG + local HTTP, 2 mutation checks; NOT INDEPENDENTLY REVIEWED) | see git log `fix(workforce): R1` | `commercial-release/receipts/REVIEW-R1.md` |
| R2 (review: effective delegation F10, grant/team range, bootstrap procedure) | LOCAL_COMPLETE (unit + disposable PG + local HTTP, 3 mutation checks; NOT INDEPENDENTLY REVIEWED; bootstrap PREPARED, NOT EXECUTED) | see git log `fix(authz): R2` | `commercial-release/receipts/REVIEW-R2.md` |
| R3 (review: tenant selection F09) | LOCAL_COMPLETE (unit + disposable PG + local HTTP, 3 mutation checks; NOT INDEPENDENTLY REVIEWED; BROWSER CHECK UNPROVEN) | see git log `fix(tenancy): R3` | `commercial-release/receipts/REVIEW-R3.md` |
| R2 follow-up (21:33: delegation enforcement, suspension lifecycle, ChangeRole, bootstrap) | LOCAL_COMPLETE (unit + disposable PG + local HTTP, 5 mutation checks; NOT INDEPENDENTLY REVIEWED; preview BROWSER CHECK UNPROVEN; bootstrap PREPARED, NOT EXECUTED) | see git log `fix(authz): R2 follow-up` | `commercial-release/receipts/REVIEW-R2-FOLLOWUP.md` |
| R4 corrections (22:20 §1–§2: lifecycle ends coverage; persistent grants explicit only) | LOCAL_COMPLETE (unit + disposable PG + local HTTP, 3 mutation checks; NOT INDEPENDENTLY REVIEWED; BROWSER CHECK UNPROVEN) | see git log `fix(authz): R4 corrections` | `commercial-release/receipts/REVIEW-R4-CORRECTIONS.md` |
| R4 reactivation (22:29 decision 1: ActivateMember does not revive previous-lifecycle authority) | LOCAL_COMPLETE (unit + disposable PG + local HTTP incl. concurrency and rollback, 3 mutation checks; NOT INDEPENDENTLY REVIEWED) | see git log `fix(authz): R4 reactivation` | `commercial-release/receipts/REVIEW-R4-REACTIVATION.md` |
| R4 role-change preview (22:29 decision 4: same rules as execution) | LOCAL_COMPLETE (local HTTP + PG, os-web unit, 2 mutation checks; NOT INDEPENDENTLY REVIEWED; BROWSER CHECK UNPROVEN) | see git log `fix(authz): R4 role-change preview` | `commercial-release/receipts/REVIEW-R4-ROLE-PREVIEW.md` |
| R4 Journey neutrality (22:29 decision 3) | LOCAL_COMPLETE (os-web unit, 3 mutation checks; NOT INDEPENDENTLY REVIEWED; BROWSER CHECK UNPROVEN) | see git log `fix(web): R4 Journey neutral` | `commercial-release/receipts/REVIEW-R4-JOURNEY.md` |
| R4 lifecycle revival backfill proposal (22:20 §3) | LOCAL_COMPLETE as dry-run tooling (disposable PG, 3 mutation checks; NOT INDEPENDENTLY REVIEWED; NOT EXECUTED — release dependency, needs owner authorization + reviewed plan hash) | see git log `feat(ops): R4 lifecycle revival backfill` | `commercial-release/receipts/REVIEW-R4-BACKFILL-DRYRUN.md` |
| R4 multi-holder provisioning plan (22:29 decision 2) | LOCAL_COMPLETE (disposable PG, synthetic Jefe/Gerencia roster, 6/7 mutation checks; NOT INDEPENDENTLY REVIEWED; NOT EXECUTED) | see git log `feat(ops): R4 multi-holder provisioning plan` | `commercial-release/receipts/REVIEW-R4-BOOTSTRAP-PLAN.md` |
| R4 review status (22:29 decision 5) | RECORDED (docs only): `RE-REVIEW_R3_R2F.md` findings and placement in `REVIEW_RECONCILIATION.md`; review was source-level, not runtime | see git log `docs(review): R4 re-review status` | `commercial-release/REVIEW_RECONCILIATION.md` § Re-review R3 / R2 follow-up |
| R4 read gaps part A: work + approvals (F10 authorship, F11; 20:03 §4) | LOCAL_COMPLETE (unit + disposable PG + local HTTP, 8 mutation checks; NOT INDEPENDENTLY REVIEWED; BROWSER CHECK UNPROVEN). Part B (F07 commitments) next | see git log `fix(authz): R4 work and approval reads` | `commercial-release/receipts/REVIEW-R4-WORK-READS.md` |
| R4 part B repair 1: ReassignWork authority by work class (23:27 §1, REQUIRED) | LOCAL_COMPLETE (unit + disposable PG + local HTTP with no-trace checks, 9 mutation checks; NOT INDEPENDENTLY REVIEWED; BROWSER CHECK UNPROVEN) | see git log `fix(authz): R4 ReassignWork` | `commercial-release/receipts/REVIEW-R4-REASSIGN-WORK.md` |
| R4 part B repair 2: `organization_member` approvals subject policy (23:27 §2, REQUIRED) | OPEN — security gap kept open until proven repaired | — | — |
| R4 part B repair 3: F07 commitments across list/detail/related paths (23:27 §3, REQUIRED) | OPEN — security gap kept open until proven repaired | — | — |

## Last confirmed step

T02 committed: shared customer-visibility predicate (search/detail/contacts/locations/timeline/conversations), duplicate-counterpart redaction, HTTP+PG proof for the 8 remaining operational GETs (ledger pending = 0), Postgres-shared rate limit (`os_rate_limit_buckets`, migration 34) for search/commands/invitations.

## Next command

R2 follow-up done (21:33 §1–§6): os-query approval reads and os-delivery permission lookup use the canonical delegation rule; suspension/termination end delegations issued by and granted to the member in the same transaction (reinstatement needs a fresh grant); ChangeRole replaces only the primary role, preserves additional grants unless explicitly revoked, with a preview shown before confirmation; bootstrap limited to three minimal proposals with explicit range. Next: R4 / task 4 read gaps (F07, F10 authorship, F11) with HTTP+PG and 404 non-disclosure.

R3 done (20:03 §7, §13.8 #3): web organization context comes from proven active membership via `GET /v1/session/organizations`; one → used, several → valid previous choice or chooser, none → honest no-access; tampered/stale selectors refused by os-api; switching clears session storage and reloads; the Journey no longer changes organization or data mode. Next: task 4 read gaps (commitments, work items, approvals; F07, F10 authorship, F11) with HTTP+PG and 404 non-disclosure.

R2 done (20:03 §13.8 #2, 20:39 §1–§4): delegations confer only while the delegator is active and still holds the scope (reads, commands, replays, approval decisions); grants and ChangeManager cannot give reach beyond the grantor's own; initial provisioning procedure prepared and tested with synthetic identities only (execution needs owner-named member + approval); os-web TS5097 repaired. Next: R3 tenant selection (F09).

R1 done (20:03 §3): `GrantAdditionalRole` requires independent possession and denies self-target; `ChangeManager` denies self-appointment and backdating; `ChangeRole` denies backdating; commercial action scopes are assignable together by a grantor who holds them. Initial holders per scope are an owner dependency. Next: R2 effective delegation (F10), then R3 tenant selection (F09), per `REUSE_MAP.md` §13.8.

T03 part 3 done (owner decisions 2026-10-16 19:30, authoritative record `REUSE_MAP.md` §12): coverage converts only with explicit `quote.convert` + the advisor's own conversion permission (BR-CNV-02 refined; grantor delegates only what it holds); reassign/coverage administration need `commercial.account.reassign` AND reach (team, new `commercial.assignment.org`, new `commercial.intake.assign`; `org.read` is not reach); reassignment ends coverage and keeps record ownership; data-steward lookup `GET /v1/master-data/parties`. Migration impact on staging/fixture grants in §12.6 (not changed; hosted grants UNVERIFIED). Payments authorization PENDING T07. Delegation/date failure accounting in `receipts/T03.md` §12. Open: new owner cannot `convert.own` the previous owner's submitted quote (recorded).

T03 part 2 done (authority rules in `receipts/T03.md` §3): master-data vs commercial authority per command; coverage by explicit action (`coveredActions`); non-disclosure 404/403 order; atomic seller CreateParty with account ownership + generic duplicate 409; manager work = action permission (`commercial.customer.edit`, new `commercial.work.manage`) + current team/org range. T10/T11 also removes the unused "Modo aprendizaje" toggle (no functional consumer, `REUSE_MAP.md` §11.0). Open policy items: coverage-convert (V2 l.121), org-wide `commercial.account.reassign`. Still to do in T03: receipt §9. Generated Prisma client is now committed with the T03 schema; regenerate (`npx prisma generate`) instead of `git checkout`.

T03 remaining after part 1 (`3183c36`: owner/coverage authority on customer + commercial commands and reads; people.admin bypass removed): bounded CreateParty for commercial.customer.create (generic duplicate result + "Registrar otro cliente" motive), version check + motive + history on edits, phone update/retire, end contact relation, archive/reactivate with obligation block, correction requests via issues, coverage proof, import/export bounds, HTTP/PG negative + concurrency evidence, A2-J01/J04/J05/J07/J10, receipt. Interpretation in force: coverage + the actor's own commercial.customer.edit = edit; coverage never grants archive/reactivate. Known pre-existing failures outside T03: delegation fixtures (os-database 5, os-api 1, os-domain 3), os-query session-org role row, missing dist for os-pedido-case/database. T03 with A1 (`REUSE_MAP.md` §9.5) and A2 (§10.4) deltas, plus T02 dependencies recorded in `receipts/T02.md` §8 (customer authority on CreateOpportunity/CreateQuote, resource checks on party edit commands, quote/order people.admin bypass). Before DB tests: `pnpm --filter "@isalwa/os-api^..." run build` (packages export `dist`; rebuild after every package source change). Restore the 3 generated Prisma client files with `git checkout --` unless the schema changed. Disposable cluster `~/.isalwa-disposable-pg/commercial-v2` (port 54329, DB `isalwa_t01_disposable`, server TZ America/New_York; start with `LC_ALL=C pg_ctl -D ~/.isalwa-disposable-pg/commercial-v2 -o "-p 54329 -k /tmp" -l ~/.isalwa-disposable-pg/commercial-v2/server.log start`). Never port 5432, never staging. New migrations: bump `EXPECTED_MIGRATION_COUNT` in `staging-wave2-role-fixtures-guards.ts`.

## Owner decision 2026-10-16 17:58 (demo artifacts)

Recorded in `commercial-release/REUSE_MAP.md` §11. Remove the sample-data demo view (A: `os-web` `?datos=demo` SYNTH data mode) in T10/T11 after separating shared code; preserve the guided presentation (B: Story Mode "Recorrido completo de ISALWA" + `lib/walkthrough` + `lib/guidance`) and update it in T20. Nothing removed yet. Owner clarification 18:04 recorded in §11.0: keep the top "Recorrido" Journey tab (update in T20); remove the full-app teacher/demo data mode (switch, banner, state, routing, SYNTH switch, substitutions) in T10/T11; keep real pages and records.

## Commit ledger (full SHA, tree)

A commit cannot record its own SHA; each one is added by the next commit.

| Commit | Tree | Task | Writer / review |
|---|---|---|---|
| `41bdb2eac02d8b2ae5adb2d4883debd806264d34` | `4fae0e9d5fac6a5477570b0770119dfafaf9e3fe` | R2 | this writer; re-reviewed at source level (`RE-REVIEW_R1_R2.md`) |
| `78003ff5a3a498ca2d38371462b9cb671d8a7e58` | `43c7f2ef2da16db42a237c5fcdf39281d8837ab9` | R3 (F09) | this writer; re-reviewed at source level, not runtime (`RE-REVIEW_R3_R2F.md`) |
| `ce7464831cac67d03344361151c2df536d3d7d56` | `f718ab993502e41e73408cd7955f05cac4e72adf` | R2 follow-up | committed by a second agent in this worktree (cross-lane collision, nothing lost); not verified alone by this writer, its tests pass as part of later runs; re-reviewed at source level, not runtime (`RE-REVIEW_R3_R2F.md`) |
| `3520dfe16e9d2f2e97e84cb9b7545d40f7b02570` | `ce8df60e7296ab2357bb05e6e5379269163beb50` | R4 corrections (22:20 §1–§2) | this writer; not reviewed |
| `0316531b0575749383f409f18729d476caa70700` | `99c2decd659a6d0941a67b43e384e7aa5b7cf316` | R4 reactivation (22:29 decision 1) | this writer; not reviewed |
| `a8a3307260cb4d2ca29d75acff296ff9359255f0` | `8845378fabc4dc33884445ba363d8130c32981d9` | R4 role-change preview (22:29 decision 4) | this writer; not reviewed |
| `da6c7e4c801673891e47942aa8e2eb6302224fe1` | `70b467a682a4623dedeaab7bef37c509ebc7d264` | R4 Journey neutrality (22:29 decision 3) | this writer; not reviewed |
| `cc47c6823b925e7d583eaac4b553bc1a576f46c6` | `02f86487e7c843a2361c7f99c614c1be2ac8baac` | R4 lifecycle revival backfill proposal (22:20 §3) | this writer; not reviewed; not executed |
| `71d048af81de90af4dcb381e80830dd41307f209` | `b02f18bf6a17cf9785e35c65483444c3599d287e` | R4 multi-holder provisioning plan (22:29 decision 2) | this writer; not reviewed; not executed |
| `0d3e30a69b5dc6e53eecb0b110af2c30ba8f5e0b` | `e509ecad18ec469247c2e3ed2da55f0e9977dde6` | R4 re-review status (22:29 decision 5, docs only) | this writer |
| `a1ed5870f97533d825a01f7bbb895919c3ae4485` | `de390eec0093324718dd5c1c86679c94fa5430e9` | R4 read gaps part A (F10 authorship, F11) | this writer; not reviewed |

## Open blockers

**TRANSFER/PUSH BLOCKER (20:39 §5):** four R1 evidence logs and every commit from `e7d8d98` on are UNREVIEWED — NOT FOR TRANSFER (`commercial-release/evidence/REVIEW-R1/UNREVIEWED-NOT-FOR-TRANSFER.md`). No push, upload, archive or sharing of this branch until resolved through an authorized review. Local development continues. Review snapshots of this branch carry the same marking; future review exports are built from an explicit path allowlist that excludes restricted logs before any file is materialized (21:33 §6). The logs are not sanitized and the blocked inspection is not retried.

None for local work. External dependencies (§14) recorded per task when reached.

## Known pre-existing failures (not T01/T02)

(Historical, now passing: os-database 299/0 and os-api 223/0 in R2.) 6 delegation tests (5 os-database integration, 1 os-api HTTP) failed with PERMISSION_DENIED because their fixtures delegate scopes the delegator does not hold by own role (rule from `6b29ab3`). os-web tsc TS5097 in `lib/mobile/mobile-390-proof.test.ts`: repaired in R2. Legacy `apps/api` `canonical-session.bootstrap.test.ts` source-text assertion fails (outside os-api graph; separate repair). os-query `query-context.tenant.test.ts` (expects `sales_rep` in roleKeys). Schema drift baseline vs migrations in ~40 older tables (`evidence/T02/schema-drift-baseline.txt`). Owner: engineering, separate repair task.
