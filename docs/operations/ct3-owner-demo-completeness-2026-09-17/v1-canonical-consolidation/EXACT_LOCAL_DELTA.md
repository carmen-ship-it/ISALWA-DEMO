# Exact local delta (pre-integration-commit inventory)

**HEAD_SHA (committed tip):** `5032e6c017de10514212487662f25191bc6ac0dd`  
**REMOTE_BRANCH_SHA:** `5032e6c017de10514212487662f25191bc6ac0dd`  
**LIVE WEB/API:** `8e24b7f` ≠ HEAD

## Dirty files

| FILE | WHY_DIRTY | OWNER_LANE | INTENDED_COMMIT | COLLISION_RISK |
|---|---|---|---|---|
| `packages/os-contracts/src/scopes.ts` | add convert.own to authority keys | CR-3 | view-as+convert integration | LOW — scopes shared; single writer |
| `packages/os-contracts/src/operations-scopes.ts` | re-export convert.own from scopes | CR-3 | same | LOW |
| `packages/os-contracts/src/commercial-authority.ts` | V1 convert; coverage ignored | CR-3 | same | MED — CreateOrder consumers |
| `packages/os-contracts/src/commercial-authority.test.ts` | V1 convert tests | CR-3 | same | LOW |
| `packages/os-commercial/src/commercial-authority.test.ts` | coverage≠convert CreateOrder | CR-3 | same | LOW |
| `packages/os-database/src/staging-carmen-synth-demo-scopes.ts` | full V1 business-eval comments/scopes | CR-1 | same | LOW |
| `apps/os-web/lib/role-preview/mutation-gate.ts` | NEW cookie gate | CR-2 | same | MED — shell+actions |
| `apps/os-web/lib/role-preview/evaluation-projection.ts` | NEW projection | CR-2 | same | MED |
| `apps/os-web/lib/role-preview/commercial-list-query.ts` | NEW list filters | CR-2 | same | LOW |
| `apps/os-web/lib/role-preview/load-asesor-options.ts` | NEW Asesor picker data | CR-2 | same | LOW |
| `apps/os-web/lib/role-preview/role-preview.test.ts` | projection+gate tests | CR-2 | same | LOW |
| `apps/os-web/lib/commercial/actions.ts` | mutation gate on commercial cmds | CR-2 | same | MED |
| `apps/os-web/lib/work/actions.ts` | mutation gate on follow-ups | CR-2 | same | LOW |
| `apps/os-web/lib/shell/load-shell-context.ts` | load asesorOptions | CR-2 | same | MED — shell |
| `apps/os-web/components/shell/app-shell.tsx` | pass asesorOptions | CR-2 | same | MED |
| `apps/os-web/components/shell/role-preview-*.tsx` | Asesor picker / banner copy | CR-2 | same | MED |
| `apps/os-web/app/(app)/layout.tsx` | wire asesorOptions | CR-2 | same | LOW |
| `apps/os-web/app/(app)/oportunidades/page.tsx` | list narrowing | CR-2 | same | LOW |
| `apps/os-web/app/(app)/cotizaciones/page.tsx` | list narrowing | CR-2 | same | LOW |
| `docs/.../RELEASE_TRAIN_STATE.md` | release-train freeze (consolidated) | evidence | same or docs commit | NONE |
| `docs/.../workers/CR7_*.md` | gap receipt | CR-7 | same | NONE |

**UNCOMMITTED_DIFF_SUMMARY:** View As EvaluationProjection (Asesor person-specific) + commercial list filters + mutation cookie gate + V1 convert.own wiring + release-train state ledger. **Not deployed.**
