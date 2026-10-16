# Commercial Release V2 — Checkpoint

Contract: `docs/product/COMMERCIAL_RELEASE_V2.md` (SHA256 `cc3f1436…0581588`) + Addendum A1 `docs/product/COMMERCIAL_INTERACTIONS_A1.md` (SHA256 `f24cab99…0261871`). A1 deltas per task: `commercial-release/REUSE_MAP.md` §9. Writer: `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. One writer, one task.

| Task | State | Commit | Receipt |
|---|---|---|---|
| T00 | LOCAL_COMPLETE (docs only) | see receipt | `commercial-release/receipts/T00.md` |
| T01 | IN PROGRESS (T01a replay envelope v2 edited, typechecks; tests pending) | — | — |

## Last confirmed step

T00 committed (`30077c6`). A1 incorporated (docs commit). T01a: v2 replay envelope (actor+command+payload fingerprint, legacy → REPLAY_REVIEW_REQUIRED) applied to commercial, commitment, issue, party, location, workforce, import, work, delivery, customer-conversations controller; `pnpm --filter @isalwa/os-api^... build` and os-api `tsc --noEmit` clean. Uncommitted T01 paths = original 19 S11 paths + os-work (2), os-delivery package.json, pnpm-lock.yaml (workspace link only), customer-conversations controller.

## Next command

T01: update S11 tests to v2 contract, run fake tests, then real-PG concurrency tests against disposable cluster `~/.isalwa-disposable-pg/commercial-v2` (port 54329, DB `isalwa_t01_disposable`, 33 migrations applied; start with `LC_ALL=C pg_ctl -D ~/.isalwa-disposable-pg/commercial-v2 -o "-p 54329 -k /tmp" start`). Never port 5432, never staging.

## Open blockers

None for local work. External dependencies (§14) recorded per task when reached.
