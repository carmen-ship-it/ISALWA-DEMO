# Q-DEPLOY-01 — separate overnight preview package (sanitized)

Prepared / price-checked: 2026-11-25 · Builder only · **Independent review of `eb8c6428` still open**

## Review candidate (preserve)

| Field | Value |
| --- | --- |
| Commit | `eb8c6428793c11cef094ffd76888ea86da343241` |
| Tree | `a97ed01722d4e5f25c6e420c36d2208798ff108f` |
| Allowlisted export | Operator vault `overnight-preview-20261125/export/` (not GitHub) |

## Forbidden (evaluation untouched)

| Resource | Status |
| --- | --- |
| `isalwa-os-web-evaluation` | **UNTOUCHED** |
| Railway `isalwa-os-api-evaluation` | **UNTOUCHED** · Online · period usage ~$0.28 |
| Supabase `isalwa-os-evaluation-db` | **Do not reuse** (evaluation API points here) |
| AWS disposable overnight DB | Local only |

## Live price / access check (existing accounts)

### API — Railway (account logged in)

| Item | Value |
| --- | --- |
| Access | **Yes** — `railway init` / `railway add` available |
| Plan / limits | Soft limit **$5**/mo · hard limit unset · Hobby subscription **$5**/mo published (includes $5 usage credit) |
| Current period | Usage **~$0.28** · estimated bill **~$0.55** (evaluation only) |
| Create overnight API | **Yes** as a **new** project/service (not evaluation) |
| Expected overnight API+usage | About **$1–4**/mo incremental for a small always-on Nest service + workers |

### Dedicated DB

| Option | Cost | Limits | Access now |
| --- | --- | --- | --- |
| **Railway Postgres** in new overnight project | Metered (~$0.15/GB-mo volume + compute); fits under same $5 soft cap with API if kept small | Soft $5 workspace | **Yes** (`railway add -d postgres`) |
| Neon Free | **$0** · 100 CU-hrs · 1 GB · scale-to-zero ~5 min | Free quotas | **No** — Neon CLI not signed in |
| New Supabase Postgres | Free slots **full** (2/2 active) · else Pro **~$25**/mo | Pause after 1 week on Free | **No** without Pro / pausing |

### Auth — staging reuse (prepared)

| Item | Value |
| --- | --- |
| Project | `isalwa-os-auth-staging` ACTIVE_HEALTHY |
| Signup | `disable_signup=true` |
| `site_url` | Evaluation — **keep** |
| Redirects | Evaluation + localhost today; **append** new preview origin only after it exists |
| Synthetic seats | New overnight-only Auth users (Q-LOGIN-01); memberships only in overnight DB |
| New Auth project | **Not** available on Free (2/2); would need Pro **~$25**/mo |

**Prepared: reuse staging Auth.** Difference vs new Auth: $0 + shared JWT issuer vs ~$25/mo + separate issuer.

### Web — Vercel

New project on Hobby: **$0** · CLI can create · **do not** Git-link public repo · evaluation untouched.

## Expected monthly cost (overnight preview stack)

| Component | Expected |
| --- | --- |
| Vercel web | $0 |
| Auth (reuse) | $0 |
| Railway API + Postgres (new project) | Incremental usage; workspace stays under soft **$5** if sized like evaluation |
| Railway Hobby floor | **$5**/mo already on this workspace (covers $5 usage) |
| **All-in for this preview** | **~$5/mo** workspace bill if soft cap held; **no new $25 Supabase Pro** if Auth reused and DB is Railway Postgres |

## Deploy gate

Still waiting: independent verdict on `eb8c6428` + Carmen **yes** on the Railway soft-cap commitment below. Then create **new** Railway project + Vercel preview + Auth redirect append + synthetic hosted journey.

## Operator vault (not GitHub)

`~/.isalwa-secrets/overnight-preview-20261125/` — export, Auth reuse prep, cost receipt, Docker/railway recipe.
