# RC3 — POSTSALE_CONTRACT_LOCAL

**As of:** 2026-09-17  
**Scope:** Local proof that Approval ≠ Pedido, Nota ≠ Salida, and Pedido read works under RC3-A org.read auth.  
**Deploy:** Not deployed. Hosted post-sale loop **UNPROVEN** until Pedido auth is live on staging.

---

## Scoreboard

| Gate slice | Result | Evidence |
|---|---|---|
| **APPROVAL_NE_PEDIDO** | **PASS** | `commercial-approval.test.ts` + `post-approval-continue.test.ts` |
| **NOTA_NE_SALIDA** | **PASS** | `delivery-boundary.test.ts` + `delivery-progress.test.ts` + `pedido-lifecycle.test.ts` |
| **PEDIDO_READ_AFTER_AUTH_FIX** | **PASS** | `order-owner-eval-read.test.ts` A–C + leadership-visibility orders |

---

## Approval ≠ Pedido

| Requirement | Proof |
|---|---|
| Request approval does not create an order | `packages/os-work/src/commercial-approval.test.ts` — `lets the subject owner request approval and does not create an order` |
| Decision path never calls CreateOrder | Same — `does not call CreateOrder from the approval decision path` (source scan) |
| Approve/reject emit approval events only | `records rejection without rewriting the commercial subject` |
| Post-approval UX: continue to quote / convert is separate; order subject ≠ convert | `apps/os-web/lib/commercial/post-approval-continue.test.ts` — `never treats approval of an order subject as convert`; `withholds Convertir… no crea un pedido` |
| Action redirect prefers quoteHref, never CreateOrder | Same file — structural `decideCommercialApprovalAction` |

---

## Nota ≠ Salida

| Requirement | Proof |
|---|---|
| Salida recorded without creating a nota; PDF download does not create salida | `packages/os-delivery/src/delivery-boundary.test.ts` — `records salida without creating a nota; PDF download does not create salida` |
| Entrega does not auto-create nota | `records entrega without auto-creating a nota…` |
| Progress strip: Nota done does not infer Salida/Entrega | `apps/os-web/lib/delivery/delivery-progress.test.ts` — `never infers Salida or Entrega from Nota alone` |
| Pedido lifecycle: Nota ≠ Preparación ≠ Salida | `apps/os-web/lib/operations/pedido-lifecycle.test.ts` — `does not treat Nota as Preparación or Salida` |

---

## Pedido read after auth fix (RC3-A)

Auth contract: `getOrder` / `listOrders` use `canReadOwnedRecord` / `resolveOwnerReadScope` (same as quotes), not people.admin-or-owner. See `RC3_PEDIDO_AUTH_TRACE.md` (pre-fix) and `RC2_TO_RC3_DEFECT_DELTA.md`.

| Requirement | Proof |
|---|---|
| `commercial.org.read` owner-eval may read seeded Maderas Pedido (not owner, not people.admin) | `order-owner-eval-read.test.ts` **A** |
| Team visibility = direct reports; org visibility = tenant | **B/C** |
| Party list `visibility=org` returns Pedido; default own lens empty for non-owner | **G** (also Cliente360 graph) |
| Leadership suite: org read sees tenant orders | `packages/os-query/src/leadership/leadership-visibility.test.ts` — org orders assertion |

---

## Commands run (local)

```bash
cd packages/os-work && node --import tsx --test src/commercial-approval.test.ts
# → 8 pass / 0 fail

cd packages/os-delivery && node --import tsx --test src/delivery-boundary.test.ts
# → 14 pass / 0 fail

cd packages/os-query && node --import tsx --test \
  src/commercial/order-owner-eval-read.test.ts \
  src/leadership/leadership-visibility.test.ts
# → 16 pass / 0 fail

cd apps/os-web && node --import tsx --test \
  lib/commercial/post-approval-continue.test.ts \
  lib/delivery/delivery-progress.test.ts \
  lib/operations/pedido-lifecycle.test.ts
# → PASS
```

---

## Explicit non-claims

| Claim | Status |
|---|---|
| Hosted FULL_POST_SALE_LOOP (Nota→Salida→Entrega on Maderas) | **UNPROVEN** — blocked on hosted Pedido auth until deploy |
| Approval hosted click BV | **UNPROVEN** here |

---

## Verdict

**POSTSALE_CONTRACT_LOCAL = PASS.** Local contracts hold: Approval never creates Pedido; Nota and Salida remain distinct facts; Pedido org.read reads are covered by RC3-A unit tests.
