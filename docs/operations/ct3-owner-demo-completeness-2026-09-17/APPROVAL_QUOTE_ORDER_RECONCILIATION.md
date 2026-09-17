# APPROVAL_QUOTE_ORDER_RECONCILIATION

**Forensic · read-only · 2026-09-17**  
**DB:** staging via `~/.isalwa-secrets/isalwa-os-staging.external-database-url` (secrets not printed)

---

## DOES APPROVING CREATE PEDIDO = **NO**

Approval (`WorkCommandService` `Approve` / `decideApproval`) updates `os_approval_requests` and emits `approval.approved` / `approval.rejected`. It does **not** call `CreateOrder`, insert orders, or change quote status to accepted.

Pedido creation is a **separate** commercial command: `CreateOrder` in `CommercialCommandService`, gated by `canConvertQuoteToOrder`, requiring quote status `submitted`.

### Code citations

Approve path — decide only (no order mutation):

```468:518:packages/os-work/src/work-command-service.ts
  private async decideApproval(
    // ...
    const decided = await store.decidePendingApprovalRequest(/* status: approved|rejected */);
    const eventType = decision === 'approved' ? 'approval.approved' : 'approval.rejected';
    return this.emit(/* approval_request aggregate — not order */);
  }
```

Structural test:

```213:218:packages/os-work/src/commercial-approval.test.ts
  it('does not call CreateOrder from the approval decision path', () => {
    // assert.doesNotMatch(decideApproval slice, /CreateOrder|insertOrder|order\.created/);
  });
```

Convert creates pedido:

```978:1072:packages/os-commercial/src/commercial-command-service.ts
  private async createOrder(/* ... */) {
    if (quote.status !== 'submitted') throw new Error('VALIDATION_FAILED');
    // ... canConvertQuoteToOrder ...
    await store.insertOrder(order);
    await store.updateQuote(/* status: 'accepted' */);
    return this.emit(/* order.created */);
  }
```

UI / actions:

```64:68:apps/os-web/app/(app)/aprobaciones/[approvalRequestId]/page.tsx
        <PageHeader
          // ...
          description="La decisión no crea un pedido."
```

```435:463:apps/os-web/lib/commercial/actions.ts
export async function decideCommercialApprovalAction(/* ... */) {
  // executeWorkCommand(Approve|Reject) — revalidate only; no CreateOrder
}
```

```352:369:apps/os-web/lib/commercial/actions.ts
export async function createOrderAction(/* ... */) {
  // executeCommand('CreateOrder') → redirect orderHref(...?resultado=pedido)
}
```

```84:89:apps/os-web/lib/guidance/catalog.ts
export const APPROVE_DOES_NOT_CREATE_ORDER = guidanceNote({
  items: ['Aprobar registra la decisión. No crea un pedido.'],
});
```

---

## Q-000015 (any org) — DB fact

| Field | Value |
|---|---|
| quote_id | `01M2EQBSFYDN3FXND5DE793KSE` |
| quote_number | `Q-000015` |
| organization_id | `01M2DV9F0V5DXS4G89AKF4D5SR` (**REAL staging tenant**, not SYNTH) |
| party_id | `01M2EQAZ9SQA6AM0GYT3H9NH9X` |
| party display_name | `ZZV1SMOKEmu0jcmos-EDIT` (inactive) |
| opportunity_id | null |
| status | **cancelled** (cancelled_at `2026-09-14 03:46:53Z`, reason event: “Cierre de residuo sintético de staging”) |
| total | 100 centavos BOB |
| orders for quote | **0** |
| DEMO_OR_REAL | **REAL / smoke** — not DEMO-prefixed, not SYNTH owner-demo seed |

### Approvals on Q-000015

| approval_request_id | status | notes |
|---|---|---|
| `01M2EQBXD34ZNV8AQ09KC0Q45P` | **pending** (still) | approver `01M2DV9J827Q5QXH3KP5SVJKAN` |
| `01M2EQBY4Z6R2F77RXXWKRCSAY` | **rejected** | reason `synthetic reject` · decided `2026-09-14T01:09:09Z` |

### Event timeline (excerpt)

