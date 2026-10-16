# Commercial Release V2 — Checkpoint

Contract: `docs/product/COMMERCIAL_RELEASE_V2.md` (SHA256 `cc3f1436…0581588`) + Addendum A1 `docs/product/COMMERCIAL_INTERACTIONS_A1.md` (SHA256 `f24cab99…0261871`) + Addendum A2 `docs/product/COMMERCIAL_SELF_SERVICE_A2.md` (SHA256 `1b16dd90…7e9d67869`). Deltas per task: `commercial-release/REUSE_MAP.md` §9 (A1), §10 (A2). Writer: `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. One writer, one task.

| Task | State | Commit | Receipt |
|---|---|---|---|
| T00 | LOCAL_COMPLETE (docs only) | `30077c6` | `commercial-release/receipts/T00.md` |
| T01 | LOCAL_COMPLETE (tested fake + disposable PG + local HTTP; NOT INDEPENDENTLY REVIEWED) | `1d69341` | `commercial-release/receipts/T01.md` |
| T02 | LOCAL_COMPLETE (customer visibility boundary + operational reads + shared rate limit; tested fake + disposable PG + local HTTP; NOT INDEPENDENTLY REVIEWED) | `f76751d` | `commercial-release/receipts/T02.md` |
| T03 | NEXT | — | — |

## Last confirmed step

T02 committed: shared customer-visibility predicate (search/detail/contacts/locations/timeline/conversations), duplicate-counterpart redaction, HTTP+PG proof for the 8 remaining operational GETs (ledger pending = 0), Postgres-shared rate limit (`os_rate_limit_buckets`, migration 34) for search/commands/invitations.

## Next command

T03 with A1 (`REUSE_MAP.md` §9.5) and A2 (§10.4) deltas, plus T02 dependencies recorded in `receipts/T02.md` §8 (customer authority on CreateOpportunity/CreateQuote, resource checks on party edit commands, quote/order people.admin bypass). Before DB tests: `pnpm --filter "@isalwa/os-api^..." run build` (packages export `dist`; rebuild after every package source change). Restore the 3 generated Prisma client files with `git checkout --` unless the schema changed. Disposable cluster `~/.isalwa-disposable-pg/commercial-v2` (port 54329, DB `isalwa_t01_disposable`, server TZ America/New_York; start with `LC_ALL=C pg_ctl -D ~/.isalwa-disposable-pg/commercial-v2 -o "-p 54329 -k /tmp" -l ~/.isalwa-disposable-pg/commercial-v2/server.log start`). Never port 5432, never staging. New migrations: bump `EXPECTED_MIGRATION_COUNT` in `staging-wave2-role-fixtures-guards.ts`.

## Owner decision 2026-10-16 17:58 (demo artifacts)

Recorded in `commercial-release/REUSE_MAP.md` §11. Remove the sample-data demo view (A: `os-web` `?datos=demo` SYNTH data mode) in T10/T11 after separating shared code; preserve the guided presentation (B: Story Mode "Recorrido completo de ISALWA" + `lib/walkthrough` + `lib/guidance`) and update it in T20. Nothing removed yet. Owner clarification 18:04 recorded in §11.0: keep the top "Recorrido" Journey tab (update in T20); remove the full-app teacher/demo data mode (switch, banner, state, routing, SYNTH switch, substitutions) in T10/T11; keep real pages and records.

## Open blockers

None for local work. External dependencies (§14) recorded per task when reached.

## Known pre-existing failures (not T01/T02)

6 delegation tests (5 os-database integration, 1 os-api HTTP) fail with PERMISSION_DENIED because their fixtures delegate scopes the delegator does not hold by own role (rule from `6b29ab3`). os-web tsc TS5097 in `lib/mobile/mobile-390-proof.test.ts`. os-query `query-context.tenant.test.ts` (expects `sales_rep` in roleKeys). Schema drift baseline vs migrations in ~40 older tables (`evidence/T02/schema-drift-baseline.txt`). Owner: engineering, separate repair task.
