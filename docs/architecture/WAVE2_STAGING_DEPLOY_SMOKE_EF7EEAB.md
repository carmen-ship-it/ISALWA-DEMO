# Wave 2 — staging deploy smoke (`ef7eeab`)

**Date:** 2026-09-14  
**Candidate:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Result:** **DEPLOYED_AND_SMOKE_VERIFIED**  
**Fixtures:** **NO** · **Pin:** `316426f…` unchanged · **SAFE FOR ISA / ÁLVARO:** **NO**

## Pre-conditions proven

| Check | Result |
|---|---|
| Pre-Deploy Command (os-api-staging) | blank (`''`) |
| Auto-Deploy (os-api-staging) | **OFF** (`no`) |
| Auto-Deploy (os-web-staging) | still **ON** (note for Carmen) |
| Incidental `1f767fa` API deploy | live finished `2026-09-14T21:41:43Z` (`service_updated`) — **not** Wave 2 acceptance |
| Migrate during incidental deploy | no `migrate:deploy` / apply strings in recent logs; build only ran `prisma generate` |

## Deploys

| Service | Deploy id | Commit | Status |
|---|---|---|---|
| os-api-staging | `dep-dak6lee1egvs739ajvig` | `ef7eeabdea5f8f4449ba706caa1a323435d96fcc` | live |
| os-web-staging | `dep-dak6n49594qs738j6ncg` | `ef7eeabdea5f8f4449ba706caa1a323435d96fcc` | live |

Mechanism: `render deploys create <svc> --commit ef7eeab… --wait --confirm`

## API smoke

- `/v1/health` 200 · `/v1/health/ready` 200 · database check ok · authMode supabase · `devBootstrapEnabled=false`
- `scripts/verify-staging-hosted-tenant-isolation.mjs` — **17/17 PASS**
- Seven customers by prior party ids — **7/7 present**, search counts 1 each, **no mutations**

## Web smoke

- `/` and `/login` HTTP 200, HTML + Next runtime present, title `ISALWA OS`
- No Application error / Internal Server Error / Prisma markers in HTML

## Migrations

- Not rerun by this pass  
- Agent IP still cannot query `_prisma_migrations` directly  
- Evidence of no migrate command on deploy path + ready DB → count remains **29** per Gate C operator state

## Proof states

| State | Status |
|---|---|
| MIGRATED | YES |
| DEPLOYED | YES (`ef7eeab` API+web) |
| HOSTED | YES (services live; smoke only) |
| BROWSER-VERIFIED | **NO** (Acceptance Gauntlet not run) |
| USER-ACCEPTED | **NO** |

## Next pass

Synthetic role fixtures → role homes → hosted Acceptance Gauntlet.  
Recommend turning **os-web-staging Auto-Deploy OFF** to match API.