1. `party.created` → displayName `ZZV1SMOKEmu0jcmos`
2. `party.updated` → `ZZV1SMOKEmu0jcmos-EDIT`
3. `quote.created` / `quote.line_added` / `quote.submitted` (Q-000015)
4. `approval.requested` (×2)
5. `approval.rejected` (second request only)
6. `party.deactivated`
7. `quote.cancelled` — residual synthetic cleanup  
**No `order.created`.**

---

## ZZVISMOKE party check

| Query | Result |
|---|---|
| Exact `ZZVISMOKE` in `display_name` / `legal_name` | **0** |
| `ZZV1SMOKE%` parties | **8** on REAL org (inactive smoke pairs `…` / `…-EDIT`) |
| Q-000015 party | `ZZV1SMOKEmu0jcmos-EDIT` · sibling `ZZV1SMOKEmu0jcmos` both inactive |

**DEMO_OR_REAL for this party/quote path: REAL (smoke residue), not DEMO seed.**

---

## Approval semantics (code)

### Request

`WorkCommandService.requestApproval` validates subject (`quote` | `order` | …), requires commercial subject owner to request for quote/order, inserts `os_approval_requests` with `status: pending`, emits `approval.requested`. No order side effect.

### Decide

`decideApproval` → `decidePendingApprovalRequest` → emit `approval.approved` | `approval.rejected`.

Structural proof: `packages/os-work/src/commercial-approval.test.ts` asserts `decideApproval` body has no `CreateOrder|insertOrder|order.created`, and Approve path emits `approval.approved` with `order.created === false`.

### Web actions

`decideCommercialApprovalAction` → `executeWorkCommand('Approve'|'Reject', …)` then `revalidatePath` / `router.refresh()` — **no** `CreateOrder`, **no** redirect to pedido.

### Product copy

- Approval detail: “La decisión no crea un pedido.”
- Guidance `APPROVE_DOES_NOT_CREATE_ORDER`: “Aprobar registra la decisión. No crea un pedido.”
- Guidance `CONVERT_CREATES_ORDER`: “Convertir crea un pedido desde una cotización enviada…”

---

## Convert / pedido semantics (code)

`CommercialCommandService.createOrder`:

1. Requires quote `status === 'submitted'` (else `VALIDATION_FAILED`)
2. Authority via `canConvertQuoteToOrder` (owner, coverage, or `commercial.order.convert`)
3. Inserts order + lines; sets quote status to **`accepted`**
4. Emits `order.created`

Web: `createOrderAction` → redirect to `orderHref(... )?resultado=pedido`.

UI CTA: “Cliente aceptó · Convertir a Pedido” (`ConvertQuoteForm` / `quote-detail-actions`), only when `authority.canConvertToOrder`.

**Note:** Convert requires **submitted**, not “approved”. Approval status is orthogonal; pending approval only changes **next-step copy** (“Hay una aprobación pendiente. La decisión no crea un pedido.”) — it does not auto-create a pedido when approved.

---

## Post-approval UX CTAs (traced)

| Surface | After Approve/Reject |
|---|---|
| `/aprobaciones/[id]` | Success toast; buttons lock; **Volver** → `/aprobaciones` list; subject link to quote/order if resolvable |
| Quote page `#aprobacion` panel | `router.refresh()`; success: “No se creó un pedido…”; **Convert section is independent** (`#convertir-pedido`) |
| Next-step (`quoteNextStep`) | Pending approval → waiting copy; after approve with still-`submitted` quote → send/follow-up waiting — **not** auto convert |
| Convert CTA | Appears only if `canConvertToOrder` (submitted + authority); **not** unlocked solely by approval |

For **Q-000015** specifically: quote is **cancelled** → convert impossible; leftover **pending** approval is orphaned smoke residue. Approving it still would not create a pedido.

---

## Summary answers

| Question | Answer |
|---|---|
| DOES APPROVING CREATE PEDIDO | **NO** |
| Does Q-000015 have a pedido | **NO** |
| Is Q-000015 DEMO seed | **NO** — REAL org smoke |
| ZZVISMOKE exact | **absent**; ZZV1SMOKE\* smoke parties present |
| SYNTH DEMO quote approvals | **0** |
