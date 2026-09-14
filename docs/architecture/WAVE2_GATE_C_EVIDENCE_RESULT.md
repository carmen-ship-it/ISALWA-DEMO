# Wave 2 — Gate C evidence result (`ef7eeab`)

**Exact candidate:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Integration pin:** `316426f272bce29924ffd4991da88ffe7d421bbd` (unmoved)  
**Deploy / migrate:** **NO**

## Current Gate C state

```
MIGRATION_SQL_SAFE = YES
RECOVERY_READY_TO_APPLY = PROVEN (Carmen live Render Recovery screen)
EXECUTION = BLOCKED_EXACT_SHA_EXECUTION_PATH
```

## Recovery proof (accepted)

Carmen opened live Render Postgres `isalwa-os-staging` Recovery:

- Point-in-time recovery: restore from any timestamp in the past **7 days**
- Separate Export logical backup (retained ≥ 7 days)
- **No restore initiated. No export initiated** (PITR sufficient; fresh export not required)

## Exact-SHA execution path (proven in design)

**Governed local path** (from `docs/operations/BACKUP_RESTORE_RUNBOOK.md`):

1. Clean worktree at **`ef7eeabdea5f8f4449ba706caa1a323435d96fcc`**
2. `export OS_DATABASE_URL="$(cat ~/.isalwa-secrets/isalwa-os-staging.external-database-url)?sslmode=require"`
3. Prove `current_database() = isalwa_os_staging` and `_prisma_migrations` count = 11
4. `pnpm --filter @isalwa/os-database migrate:deploy`

**Do not** run migrate from deployed Render filesystem at `1f767fa`.

## Why this agent did not execute

| Probe | Result |
|---|---|
| Local `psql` / Prisma via external URL | SSL closed / **IP `192.223.107.85` not in allow list** |
| `render psql dpg-dajd3kh5efls738falcg-a` | **IP not in allow list** |
| `render ssh` (ephemeral / non-interactive) | **Interactive only** — cannot drive from this agent |
| Allow-list change | **Forbidden** |

Exact candidate checkout on agent host: **proven** (`ef7eeab`, clean).  
DB reachability from this agent host: **blocked by allow list**.

## Pre-migration baseline (Carmen live evidence — preserve)

Applied migrations: **11** (last `20260913150000_os_client_import`)  
Pending: **18** → expected post total **29**  
Wave 2 tables: absent · purchase: absent/zero  
Baseline counts: orgs 2 … import_rows 37 (unchanged expectation)

## Unblock requirement (Carmen)

From an **already allow-listed** operator environment (Carmen laptop if allowlisted, or Render Shell with **ef7eeab migration files fetched separately — not `1f767fa` tree**):

```bash
cd /path/to/isalwa   # or wave2-candidate-unified worktree
git checkout --detach ef7eeabdea5f8f4449ba706caa1a323435d96fcc
git rev-parse HEAD   # must print ef7eeabdea5f8f4449ba706caa1a323435d96fcc
test -z "$(git status --porcelain)"

export OS_DATABASE_URL="$(cat ~/.isalwa-secrets/isalwa-os-staging.external-database-url)?sslmode=require"
# On Render private network, use the service's OS_DATABASE_URL (internal) instead.

psql "$OS_DATABASE_URL" -At -c "SELECT current_database(), (SELECT count(*) FROM _prisma_migrations);"
# expect: isalwa_os_staging|11

pnpm --filter @isalwa/os-database migrate:deploy
```

Then run post-checks (count 29, Wave 2 tables present, empty ops counts, baseline unchanged).  
**Do not deploy application** until a separate authorization after `MIGRATED_AND_VERIFIED`.
