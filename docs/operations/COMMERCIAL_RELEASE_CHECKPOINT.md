# Commercial Release V2 — Checkpoint

Contract: `docs/product/COMMERCIAL_RELEASE_V2.md` (SHA256 `cc3f1436…0581588`) + Addendum A1 `docs/product/COMMERCIAL_INTERACTIONS_A1.md` (SHA256 `f24cab99…0261871`) + Addendum A2 `docs/product/COMMERCIAL_SELF_SERVICE_A2.md` (SHA256 `1b16dd90…7e9d67869`). Deltas per task: `commercial-release/REUSE_MAP.md` §9 (A1), §10 (A2). Writer: `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. One writer, one task.

| Task | State | Commit | Receipt |
|---|---|---|---|
| T00 | LOCAL_COMPLETE (docs only) | `30077c6` | `commercial-release/receipts/T00.md` |
| T01 | LOCAL_COMPLETE (tested fake + disposable PG + local HTTP; NOT INDEPENDENTLY REVIEWED) | `1d69341` | `commercial-release/receipts/T01.md` |
| T02 | IN PROGRESS (customer visibility boundary under the 2026-10-16 17:18 decision; A2 adds no new T02 scope) | — | — |

## Last confirmed step

T01 committed: S11 v2 replay envelope across command services, import claim-first, outbox recovery and finished-goods replay binding, durable workforce provider effects via outbox consumer. The 19 original S11 paths are included in the T01 commit (pre-change snapshot in `evidence/T00/`).

A2 incorporated (docs commit, REUSE_MAP §10) while T02 was in progress; T02 source edits stay uncommitted until T02 evidence is complete.

## Next command

T02 with A1 (`REUSE_MAP.md` §9.5) and A2 (§10.4) deltas: finish shared customer-visibility predicate across party search/detail/contacts/locations/timeline/conversations, then HTTP + disposable-PG evidence. Before running DB tests: `pnpm --filter "@isalwa/os-api^..." run build`, then restore the 3 generated Prisma client files with `git checkout --`. Disposable cluster `~/.isalwa-disposable-pg/commercial-v2` (port 54329, DB `isalwa_t01_disposable`; start with `LC_ALL=C pg_ctl -D ~/.isalwa-disposable-pg/commercial-v2 -o "-p 54329 -k /tmp" -l ~/.isalwa-disposable-pg/commercial-v2/server.log start`). Never port 5432, never staging.

## Open blockers

None for local work. External dependencies (§14) recorded per task when reached.

## Known pre-existing failures (not T01)

6 delegation tests (5 os-database integration, 1 os-api HTTP) fail with PERMISSION_DENIED because their fixtures delegate scopes the delegator does not hold by own role (rule from `6b29ab3`). os-web tsc TS5097 in `lib/mobile/mobile-390-proof.test.ts`. Owner: engineering, separate repair task.
