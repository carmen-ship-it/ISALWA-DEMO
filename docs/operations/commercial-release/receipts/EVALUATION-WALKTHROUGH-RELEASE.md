# Receipt — Protected ISALWA evaluation walkthrough

Date: 2026-11-17  
Parent Recorrido: `072d2428e62bda65b178e4b365e93d0b86afe7c4`  
Branch: `ct3/v1-repairs`

## Product

Route `/evaluacion` — walkthrough-only evaluation. Reuses canonical Journey:

- `apps/os-web/lib/journey/story-steps.ts` (exact 20 steps — not duplicated)
- `apps/os-web/components/journey/owner-story-mode.tsx` (`presentation="evaluation-page"`)

Gate: **IMPLEMENTED LOCALLY / NOT HOSTED / NOT LIVE JOURNEY VERIFIED / NOT INVITE-READY**

## Access (server-side)

| Requirement | Mechanism |
| --- | --- |
| Runtime | `OS_RUNTIME_PROFILE=evaluation` |
| Walkthrough-only | default on for that profile (`OS_EVALUATION_WALKTHROUGH_ONLY=0` to opt out) |
| Auth | Supabase email/password via `/login` (no Entrar desarrollo, no `os_dev_session`) |
| Allowlist | server-only `ISALWA_EVALUATOR_EMAILS` (never `NEXT_PUBLIC_`) |
| Post-login | `/evaluacion` (skips os-api membership probe) |
| Ops desks | redirect to `/evaluacion?motivo=recorrido` |
| Denied | `/evaluacion/denegado` (neutral; no identity leak) |
| robots | `noindex, nofollow` on evaluation layout |

## Non-goals (unchanged)

Does not create/modify customers, quotes, orders, payments, conversations; does not send messages; does not call os-api from `/evaluacion`; does not grant operational scopes.

## Inputs still required from Carmen before invites

1. Isa’s exact email  
2. Álvaro’s exact email  

Then: configure Supabase Auth for the evaluation project, set `ISALWA_EVALUATOR_EMAILS`, invite via Supabase (not Architect).

## Independent review packet

`docs/operations/commercial-release/review-packets/REVIEW-PACKET-EVALUATION-WALKTHROUGH.md`

## Validation (pre-commit)

| Check | Result |
| --- | --- |
| Focused evaluation + Journey + middleware tests | pass |
| Full `apps/os-web` `npm test` | **1488/1488** |
| `npm run typecheck` | pass |
| `npm run build` | pass (`/evaluacion`, `/evaluacion/denegado` present) |
| `git diff --check` | pass |
| Browser (local `:3210`, synthetic unauth) | `/evaluacion` → `/login?next=/evaluacion`; `/clientes` → login; desktop + 390px |

Gate remains: **IMPLEMENTED LOCALLY / NOT HOSTED / NOT LIVE JOURNEY VERIFIED / NOT INVITE-READY**.
