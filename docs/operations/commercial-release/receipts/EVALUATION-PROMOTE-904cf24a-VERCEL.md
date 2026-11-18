# Receipt — Promote reviewed evaluation RC to Vercel

Date (UTC): 2026-11-17
Authority: independent verifier PASS; named RC approved for promotion.

## Source

| Field | Value |
|---|---|
| Branch | `ct3/v1-repairs` (not pushed) |
| Approved tip | `904cf24a7acd40ad4278a229e9f9fc8fc5d9f781` |
| Tree | `8befbec21f33da631b24d239cf0a74de7038e8ca` |
| Included fixture commit | `c81626016a781129ef323186ac315757e265edf9` |
| Hygiene verification | `edde41f82855a9ef56626a79481f00a787d9ed61` |
| Allowlisted deploy root | `isalwa-transfer-readiness/deploy/904cf24a-evaluation` |
| Manifest | `isalwa-transfer-readiness/export/EVALUATION-PROMOTE-MANIFEST-904cf24a.txt` |
| Git history pushed | **no** |

## Destination

| Field | Value |
|---|---|
| Vercel account | `carmen-ship-it` |
| Team | `carmen-ship-its-projects` |
| Project | `isalwa-os-web-evaluation` (`prj_ZTLDQycMoNpAq9hlOFlfg3mSbJz6`) |
| Public URL | https://isalwa-os-web-evaluation.vercel.app |
| Deployment ID | `dpl_F5FMy6okSmqNjP3aYCLh7wQDug74` |
| Deployment URL | https://isalwa-os-web-evaluation-g6mshm2iy-carmen-ship-its-projects.vercel.app |
| Inspect | https://vercel.com/carmen-ship-its-projects/isalwa-os-web-evaluation/F5FMy6okSmqNjP3aYCLh7wQDug74 |
| Target | production |
| Ready state | READY |

## Preflight (before deploy)

| Check | Result |
|---|---|
| HEAD == `904cf24a…` | yes |
| Unrelated staged changes | none (only pre-existing untracked dirt left untouched) |
| `OS_EVALUATION_WALKTHROUGH_ONLY` | production secret present; live probe post-login `/inicio` + `/clientes` (**not** forced `/evaluacion`) → walkthrough-only **off** |
| `NEXT_PUBLIC_OS_API_URL` | production config present; host matches current healthy tunnel; ends with `/v1`; configured API `/health` HTTP 200 |
| Mac API `127.0.0.1:4001/v1/health` | 200 ok |
| Tunnel `/v1/health` | 200 ok |
| Secrets printed | **no** |
| Env values changed | **no** |

## Build / deploy

| Step | Result |
|---|---|
| Local `pnpm --filter @isalwa/os-web build` from allowlisted export | pass (routes include `/inicio`, `/clientes`, `/cotizaciones`, `/mapa`, `/evaluacion`, …) |
| `vercel deploy --prod --yes --scope carmen-ship-its-projects` from allowlisted root | pass |
| Second Vercel project | not created |
| Railway / Supabase data / seed / roles | not touched |

## Hosting label

**TEMPORARY HOSTED EVALUATION — NOT DURABLE / NOT LAUNCH READY**

Public web still depends on Carmen’s Mac `os-api` + Cloudflare tunnel. Mac must remain awake for the live evaluation.

## Hosted verification

Companion JSON (no passwords): `~/.isalwa-secrets/evaluation-real-app-2026-11-17/hosted-promote-904cf24a-verify.json`
Shared evaluator used; password not recorded.

| Check | Result |
|---|---|
| Estado | **PASS** |
| Sign-in → not walkthrough-only | pass (`/inicio`) |
| Inicio populated | pass |
| Clientes — four EVALUACIÓN contexts (Showroom / Más de 10 / Calidad Segunda / Viajes·Trópico) | pass |
| Conversaciones — manual “sin conexión a Meta/WhatsApp” | pass |
| Cotizaciones — **Emitida** wording | pass (desktop + 390px) |
| Pedidos / Compromisos | pass |
| Productos — no invented catalog price/SKU | pass |
| Mapa — honest (no Mapbox/provider claim / invented pins) | pass |
| Recorrido opens | pass |
| Logout; logged-out `/clientes` gated | pass |
| Required API failures | **0** |
| Console | 1 benign `Failed to load resource: 404` (not a `/v1` API failure; not reproduced on a follow-up sample of key routes) |

## Explicit non-scope

- Railway not started
- Supabase data / seed / roles / credentials unchanged
- `ct3/v1-repairs` history not pushed
- Mac API + tunnel left running (required for this temporary evaluation)
