# Evaluation full-app release checkpoints

Date: 2026-11-17  
Baseline SHA: `5e7131ccb0221a9db026a1bc009f1bd2aec95f17` (tree `ee02c37f…`)  
Branch at pin: `ct3/v1-repairs`

## Policy

- **Deployment baseline** = current commercial-release source on this SHA (including every improvement after the old Render deployment).
- **Do not** fall back to Render’s old commit, GitHub `main` `1f767fa1`, or the old Render web build.
- Render is **reference only** (suspended). Do not resume, delete, or deploy its old code in this lane.
- The walkthrough (`/evaluacion`) remains **inside** the actual app. It must not replace the application or be the only page Isa and Álvaro receive.
- After any real-app deployment, `ct3/v1-repairs` may continue local development but must **never** automatically update the Isa/Álvaro evaluation URL. Each later batch needs its own tested, reviewed, intentional promotion.

## Checkpoint 1 — Code

| Field | Value |
| --- | --- |
| Commit | `5e7131ccb0221a9db026a1bc009f1bd2aec95f17` |
| Local ref | `refs/evaluation-release/full-app-5e7131ccb0221a9db026a1bc009f1bd2aec95f17` |
| Local tag | `evaluation-full-app-5e7131cc` (not pushed) |
| Allowlisted archive | `isalwa-transfer-readiness/export/isalwa-source-5e7131cc-full-app.tar.gz` |
| Archive SHA-256 | `0c201c36a5af6b0c7904dd1e2cdbd6d1e1c613bab2c7d64c7de61e7d2bcbc623` |
| Card | `isalwa-transfer-readiness/evaluation-release-checkpoints/01-CODE-CHECKPOINT-5e7131cc.txt` |

## Checkpoint 2 — Runtime / data

Maps previous Render Auth/DB/runtime **names** into the isolated evaluation environment. No Render data copy. Schema via `prisma migrate deploy` (45) on empty evaluation databases only.

Card: `isalwa-transfer-readiness/evaluation-release-checkpoints/02-RUNTIME-DATA-CHECKPOINT-5e7131cc.txt`  
Supporting: `migration-list-5e7131cc.txt`, `render-env-names-inventory.txt` (names only).

| Layer | Render (reference) | Evaluation |
| --- | --- | --- |
| Auth | `isalwa-os-auth-staging` / `qbpxuywtoycjpitxoblo` | Same Auth project (not Architect) |
| Postgres | `isalwa-os-staging` (suspended; real import; inaccessible) | Isolated `isalwa-os-evaluation-db` / `eimvhirmaezssnevefly` + local disposable `isalwa_eval_real_app` — **45** migrations, **0** orgs |
| Web | Render `os-web-staging` (old repo) | Vercel `isalwa-os-web-evaluation` from full-app archive |
| API + workers | Render `os-api-staging` | Separate always-on Node host (**undecided**; not Vercel; not Render) |

## Checkpoint 3 — Release

Card: `isalwa-transfer-readiness/evaluation-release-checkpoints/03-RELEASE-CHECKPOINT-5e7131cc.txt`

| Field | Current |
| --- | --- |
| Status | **FROZEN_LIVE_REAL_APP_EVALUATION** (2026-11-17) |
| Web SHA / API SHA | `5e7131cc…` / same (Mac os-api + Cloudflare tunnel) |
| DB migration version | **45** on `eimvhirmaezssnevefly`; synthetic org `isalwa-eval-demo-v1` |
| Supabase Auth | `qbpxuywtoycjpitxoblo` |
| Eval Postgres | `eimvhirmaezssnevefly` |
| Vercel URL | `https://isalwa-os-web-evaluation.vercel.app` (real app; walkthrough-only **off**) |
| Hosted real-app verification | **PASS** (shared seat `isalwa.review@isalwa.test`) |
| Shared evaluation login | one authorized temporary seat; prior Isa/Álvaro seats **revoked** |
| Promotion | never auto from `ct3/v1-repairs`; named RC + tests + review + explicit promote + receipt |

Detail: `receipts/EVALUATION-FROZEN-CHECKPOINT-SHARED-LOGIN-2026-11-17.md` and card `03-RELEASE-CHECKPOINT-5e7131cc.txt`.
