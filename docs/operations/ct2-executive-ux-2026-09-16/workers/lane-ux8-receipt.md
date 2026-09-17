# LANE UX-8 — AI reuse path (receipt)

| Field | Value |
|---|---|
| LANE | UX-8 |
| BRANCH | `ct2/lane-ux8-ai` |
| WORKTREE | `/Users/carmen/projects/isalwa/.worktrees/ct2-lane-ux8-ai` |
| BASE_SHA | `1244d84ef75142d973c8f7aa44caeadd66361768` |
| COMMIT_SHA | `6a6db25183b16d92544682be0164afea17a134a6` |
| CAN_MUTATE | **NO** |
| REAL_SEVEN_MUTATED | **NO** |

## AI_* proof fields

| Field | Value |
|---|---|
| AI_PROVIDER_PATH | **REUSE** — `@isalwa/providers` `createAiProviderFromEnv()` + existing `AiController` assist flow (no greenfield SDK) |
| AI_GATEWAY | `apps/os-api/src/ai/ai-provider-gateway.ts` — env-only; `OPENAI_ISALWA_API_KEY` gate for `openai` / `openai-compatible` |
| AI_CAPABILITY_ROUTE | `GET /v1/ai/capability` — auth required; exposes `available`, `citationsLive`, `providerMode`, `blocked: PROVIDER_BLOCKED \| null` |
| AI_ASSIST_ROUTE | `POST /v1/ai/assist` — unchanged contract; `assertAiProviderGatewayReady()` → `AI_UNAVAILABLE` when blocked |
| AI_UI_HIDE_WHEN_BLOCKED | **YES** — `resolveAiHostedVisibility` + `AiAssistShell` omit assist blocks when disabled or `PROVIDER_BLOCKED` |
| AI_AUTH_NEGATIVES | **TESTED** — assist/capability return **401** without session; assist **503** when gateway blocked; mutation intents **403** |
| AI_HOSTED_CAPABILITY_HTTP | **UNPROVEN** — `GET https://os-api-staging.onrender.com/v1/ai/capability` → **404** at live base `1244d84` (route not deployed) |
| AI_HOSTED_ASSIST_HTTP | **PARTIAL** — unauthenticated `POST …/v1/ai/assist` → **400** on live `1244d84` (no secrets echoed) |
| AI_PROVIDER_BLOCKED_RESIDUAL | **YES** when `AI_ENABLED=true` + live provider without `OPENAI_ISALWA_API_KEY`; UI hidden, API `AI_UNAVAILABLE` / capability `blocked` |
| AI_LIVE_MODEL_CALL | **UNPROVEN** hosted — no key read or logged in receipt |

## Scope delivered

- Provider gateway + capability endpoint on existing OpenAI provider path.
- Server-side hosted visibility mirror for web (no API keys in client bundle).
- Assist surfaces on Cliente / Incidencia / Sistema status row; experience wrappers for reuse.
- Citations footnote respects mock vs live (`citationsLive`).

## Files

- `apps/os-api/src/ai.controller.ts`, `apps/os-api/src/ai.controller.test.ts`
- `apps/os-api/src/ai/ai-provider-gateway.ts`, `apps/os-api/src/ai/ai-provider-gateway.test.ts`
- `apps/os-web/components/ai/**`, `apps/os-web/lib/ai/actions.ts`
- `apps/os-web/app/(app)/clientes/[partyId]/page.tsx`, `incidencias/[issueId]/page.tsx`, `sistema/page.tsx`

## Tests (local)

```text
apps/os-api: ai.controller.test.ts + ai-provider-gateway.test.ts → 20 pass / 0 fail
apps/os-web: hosted-state.test.ts + lib/ai/limits.test.ts → 14 pass / 0 fail
apps/os-api + os-web: typecheck pass (after workspace deps + @isalwa/ui build)
```

## Proof matrix

| Capability | IMPLEMENTED | TESTED | HOSTED |
|---|---|---|---|
| Env provider gateway | YES | YES | N/A |
| GET /ai/capability | YES | YES | UNPROVEN |
| POST /ai/assist gateway gate | YES | YES | UNPROVEN |
| Hide assist UI when blocked | YES | YES (unit) | UNPROVEN |
| Live OpenAI call | YES (code path) | mock in unit | UNPROVEN |
