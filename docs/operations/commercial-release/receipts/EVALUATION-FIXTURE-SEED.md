# Receipt — Evaluation fixture seed (EVALUACIÓN)

Org slug `isalwa-eval-demo-v1` · database host marker `eimvhirmaezssnevefly`. Counts only: no ids, passwords, URLs or keys.

Tool: `packages/os-database/src/evaluation-fixture/seed.ts` (`pnpm --filter @isalwa/os-database run fixture:evaluation`, needs `EVALUATION_FIXTURE_CONFIRM=1`). Same command services as owner-demo; it does not restore the old demo mode or fake company ids. All rows are labelled EVALUACIÓN. No catalog products or real prices are invented: every quote line is a free-text example with a symbolic price (BOB 1.00 per unit, "no es precio de catálogo"). The map data is latitude/longitude only; nothing here claims Mapbox works.

## T04 quote path (one quote per state)

draft → `RequestApproval` (shared reviewer, quote owner) → `Approve` (separate Jefatura — Evaluación member) → `SubmitQuote` → `RecordQuoteCustomerAcceptance` → `CreateOrder`. The shared reviewer never holds `commercial.price.approve` and never decides an approval (`approvalsDecidedByReviewer` = 0).

## Totals per run (EVALUACIÓN-labelled rows)

| Entity | Run 1 | Run 2 | Run 3 |
|---|---:|---:|---:|
| parties | 4 | 4 | 4 |
| partiesInOrgTotal | 5 | 5 | 5 |
| contacts | 4 | 4 | 4 |
| locations | 8 | 8 | 8 |
| locationsWithCoordinates | 4 | 4 | 4 |
| opportunities | 4 | 4 | 4 |
| quotes | 4 | 4 | 4 |
| quoteLines | 4 | 4 | 4 |
| orders | 1 | 1 | 1 |
| approvalsDecidedByReviewer | 0 | 0 | 0 |
| coverageGrantsActive | 1 | 1 | 1 |
| conversations | 4 | 4 | 4 |
| commitments | 2 | 2 | 2 |
| paymentReports | 1 | 1 | 1 |
| paymentTenders | 1 | 1 | 1 |

## Created vs reused per run

| Run | Created (sum) | Reused (sum) |
|---|---:|---:|
| 1 | 1 | 56 |
| 2 | 0 | 56 |
| 3 | 0 | 56 |

### Quotes by status / approvals by status (latest run)

- quotes: `{"accepted":1,"draft":2,"submitted":1}`
- quote approvals: `{"approved":2,"pending":1}`

### Member scopes (latest run)

- Shared reviewer (`isalwa.review@isalwa.test`): `["commercial.customer.create","commercial.customer.edit","commercial.quote.convert.own","commercial.team.read","commercial.work.manage","management.org.read","payments.report"]`
- Jefatura Comercial — Evaluación: `["commercial.account.reassign","commercial.assignment.org","commercial.org.read","commercial.price.approve","commercial.team.read"]`
- Asesor Cobertura — Evaluación: `["commercial.customer.edit","commercial.quote.convert.own"]`

## Blockers / notes

- None in the latest run.
- Initial seeding ran twice at the same moment (two overlapping invocations), which left one duplicate commitment. Run 1 above is the repair run: it cancelled the twin through `CancelCommitment` (the "1 created"). The seed now takes a per-machine lock so this cannot recur. Earlier raw runs are kept outside the repo.

- Payments: one `payment` report (pending tender, transfer) is written with the same rows `RecordPaymentReport` writes (that command is an HTTP controller in os-api, not a service). It is not verified: the fixture never holds `payments.confirm`.
- Conversations carry the exact phrase "Evaluación — conversación de ejemplo, sin conexión a Meta/WhatsApp"; no provider is connected.

## Promote-hygiene follow-up (stale Enviada assertion)

Independent review passed the evaluation fixture with follow-ups. The only promote blocker was a stale unit expectation that still matched “Enviada” after product wording correctly used issuance (“Emitida”), not delivery/send.

| Field | Value |
|---|---|
| Failing stale assertion | `assert.match(result.stateExplanation ?? '', /Enviada/);` in `apps/os-web/lib/commercial/post-approval-continue.test.ts` (case: withholds Crear pedido when submitted but actor lacks convert scope) |
| Corrected assertion | `assert.match(result.stateExplanation ?? '', /Emitida/);` — matches `formatQuoteStatus('submitted')` → `Emitida` → explanation `Cotización Emitida. La aprobación no crea un pedido.` |
| Application behavior | unchanged (labels/services/seed/scopes/deploy untouched) |

### Commands run

```text
cd apps/os-web && pnpm exec tsx --test \
  lib/commercial/post-approval-continue.test.ts \
  lib/commercial/status-semantics.test.ts \
  lib/commercial/ui-4.test.ts \
  lib/commercial/commercial-ui-hardening.test.ts \
  lib/commercial/labels-status-tone.test.ts \
  lib/work/aging/aging.test.ts
# → 66 pass / 0 fail

git diff --check
# → clean (exit 0)
```

### Follow-up commit

- Base candidate: `c81626016a781129ef323186ac315757e265edf9`
- Commit SHA: `36c3dde1ffcf780bf7b9035e1bf6ff4a2994e53e`
- Tree SHA: `e60c32b07a765c2277064a1264f8a19ed0ff44e3`
- Changed files: `apps/os-web/lib/commercial/post-approval-continue.test.ts`, `docs/operations/commercial-release/receipts/EVALUATION-FIXTURE-SEED.md`
