# Wave 2 — staging deployment checklist (`ef7eeab`)

**Exact SHA:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Branch:** `wave2/candidate-unified`  
**Integration pin:** `316426f272bce29924ffd4991da88ffe7d421bbd` (do not move)  
**Deploy this document alone:** **NO**

## Preflight

| Check | Expected | Status this pass |
|---|---|---|
| Worktree HEAD = `ef7eeab…` | Exact match | PASS (local) |
| Clean worktree (or docs-only prep commits disclosed) | Clean for deploy | Prep docs may follow |
| Branch | `wave2/candidate-unified` | PASS |
| Pushed to remote | Required before host deploy | **UNKNOWN / not this pass** |
| `pnpm install --frozen-lockfile` | PASS | Proven on prior pass; re-run at deploy |
| `pnpm -r build` | PASS | Proven on prior pass; re-run at deploy |
| Prisma validate | PASS | Proven on prior pass |
| Gate C evidence SQL executed | Live results | **BLOCKED** |
| Migration inventory reviewed | SQL-classified | PASS (repo) |
| Purchase REWRITE excluded | HOLD | PASS (policy) |
| Prisma deploy vs `#14` hold strategy | Explicit | **OPEN — see apply plan Phase 2** |

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

- Command: `pnpm --filter @isalwa/os-database migrate:deploy`
- Requires `OS_DATABASE_URL`
- Applies pending migrations in timestamp order
- **Blocked interaction:** `#14` purchase REWRITE — see apply plan

## Deploy process (when authorized)

1. Confirm Gate C PASS + apply window approved  
2. Baseline SQL capture  
3. Controlled migrate (additive window only)  
4. Post-migrate SQL capture  
5. Deploy os-api @ `ef7eeab`  
6. Deploy os-web @ `ef7eeab`  
7. Health + auth smoke  
8. Capture proof artifacts  

## Health / smoke

| Check | Pass criteria |
|---|---|
| API health | `GET /v1/health` 200 |
| Auth | trusted session resolves member+org |
| Tenant | synthetic org isolation |
| Seven customers | read-only counts unchanged |

## Rollback trigger

Any of: migrate failure; unexpected count drift on seven customers; purchase statuses remapped without approval; auth/session regression; health fail after deploy.

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
