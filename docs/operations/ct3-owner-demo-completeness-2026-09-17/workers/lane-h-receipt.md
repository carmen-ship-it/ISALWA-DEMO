# LANE CT3-H — AI hosted reverify + conversation context adapter (receipt)

| Field | Value |
|---|---|
| LANE | CT3-H |
| BRANCH | `ct3/lane-h-ai` |
| WORKTREE | `/Users/carmen/projects/isalwa/.worktrees/ct3-lane-h-ai` |
| BASE_SHA | `4b85b115c3fe0cf009f605d65b043b5e2fb7c11b` |
| COMMIT_SHA | _(filled after commit)_ |
| CAN_MUTATE | **NO** (AI path is read-only assist) |
| REAL_SEVEN_MUTATED | **NO** |
| DEPLOYED_BY_LANE | **NO** |

## AI live status

| Field | Value |
|---|---|
| AI_LIVE_STATUS | **UNPROVEN** |
| AI_PROVIDER_PATH | **REUSE** — existing OpenAI/GPT path (`ai-provider-gateway` + `AiController` + `@isalwa/providers`) |
| AI_NEW_PROVIDER_ARCHITECTURE | **NO** |
| AI_HOSTED_REVERIFY | **PLANNED for CT3-I** (checklist A–H below) — this lane does not claim HOSTED PASS |
| AI_UI_HIDE_WHEN_BLOCKED | **YES** — `resolveAiHostedVisibility` + `AiAssistShell` omit controls when `DISABLED` / `PROVIDER_BLOCKED` |

## Scope delivered

1. **Conversation context adapter** — deterministic certainty buckets + deep links for client / pedido / conversation asks.
2. **Non-mutation guards** — expanded denied intents (WhatsApp send, stock, payment, delivery, access, create order, …) on API + web.
3. **Certainty UI** — Ask ISALWA panel renders LO CONFIRMADO / PENDIENTE DE CONFIRMAR / NO REGISTRADO / RECOMENDACIÓN / A QUIÉN PREGUNTAR / FUENTES when `certainty` is present.
4. **Future ingestion port** — provider-neutral types/comments only (no Meta/Twilio coupling).
5. **Tests** — certainty shaping, cross-tenant drop, non-mutation denials, ingestion type surface.

## Files

- `apps/os-api/src/ai/conversation-context-adapter.ts`
- `apps/os-api/src/ai/conversation-context-adapter.test.ts`
- `apps/os-api/src/ai/future-ingestion-adapter.ts`
- `apps/os-api/src/ai/future-ingestion-adapter.test.ts`
- `apps/os-api/src/ai/ai-features.ts`
- `apps/os-api/src/ai.controller.ts`
- `apps/os-api/src/ai.controller.test.ts`
- `packages/providers/src/ai/data-guard.ts`
- `apps/os-web/lib/ai/types.ts`
- `apps/os-web/lib/ai/limits.ts`
- `apps/os-web/lib/ai/limits.test.ts`
- `apps/os-web/components/ai/hosted-state.ts`
- `apps/os-web/components/ai/ai-assist-panel.tsx`
- `apps/os-web/components/ai/ai-certainty-answer-view.tsx`
- `apps/os-web/components/ai/index.ts`
- `docs/operations/ct3-owner-demo-completeness-2026-09-17/workers/lane-h-receipt.md`

## Tests (local)

```text
apps/os-api:
  conversation-context-adapter.test.ts → pass
  future-ingestion-adapter.test.ts → pass
  ai-provider-gateway.test.ts → pass
  ai.controller.test.ts → pass (requires workspace package builds)

apps/os-web:
  hosted-state.test.ts + lib/ai/limits.test.ts → pass
```

## Proof matrix

| Capability | IMPLEMENTED | TESTED | HOSTED |
|---|---|---|---|
| Certainty-shaped assist response | YES | YES | UNPROVEN |
| Deep-linked FUENTES | YES | YES (unit) | UNPROVEN |
| Cross-tenant fact drop | YES | YES | UNPROVEN |
| Mutation intents denied | YES | YES | UNPROVEN |
| Hide Ask when provider blocked | YES | YES (unit) | UNPROVEN |
| Live OpenAI model call | YES (existing path) | mock in unit | **UNPROVEN** |

---

## CT3 §101 hosted reverify checklist — PLANNED for CT3-I

Do **not** mark HOSTED PASS from this lane. CT3-I (or Control Tower) must run against the integrated hosted SHA.

| ID | Hosted test | Status for CT3-H | Owner |
|---|---|---|---|
| A | Ask about client | PLANNED | CT3-I |
| B | Ask about Pedido | PLANNED | CT3-I |
| C | Ask about synthetic conversation | PLANNED | CT3-I |
| D | Answer distinguishes Confirmed / Pending / Not recorded | PLANNED | CT3-I |
| E | Answer deep-links sources | PLANNED | CT3-I |
| F | Cross-tenant negative | PLANNED | CT3-I |
| G | Unauthorized record negative | PLANNED | CT3-I |
| H | Cannot mutate | PLANNED | CT3-I |

### CT3-I unblock notes

- Deploy integrated tip that includes this lane (CT3 integrator only).
- Confirm hosted `GET /v1/ai/capability` and gated `POST /v1/ai/assist` without exposing secrets.
- If provider remains blocked hosted, keep Ask controls hidden and retain **UNPROVEN** — do not block other CT3 lanes.
- Owner Story Mode may say “Asistencia inteligente en validación” but must not pretend live AI works until A–H PASS.

## Residuals

- Hosted A–H reverify → CT3-I.
- Canonical “A QUIÉN PREGUNTAR” still returns the honest empty copy until a responsible-person projection is wired from shared ownership data (lane D owns certainty UI helpers; do not invent from Cargo).
- Conversation message fan-in to assist packets awaits lane C conversation surfaces / seeds (E) — adapter accepts authorized facts when present; no CRUD UI in this lane.
- Live model call remains **UNPROVEN** on hosted staging.
