# OWNER DEMO COMPANY CONTEXT — MECHANISM

**Do not conflate:** auth actor ≠ effective company ≠ role preview.

## Evidenced facts

1. Session org comes from membership; multi-org uses `x-os-organization-id` (never invents authority).
2. Carmen Staging has **REAL-only** membership today (`01M2DV9F…`).
3. Demo densify data lives in **SYNTH** (`01M2JKF…`).
4. Current Demo toggle only **filters names** inside the current org → empty for Carmen.
5. QA “Ver como” swaps `actorMemberId` to a SYNTH fixture member — **impersonation**; **rejected** for owner Demo.

## Chosen mechanism (engineering, not new company policy)

| Mode | Effective company | Auth person | Actor member | Audit |
|---|---|---|---|---|
| Datos reales | REAL Staging S.R.L. | Carmen | Carmen REAL member | same |
| Demo | SYNTH | Carmen | Carmen **SYNTH** member (same person) | same person / SYNTH member |

Implementation:

1. Staging grant: ensure Carmen person has active SYNTH membership + **already listed** owner-evaluation business scopes (no new scope invention).
2. Demo toggle / cookie sets preferred company = SYNTH; Datos reales = REAL.
3. `getServerOsAuthContext` attaches `organizationId` → `x-os-organization-id` on every API call when multi-org.
4. Within SYNTH Demo, keep DEMO-prefixed list filter so non-demo SYNTH fixtures (e.g. Wave2 Cliente) stay out of Demo desks unless product already mixes them.
5. Visual banner remains `DEMO · DATOS FICTICIOS`.

## Fail-closed

- If SYNTH membership missing → Demo toggle must not pretend company switched; surface honest error / disable Demo.
- Never target REAL_SEVEN or protected REAL customer truth from Demo.
- Role preview never changes `organizationId`.
