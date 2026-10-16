# Commercial Release V2 — Checkpoint

Contract: `docs/product/COMMERCIAL_RELEASE_V2.md` (SHA256 `cc3f1436…0581588`). Writer: `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. One writer, one task.

| Task | State | Commit | Receipt |
|---|---|---|---|
| T00 | LOCAL_COMPLETE (docs only) | see receipt | `commercial-release/receipts/T00.md` |
| T01 | NEXT | — | — |

## Last confirmed step

T00 committed. S11 19 paths still uncommitted and unchanged (manifest `commercial-release/evidence/T00/s11-manifest.sha256`).

## Next command

T01: start disposable Postgres 16 cluster on port 54329 under `~/.isalwa-disposable-pg/commercial-v2` (never port 5432, never staging), apply migrations, run S11 replay tests.

## Open blockers

None for local work. External dependencies (§14) recorded per task when reached.
