# Wave 2 — staging deploy blocked (`ef7eeab`)

**Date:** 2026-09-14  
**Candidate:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Gate C:** MIGRATED_AND_VERIFIED (DB 29) — remigrate not desired  
**Decision:** **BLOCKED_DEPLOY_RUNS_MIGRATIONS**  
**Deploy executed:** **NO**  
**Integration pin:** `316426f272bce29924ffd4991da88ffe7d421bbd` (unmoved)

## Pre-deploy proof

| Check | Result |
|---|---|
| Local SHA | `ef7eeabdea5f8f4449ba706caa1a323435d96fcc` |
| Worktree | CLEAN at detach |
| Remote presence | on `origin/ops/gate-c-migrate-ef7eeab` |
| Hosted API (live) | `1f767fa1244fbda796e684917639d5cfc01ee70c` |
| Hosted WEB (live) | `1f767fa1244fbda796e684917639d5cfc01ee70c` |
| DB migrate count | Operator-proven **29** (agent IP still not allowlisted to re-query) |

## Render config (exact)

### os-api-staging (`srv-dajd64gae00c739gpk20`)

- repo: `https://github.com/carmen-ship-it/ISALWA-DEMO`
- branch tracked: `main` (autoDeploy: yes)
- buildCommand: `corepack … && pnpm install --frozen-lockfile && pnpm --filter @isalwa/os-database prisma:generate && pnpm --filter @isalwa/os-api... build`
- **preDeployCommand: `pnpm --filter @isalwa/os-database migrate:deploy`**
- startCommand: `pnpm --filter @isalwa/os-api start`

### os-web-staging (`srv-dajddb67bikc73bl42q0`)

- same repo; branch `main`; autoDeploy yes
- buildCommand: install + `pnpm --filter @isalwa/os-web... build`
- startCommand: `pnpm --filter @isalwa/os-web start`
- **no** preDeploy migrate

## Why blocked

This pass forbids any deploy mechanism that would automatically rerun migrations.  
`os-api-staging` **will** run `migrate:deploy` on every deploy via `preDeployCommand`.

Even if that command would be an idempotent no-op at count 29, the stop rule is absolute: **BLOCKED_DEPLOY_RUNS_MIGRATIONS**.

## Unblock options (Carmen authorize one — do not invent)

1. **Preferred for this Wave 2 cutover:** Temporarily clear `preDeployCommand` on `os-api-staging`, deploy exact `ef7eeab`, confirm no migrate ran / count stays 29, then decide whether to restore a governed migrate-on-deploy policy later.  
2. **Policy override:** Explicitly accept idempotent `migrate:deploy` on deploy after Gate C (document as safe no-op when pending=0) — requires Carmen written exception to the stop rule.  
3. Do **not** change allow list solely to unblock agent DB checks.

Also ensure Render can fetch commit `ef7eeab` (already on `ops/gate-c-migrate-ef7eeab`; services track `main` — deploy-by-commit may still work if GitHub has the SHA).

## Proof states (unchanged by this pass)

| State | Status |
|---|---|
| MIGRATED | YES |
| DEPLOYED | NO |
| HOSTED | NO |
| BROWSER-VERIFIED | NO |
| USER-ACCEPTED | NO |
| SAFE FOR ISA / ÁLVARO | NO |

## Remediation follow-up

See `WAVE2_PREDEPLOY_MIGRATE_OWNERSHIP.md` — **CONFIG_CHANGE_REQUIRES_APPROVAL** (clearing preDeploy may `service_updated`-deploy `main`).
