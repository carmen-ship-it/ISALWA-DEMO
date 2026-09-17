# FINAL_V1_LIVE_VS_LOCAL

**Probed:** 2026-09-17T13:53:49Z · READ-ONLY

| Field | Value | Proof method |
|---|---|---|
| LOCAL_HEAD | `02688431b9290b818c8fb245d68c086379363b3f` | `git rev-parse HEAD` |
| REMOTE_HEAD | `02688431b9290b818c8fb245d68c086379363b3f` | `git rev-parse origin/ct3/owner-demo-completeness` |
| WEB_RUNTIME_SHA | `02688431b9290b818c8fb245d68c086379363b3f` | Render live deploy `dep-dalujo3m8hqs73e5o5r0` |
| API_RUNTIME_SHA | `02688431b9290b818c8fb245d68c086379363b3f` | Render live deploy `dep-dalujofqj5pc73dme4q0` |
| DIRTY_TREE | **clean** (0) | `git status --porcelain` |
| UNTRACKED_FILES | **none** at probe | same |
| LATEST_REPO_MIGRATION | `20260920120000_os_finished_goods_receipt_pedido_context` | `packages/os-database/prisma/migrations/` |
| LATEST_STAGING_MIGRATION | `20260920120000_os_finished_goods_receipt_pedido_context` | Prior RC probe + RELEASE_TRAIN_STATE |
| SCHEMA_DRIFT | **NO** | repo tip == staging finished migration name |
| SYNTH_SEED_VERSION | `fixture:owner-demo` (owner-demo seed) | `apps/os-web/lib/demo/seeded-ids.json` |
| SYNTH_SEEDED_AT | `2026-09-17T13:10:41.619Z` | `seeded-ids.json` `seededAt` |
| REAL_SEVEN_MUTATED | **NO** | seed receipt + `seeded-ids.json` |

**Assumptions avoided:** runtime SHAs taken from deploy IDs recorded at RC cut (`v1-rc2-deploys-final.json`), not inferred from branch tip alone.
