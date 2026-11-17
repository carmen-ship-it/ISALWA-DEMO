# Receipt — Frozen evaluation checkpoint + shared login

Date: 2026-11-17  
Branch: `ct3/v1-repairs`  
Frozen web/API source: `5e7131ccb0221a9db026a1bc009f1bd2aec95f17`

## Frozen live demo

| Field | Value |
| --- | --- |
| Vercel URL | https://isalwa-os-web-evaluation.vercel.app |
| Web SHA | `5e7131ccb0221a9db026a1bc009f1bd2aec95f17` |
| API SHA | same (`apps/os-api` on Carmen’s Mac via Cloudflare tunnel) |
| DB | `eimvhirmaezssnevefly` (synthetic evaluation only) |
| Migrations applied | **45** |
| Auth project | `isalwa-os-auth-staging` / `qbpxuywtoycjpitxoblo` (not Architect) |
| Tunnel health | `GET /v1/health` → `{ status: ok, service: os-api }` |
| Walkthrough-only | **off** (real app shell; Recorrido = in-app Journey) |
| Deployed to frozen URL? | **Yes** (this SHA). Later ct3 commits are **not** auto-promoted. |

## Shared evaluation login

- One temporary Supabase email/password user on the ISALWA Auth project.
- Mapped AuthIdentity → active OrganizationMember in `isalwa-eval-demo-v1`.
- Scopes: `commercial.customer.create`, `commercial.quote.convert.own`, `management.org.read`.
- `management.org.read` is required for in-app Recorrido (`canUseRolePreview`); **no** `people.admin`, `system.admin`, accounting, audit, master-data, or production scopes.
- Hosted browser checks: **PASS** (login, `/inicio`, `/clientes`, tenant stay, Recorrido open without org/cookie change, logout, direct `/clientes` gated, desktop + 390px).
- Access block for reviewers is issued out-of-band in the operator report (authorized shared credential only).

## Prior individual seats

- Temporary Isa/Álvaro evaluator Auth users: banned + deleted.
- Eval-org memberships: revoked; role assignments ended.
- Keychain items removed; sealed password files scrubbed.
- Value-free receipt (local secrets dir): `PRIOR-SEATS-REVOCATION-RECEIPT.txt` (no passwords).

## Promotion rule

Do **not** change the live Vercel deployment while `ct3/v1-repairs` advances. Named release candidate + tests + independent review (when required) + explicit promotion + receipt only.

## Next incomplete product work (source checkpoint)

Per `docs/operations/COMMERCIAL_RELEASE_CHECKPOINT.md` and Carmen order A→G: Stage-A follow-ups if any remain; then T04 quote lifecycle verification/gaps; Batch 4 catalog remains **BLOCKED** on approved PDF/price matrix. Do not invent catalog facts.
