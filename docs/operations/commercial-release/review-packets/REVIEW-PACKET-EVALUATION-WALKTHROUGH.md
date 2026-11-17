# Independent review packet — Protected evaluation walkthrough

## Scope

Add `/evaluacion` walkthrough-only release for Isa/Álvaro commercial Journey review **before** Nest API/DB/worker hosting. Reuses canonical Recorrido (`072d2428`); does not redesign the 20 steps.

## Boundaries

| In | Out |
| --- | --- |
| Evaluation chrome + walkthrough-only Journey presentation | Operational desks, os-api calls from evaluation |
| Supabase login + server allowlist | Entrar (desarrollo), demo/datos mode, Architect |
| Middleware redirects of ops routes | Fake data, fake WhatsApp/payments |
| noindex | Deploy, invites, push of `ct3/v1-repairs` history |

## Files to review

- `apps/os-web/lib/evaluation/*`
- `apps/os-web/app/evaluacion/**`
- `apps/os-web/components/journey/owner-story-mode.tsx` (presentation mode only)
- `apps/os-web/middleware.ts`
- `apps/os-web/lib/auth/actions.ts` (walkthrough sign-in branch)
- Tests + receipt under `docs/operations/commercial-release/`

## Verdict checklist for reviewer

- [ ] Canonical `STORY_MODE_STEPS` unchanged in substance (20 titles/statuses/decisions)
- [ ] Evaluation page never fetches customer/commercial API data
- [ ] Allowlist stays server-only
- [ ] Non-allowed users see neutral denial
- [ ] Ops routes cannot be used in walkthrough-only mode
- [ ] No secrets in commit

## Deploy readiness (not claimed)

Vercel project `isalwa-os-web-evaluation` may receive a **preview** later after this review; Nest API is **not** hosted on Vercel. Invites require Isa/Álvaro emails from Carmen.
