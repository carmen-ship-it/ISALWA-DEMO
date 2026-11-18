# Receipt — Railway Hobby API cutover (evaluation)

Date (UTC): 2026-11-17
Authority: Carmen authorized Hobby $5/mo soft alert only; Vercel web already on tip `904cf24a`; Mac/tunnel stop only after two public PASS checks.

## Source

| Field | Value |
|---|---|
| Approved tip | `904cf24a7acd40ad4278a229e9f9fc8fc5d9f781` |
| Allowlisted deploy root | `isalwa-transfer-readiness/deploy/904cf24a-evaluation` |
| Git history pushed | **no** |

## Railway

| Field | Value |
|---|---|
| Workspace plan | Hobby |
| Soft usage alert | **$5 / mo** |
| Hard cap | **none** (not set) |
| Project | `isalwa-os-api-evaluation` |
| Service | `isalwa-os-api-evaluation` |
| Public API | `https://isalwa-os-api-evaluation-production.up.railway.app/v1` |
| Health | HTTP 200 `{"status":"ok","service":"os-api","check":"liveness"}` |
| Workers | outbox + attention clock started; no DB reachability errors after pooler fix |
| Railway DB | **not** provisioned (uses existing Supabase evaluation DB) |

## Supabase connectivity fix

Direct host `db.eimvhirmaezssnevefly.supabase.co` is **IPv6-only**; Railway egress could not reach `:5432`.

| Field | Value |
|---|---|
| Eval DB project | `eimvhirmaezssnevefly` (sa-east-1) |
| Working pooler host | `aws-1-sa-east-1.pooler.supabase.com` (**not** `aws-0`) |
| Mode | session pooler **port 5432** (`sslmode=require`) |
| Username shape | `postgres.<project_ref>` |
| Secrets printed | **no** |

## Vercel web (API cutover)

| Field | Value |
|---|---|
| Project | `isalwa-os-web-evaluation` (`prj_ZTLDQycMoNpAq9hlOFlfg3mSbJz6`) |
| Production deployment | `dpl_E8wQPK77NNw3siDnyCXZVudfdL8S` |
| Public URL | https://isalwa-os-web-evaluation.vercel.app |
| `NEXT_PUBLIC_OS_API_URL` host | `isalwa-os-api-evaluation-production.up.railway.app` path `/v1` |
| Tunnel host in production env | **no** |

## Public verification

| Check | Result | Artifact |
|---|---|---|
| #1 (tunnel still up; API already Railway) | **PASS** | `~/.isalwa-secrets/evaluation-real-app-2026-11-17/hosted-railway-cutover-verify-1.json` |
| Stop cloudflared + Mac `:4001` | done (tunnel health 530; no local listener) | — |
| #2 (Mac stopped) | **PASS** | `~/.isalwa-secrets/evaluation-real-app-2026-11-17/hosted-railway-cutover-verify-2.json` |

Shared seat used for browser proof: `isalwa.review@isalwa.test` (password not recorded here).

Observed after Mac stop: login → `/inicio` populated with EVALUACIÓN fixture; `/clientes` four contexts; `/cotizaciones` Emitida present.

## Mac / tunnel

| Field | Value |
|---|---|
| Mac API required for hosted evaluation | **no** |
| cloudflared quick tunnel | **stopped** |
| Local `127.0.0.1:4001` | **stopped** |

## Label

TEMPORARY HOSTED EVALUATION — Railway Hobby API + Vercel web — **NOT DURABLE / NOT LAUNCH READY**
