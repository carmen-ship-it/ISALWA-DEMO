# OA-3 — Work / Attention + post-approval next-step receipt

**Lane:** OA-3  
**Branch:** `ct3/oa3-work-attention`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-oa3-work-attention`  
**Base tip synced:** `origin/ct3/owner-demo-completeness` @ `7ea9719404537c5704987138f638fb3398a9d980`  
**COMMIT_SHA:** `ef67e5d908b119922fb92c8f9f7ade0980a59fdf`  
**INVENTED_BUSINESS_RULES:** **0**  
**Assignees invented:** **NO**  
**SLAs invented:** **NO**  
**Aprobaciones page edited:** **NO** (OA-2 owns)

---

## Scope delivered

1. **Post-decision next-step (quote)** — `quoteNextStep` reads recorded `latestApprovalDecision` after pending clears:
   - **approved** → `APPROVAL_ATTENTION_RESOLVED_COPY` + commercial continuation (follow-up when available); **does not** invent Convertir
   - **rejected** → attention-resolved copy + Ver cliente; **does not** invent pedido
   - Convert remains only on **accepted** + `canConvertToOrder` (unchanged)
2. **Quote detail wiring** — `latestQuoteApprovalDecision(approvals)` from loaded rows (`decidedAt` only).
3. **Mi trabajo clarity** — Mío / Equipo / Empresa captions via `trabajoLensClarity` (visibility only; no reassignment).
4. **Work/Attention after decision** — existing derivation emits `pending_approval` **only while** status is pending (`packages/os-query/src/work/attention-derivation.ts`). No new assignee/SLA rules.

---

## Files

| Path | Change |
|---|---|
| `apps/os-web/lib/commercial/next-step.ts` | post-approval branches + `latestQuoteApprovalDecision` |
| `apps/os-web/lib/commercial/next-step.test.ts` | post-approval / rejection / latest-decision tests |
| `apps/os-web/app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx` | pass `latestApprovalDecision` |
| `apps/os-web/lib/work/trabajo-lens-clarity.ts` | Mío/Equipo/Empresa captions |
| `apps/os-web/lib/work/trabajo-lens-clarity.test.ts` | clarity + page wiring tests |
| `apps/os-web/app/(app)/trabajo/page.tsx` | surface clarity under tabs |

---

## Tests

```text
corepack pnpm --filter os-web exec node --import tsx --test \
  lib/commercial/next-step.test.ts \
  lib/work/trabajo-lens-clarity.test.ts
```

**Result:** 14/14 pass.

---

## Proof states

| Claim | State |
|---|---|
| Post-approval next-step copy | **IMPLEMENTED** + **TESTED** |
| Attention clears when decision recorded | **EVIDENCED** existing derivation (not reimplemented) |
| Mi trabajo Mío/Equipo/Empresa clarity | **IMPLEMENTED** + **TESTED** |
| Hosted owner BV | **UNPROVEN** (lane worker; integrator deploy) |
| Convert after approval alone | **NEGATIVE preserved** (no convert from approval decision) |
