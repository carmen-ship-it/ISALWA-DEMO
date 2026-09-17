# OA-2 — Commercial journey (post-approval continue) receipt

**Lane:** OA-2  
**Branch:** `ct3/oa2-commercial-journey`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-oa2-commercial-journey`  
**Base tip synced:** `origin/ct3/owner-demo-completeness` @ `7566a678b5bbc923a8bf8fa8235d775b6a343d78`  
**Implementation SHA (feature land):** `662b865ebf01e4debdb6d952c4fe2875c21bc26f` (integrator pull of OA-2..7)  
**RECEIPT_SHA:** _(this commit)_  
**INVENTED_BUSINESS_RULES:** **0**  
**Approval creates Pedido:** **NO**  
**REAL_SEVEN_MUTATED:** **NO**  
**Deployed / Hosted BV:** **UNPROVEN**

---

## Goal

Close the post-approval UX dead-end on `/aprobaciones/[id]` without inventing business rules: after Approve/Reject, surface **Ver cotización** and (only when evidenced) **Convertir a Pedido**. Approval must never auto-create a Pedido.

## Scope delivered

1. **Pure continue helper** — `postApprovalContinue` / `quoteConvertHref`:
   - pending → no continue cues
   - decided quote → Ver cotización
   - Convertir only when quote `submitted` **and** `authority.canConvertToOrder`
   - cancelled / ineligible → factual explanation; no Convertir
   - order subject → no convert path
2. **Approval detail page** — after decision, shows decision label + continue links (`data-tour="post-approval-continue"`); loads quote status/authority via `resolvePostApprovalContinue` (separate `getQuote`, no invented eligibility).
3. **`decideCommercialApprovalAction`** — on success for quote subject, returns `redirectTo: quoteHref(...)` so the page is not refresh-only. Comment/code path has **no** CreateOrder / insertOrder / order.created.
4. **Approval forms** — `commercial-approval-panel` honors `result.redirectTo` via `router.push`.
5. **Command result type** — optional `redirectTo` on ok commercial command results.

## Explicit non-goals (steering)

- Did **not** change auth org resolver / OwnerDemoProvider / conversation seed.
- Did **not** auto-accept quote or call CreateOrder from Approve/Reject.
- Did **not** invent discount thresholds or approval policies.
- Pedido list nav remains existing `/cotizaciones?status=accepted` alias; convert still lands on pedido via existing `createOrderAction` redirect.

## Files (owned / featured)

| Path | Role |
|---|---|
| `apps/os-web/lib/commercial/post-approval-continue.ts` | Continue cue model |
| `apps/os-web/lib/commercial/post-approval-continue.test.ts` | Unit + structural proof |
| `apps/os-web/lib/commercial/actions.ts` | quote `redirectTo` after decide |
| `apps/os-web/lib/commercial/command-types.ts` | `redirectTo?: string` |
| `apps/os-web/components/commercial/commercial-approval-panel.tsx` | honor redirect |
| `apps/os-web/app/(app)/aprobaciones/[approvalRequestId]/page.tsx` | continue CTAs |

## Tests

```bash
cd apps/os-web && pnpm exec tsx --test lib/commercial/post-approval-continue.test.ts
```

**Result:** **8/8 pass** (continue cues + structural no-CreateOrder + panel redirectTo).

## Proof states

| Subfeature | State |
|---|---|
| Approve/Reject ≠ Pedido | **TESTED** (structural) + evidenced domain (`APPROVAL_QUOTE_ORDER_RECONCILIATION.md`) |
| Ver cotización after decision | **IMPLEMENTED** |
| Convertir only if submitted + convert scope | **IMPLEMENTED** + **TESTED** |
| Cancelled quote explanation, no Convertir | **IMPLEMENTED** + **TESTED** |
| redirectTo quote after decide | **IMPLEMENTED** + **TESTED** |
| Hosted browser continue path | **UNPROVEN** |

## Residuals

1. Hosted BV of approve → Ver cotización → Convertir → Pedido (OA-7 closed-loop) — needs deploy + OA-1 Carmen SYNTH membership.
2. Orphan pending approval on cancelled REAL smoke Q-000015 remains a factual dead-end if opened; convert correctly withheld.

## Collision hygiene

- Safe to merge/receipt into integrator; feature already present on tip via `662b865`.
- No migration. No REAL_SEVEN touch. No invented assignees/SLAs.
