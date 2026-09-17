# RC3 — View As Pedido / Quote narrowing (org.read leak)

**Date:** 2026-09-17  
**Scope:** Vista de evaluación vs RC3-A Pedido auth alignment  
**Deploy:** Not deployed (local gate only)

---

## Verdict

| Field | Value |
|---|---|
| **LEAK_CONFIRMED** | **yes** |
| **FIX_APPLIED** | **yes** (web Pedido detail gate; Quote detail already gated; Quote related-order list query narrowed) |
| **AUTH_CONTRACT_CHANGED?** | **no** — API still uses session Carmen + `canReadOwnedRecord`. View As remains a **web projection** over that truth. |

---

## 1. How EvaluationProjection / cookies narrow commercial **lists**

| Piece | Path | Behavior |
|---|---|---|
| Cookie | `ROLE_PREVIEW_PERSONA_COOKIE` (`persona-cookie.ts`) | Encodes persona; Asesor may append `::subjectMemberId` via `encodeEvaluationProjectionCookie` |
| Server read | `getEvaluationProjection()` (`evaluation-projection.ts`) | `{ active, persona, subjectMemberId, readOnly, commercialVisibility, presentationScopes }` — never elevates |
| List query | `commercialListQueryFromProjection(projection)` (`commercial-list-query.ts`) | Asesor → `{ visibility: 'org', ownerMemberId: subject }` (Carmen has org.read; filter is the slice). Missing subject → impossible owner id. Jefe → `visibility=team`. Gerencia → `visibility=org` |
| Consumers | `/cotizaciones`, `/oportunidades`, `/mapa`, `/inicio`, command palette | Spread `...commercialListQueryFromProjection(evaluation)` into `listQuotes` / `listOrders` / etc. |
| Post-filter | `filterByCommercialOwner` / `evaluationAllowsDesk` | Asesor owner slice; ops desks excluded via `EvaluationDeskExcluded` |

**Important:** List narrowing is **client/BFF query params**, not an API View As header. Session auth stays Carmen.

---

## 2. Pedido / Quote **detail** vs View As

| Surface | View As narrowing? | Mechanism |
|---|---|---|
| Quote detail `/clientes/.../cotizaciones/[quoteId]` | **Yes (pre-existing)** | After `getQuote`, `evaluationBlocksDirectParty(evaluation, quote.ownerMemberId)` → `AccessDeniedState` |
| Pedido detail `/clientes/.../pedidos/[orderId]` | **Was no → fixed** | Same helper on `order.ownerMemberId` |
| `GET /v1/orders/:id` (`CommercialQueryService.getOrder`) | **No View As awareness** | `canReadOwnedRecord` on **session** scopes (Carmen `commercial.org.read` → org-visible) |
| `GET /v1/quotes/:id` | Same as orders | Session org.read; View As only on web |

RC3-A correctly fixed owner-eval **without** View As: orders use leadership visibility like quotes. That made Carmen-without-View-As able to open Maderas. It also means **with** View As Asesor B, raw `getOrder` still succeeds for Maderas unless the **web** gate runs.

---

## 3. Direct URL leak (Asesor B → Maderas Pedido)

**Yes, confirmed before fix.**

1. Carmen session retains `commercial.org.read`.
2. Vista de evaluación Asesor B sets cookie subject ≠ Maderas `ownerMemberId` (`w2.asesor` / DEMO owner).
3. Lists hide Maderas via `ownerMemberId` filter.
4. Direct URL `/clientes/{maderasParty}/pedidos/{maderasOrder}` called `getOrder` → **200** under org.read → full Pedido UI (pre-fix).
5. Party 360 and Quote detail already blocked cross-owner via `evaluationBlocksDirectParty`; Pedido was the hole.

---

## 4. Existing narrowing patterns (canonical — extend, do not fork)

| Pattern | Use |
|---|---|
| `getEvaluationProjection()` | Server pages / loaders |
| `commercialListQueryFromProjection` | Commercial **list** API query params |
| `evaluationBlocksDirectParty` / `evaluationAllowsCommercialOwner` | **Detail** / party direct open after fetch |
| `filterByCommercialOwner` | In-memory list trim (auditoría, compromisos, command palette) |
| `evaluationAllowsDesk` + `EvaluationDeskExcluded` | Whole desk out of persona |
| `assertRolePreviewAllowsMutation` | Mutations while View As active |

**Not used (and not required for this fix):** API View As header, `system.admin`, Carmen-specific exceptions, hardcoded Pedido/party IDs.

View As is intentionally a **projection over Carmen’s real auth**, not impersonation. Narrowing belongs in os-web using evaluation helpers; API keeps tenant/session truth.

---

## 5. Recommended / applied fix

**Apply the Quote-detail pattern to Pedido detail** (and keep list paths on `commercialListQueryFromProjection`):

```ts
const evaluation = await getEvaluationProjection();
const { order } = await client.getOrder(orderId);
if (evaluationBlocksDirectParty(evaluation, order.ownerMemberId)) {
  return <AccessDeniedState />;
}
```

Also pass `...commercialListQueryFromProjection(evaluation)` into Quote detail’s related `listOrders` so nested lists do not re-widen to full org under Asesor View As.

**Do not:** special-case Carmen, Pedido IDs, or `people.admin`; do not roll back RC3-A org.read alignment for owner-eval (no View As).

### Residual (same class, out of this minimal patch)

| Surface | Status |
|---|---|
| Opportunity detail `/clientes/.../oportunidades/[opportunityId]` | Still missing `evaluationBlocksDirectParty` — same direct-URL class |
| Ops loaders that `getOrder` without projection (warehouse/postsale desks) | Desks already `evaluationAllowsDesk`-gated; residual if deep-linked |

---

## Files changed (this patch)

- `apps/os-web/app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx` — View As owner gate
- `apps/os-web/app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx` — related orders use `commercialListQueryFromProjection`
- `apps/os-web/lib/role-preview/role-preview.test.ts` — source contract: Pedido + Quote detail call `evaluationBlocksDirectParty`
- This evidence file

---

## Test results (local)

```text
pnpm exec tsx --test lib/role-preview/role-preview.test.ts
# (cwd: apps/os-web)
ℹ tests 13
ℹ pass 13
ℹ fail 0
```

Including new contract: `Pedido and Quote detail pages narrow View As via evaluationBlocksDirectParty`.

**Hosted / BV:** Not run. After deploy, View As Asesor B + direct Maderas Pedido URL must show AccessDenied; owner-eval **without** View As must still open Maderas (RC3-A preserved).
