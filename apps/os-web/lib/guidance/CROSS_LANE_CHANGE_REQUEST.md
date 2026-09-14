# CROSS_LANE_CHANGE_REQUEST

Worker 7 — knowledge coach. Branch `parallel/knowledge-coach`.

## 1. Worker 5 — place reported-payment guidance

BLOCKER TYPE: CROSS_LANE_COLLISION

Requested owner: Worker 5 (`parallel/manual-ops-data-health`)

Files Worker 7 will not edit:

- `apps/os-web/lib/operations/reported-fact.ts`
- `apps/os-web/lib/operations/reported-fact.test.ts`
- `apps/os-web/lib/party/data-health.ts`
- `apps/os-web/app/(app)/mapa/page.tsx`

Place this fragment immediately before the reported-payment submit control:

```ts
import { reportedPaymentGuidance } from '@/lib/guidance/reported-payment';
```

Render each note with the existing `GuidanceNote` (`kind` is already `regla`).

Must remain visible before the person records a payment:

- A customer message is not a confirmed payment.
- Registrar un pago reportado no confirma el cobro.
- The report stays pending confirmation.

Do not add a Mapa link from this fragment. Knowledge does not own Mapa navigation.

Unblock requirement: Worker 5 imports `reportedPaymentGuidance` and renders it on the reported-payment form. No schema change is required for the copy.

## 2. StatusPill owner — Sugerencia tone

BLOCKER TYPE: CROSS_LANE_COLLISION

Requested owner: whoever owns `packages/ui` `StatusPill`. Worker 7 does not edit that primitive.

Consejo uses existing tone `neutral`. Regla uses existing tone `info`.

Sugerencia, if shown, uses existing tone `warning`. No catalog note uses Sugerencia: there is no governed suggestion that is neither a checklist nor a consequence.

If a dedicated Sugerencia tone is required, add it in `packages/ui` and tell Worker 7 the tone name. Do not treat `warning` as a new StatusPill tone.

Unblock requirement: none for this lane. The existing `warning` tone is enough until a dedicated tone is explicitly wanted.
