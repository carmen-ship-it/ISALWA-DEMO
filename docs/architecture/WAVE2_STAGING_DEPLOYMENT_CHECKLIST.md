# Wave 2 — staging deployment checklist (`ef7eeab`)

**Exact SHA:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Branch:** `wave2/candidate-unified`  
**Integration pin:** `316426f272bce29924ffd4991da88ffe7d421bbd` (do not move)  
**Deploy this document alone:** **NO** until Carmen authorizes  
**Gate C:** **MIGRATED_AND_VERIFIED** (staging DB count **29**; remigrate **forbidden**)  
**Next pass doc:** `WAVE2_NEXT_STAGING_DEPLOY_PASS.md`

## Preflight

| Check | Expected | Status |
|---|---|---|
| Worktree HEAD = `ef7eeab…` | Exact match | Required at deploy |
| Clean worktree for app deploy | Clean (docs tip may differ) | Confirm at deploy |
| Branch | `wave2/candidate-unified` | PASS |
| Pushed to remote | Required before host deploy | Confirm at deploy |
| `pnpm install --frozen-lockfile` | PASS | Re-run at deploy |
| `pnpm -r build` | PASS | Re-run at deploy |
| Prisma validate | PASS | Re-run at deploy |
| Gate C migrate | `_prisma_migrations` = 29 | **PASS — operator verified** |
| Baseline drift | NONE | **PASS — operator verified** |
| Wave 2 empty post-migrate | 0 rows | **PASS — operator verified** |
| Purchase workflow migration | Applied with chain | **PASS on empty staging** |

## Environment / config (secret **names** only)

### os-api (`https://os-api-staging.onrender.com`)

| Name | Required | Notes |
|---|---|---|
| `OS_RUNTIME_PROFILE` | yes | `staging` |
| `OS_AUTH_MODE` | yes | `supabase` |
| `OS_DATABASE_URL` | yes | Render Postgres `isalwa_os_staging` — **not** Supabase Auth DB |
| `SUPABASE_URL` | yes | Auth project URL |
| `SUPABASE_ANON_KEY` | yes | server JWT verify |
| `SUPABASE_SERVICE_ROLE_KEY` | yes for invites | never browser |
| `OS_CORS_ORIGINS` | yes | exact `https://os-web-staging.onrender.com` (no `*`) |
| `PORT` | host | Render-provided |
| `OS_OUTBOX_WORKER` | recommended | co-hosted worker |

### os-web (`https://os-web-staging.onrender.com`)

| Name | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_OS_AUTH_MODE` | yes | `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | public |
| `NEXT_PUBLIC_OS_API_URL` | yes | `https://os-api-staging.onrender.com/v1` |

No secret values in `NEXT_PUBLIC_*`. Canonical session resolver remains server/os-api trusted path.

## Migration execution mechanism

- **Already executed** at `ef7eeab` on `isalwa_os_staging` (Carmen `/tmp/isalwa-gate-c-migrate`).  
- **Do not** run `migrate:deploy` again in the deploy pass unless a new pending migration appears.  
- Confirm count remains **29** before app deploy.

## Deploy process (when authorized)

1. Confirm Gate C = MIGRATED_AND_VERIFIED + `_prisma_migrations` still 29  
2. Confirm deploy candidate SHA = `ef7eeab` pushed  
3. Deploy os-api @ `ef7eeab`  
4. Deploy os-web @ `ef7eeab`  
5. Health + auth + tenant smoke (see next-pass doc)  
6. Synthetic fixtures (separate step) before role gauntlet  
7. Capture proof artifacts — do not advance USER-ACCEPTED here  

## Health / smoke

| Check | Pass criteria |
|---|---|
| API health | `GET /v1/health` 200 |
| Auth | trusted session resolves member+org |
| Tenant | synthetic org isolation |
| Seven customers | read-only counts unchanged |

## Rollback trigger

Any of: unexpected seven-customer / baseline drift; auth/session regression; health fail after deploy; Prisma/schema mismatch against migrated DB.

## Rollback procedure

1. Stop further migrate/deploy.  
2. Prefer Render PITR / snapshot restore to **new** DB instance; re-point `OS_DATABASE_URL` only after verification.  
3. Redeploy last known good application SHA if app deploy already happened.  
4. Do **not** hand-edit production rows to “undo” Prisma migrations.  
5. Re-run Gate C evidence SQL; record incident.

## Proof capture

- Gate C SQL outputs (redacted)  
- `_prisma_migrations` before/after  
- Deploy logs (no secrets)  
- Health/auth smoke notes  
- Journey readiness matrix update (HOSTED states only after real hosted proof)
