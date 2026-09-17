# RC3 — Pedido AccessDenied auth trace (READ ONLY)

**Date:** 2026-09-17  
**Branch context:** ct3/owner-demo-completeness  
**Defect (hosted, PRODUCT):** Carmen Owner Evaluation (SYNTH / demo, **no View As**) gets `AccessDenied` / API `forbidden` on seeded Pedido:

| Field | Value |
|---|---|
| Party | `01M2PM95PV7YP6AECYXSX4GRBW` (`DEMO MADERAS ORIENTE`) |
| Order | `01M2PMA280KX4AAV7049YKNE07` |
| Page | `/clientes/{partyId}/pedidos/{orderId}` |
| Downstream symptom | Cliente360 Resumen **Pedidos=0** |

**Status of this doc:** TRACE ONLY — no fix implemented. Does not modify RC2 evidence.

**Related RC2 signal:** `FINAL_RC2_RECEIPT.md` already recorded `FULL_POST_SALE_LOOP_HOSTED FAIL` and `CLIENTE360_GRAPH_COHERENT PARTIAL` for this exact order id.

---

## 1) Exact request path (detail page → auth decision)

### 1.1 Web page

`apps/os-web/app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx`

1. `getServerOsAuthContext()` (L64)  
2. `createOsApiClient(auth)` (L67)  
3. **`client.getOrder(orderId)`** (L70) — primary gate  
4. On `OsApiError.kind === 'forbidden'` → render `<AccessDeniedState />` (L580–585)

This page does **not** call `getEvaluationProjection()`. View As / evaluation cookies never participate in the detail-page decision. The failure is pure API authorization.

### 1.2 os-web API client

`apps/os-web/lib/api/os-api-client.ts` L363–364:

```ts
getOrder: (orderId: string) =>
  request<OrderDetailResponse>(`/orders/${encodeURIComponent(orderId)}`),
```

HTTP `403` + `PERMISSION_DENIED` → `OsApiError` kind `forbidden`  
(`apps/os-web/lib/api/os-api-errors.ts` L42, L51–56).

### 1.3 os-api controller

`apps/os-api/src/commercial.controller.ts` — `OrdersController`:

| Step | Location | Behavior |
|---|---|---|
| Route | `@Controller('orders')` + `@Get(':orderId')` L159–168 | |
| Session | `resolveSession(req, workforceStore)` L162 | |
| Context | `buildQueryContext(session, workforceStore)` L163 | loads member scopes into `QueryContext.auth` |
| Query | `commercialQuery.getOrder(ctx, orderId)` L164 | |
| Error map | `toHttp` L24–39 | `PERMISSION_DENIED` → HTTP 403 |

### 1.4 Query service (authorization decision)

`packages/os-query/src/commercial/commercial-query-service.ts` L334–349:

```
assertQueryScope(ctx, 'member_active')
→ projectionStore.getOrderReadModel(org, orderId)
→ if !model → NOT_FOUND
→ if !canViewCommercialRecord(ctx, model) → PERMISSION_DENIED   ← DENY HERE
→ return order + freshness + authority
```

### 1.5 Resource auth resolver (the failing gate)

`packages/os-query/src/commercial/commercial-auth.ts` L22–29:

```ts
export function canViewCommercialRecord(ctx, record): boolean {
  if (record.organizationId !== ctx.organizationId) return false;
  if (isCommercialOrgAdmin(ctx.auth)) return true;  // people.admin ONLY
  return record.ownerMemberId === ctx.auth.memberId;
}
```

`isCommercialOrgAdmin` (L13–15) = `memberHasScope(auth, 'people.admin')`.

**There is no check for `commercial.org.read`, `commercial.team.read`, or `management.org.read`.**

---

## 2) Identified factors

### 2.1 REQUIRED_CAPABILITY (what actually unlocks Pedido commercial read today)

| Capability | Unlocks `getOrder` / `listOrders`? | Notes |
|---|---|---|
| **Own `ownerMemberId` match** | YES | Only non-admin path |
| **`people.admin`** | YES | Via `isCommercialOrgAdmin` — **forbidden on Carmen SYNTH** |
| **`commercial.org.read`** | **NO** | Granted to Carmen owner-eval; ignored by order auth |
| **`commercial.team.read`** | **NO** | Ignored by order auth |
| **`management.org.read`** | **NO** | Ignored by order auth |
| **`system.admin` / `qa.access`** | N/A / forbidden | Must not be used as fix |

Carmen SYNTH business scopes explicitly include `commercial.org.read` and exclude `people.admin`:

- `packages/os-database/src/staging-carmen-synth-demo-scopes.ts` L8–14 (forbidden), L21–42 (business, includes `commercial.org.read`)
- `packages/os-database/src/staging-carmen-owner-evaluation-grant-spec.ts` L29–50 (same business set)

### 2.2 RESOURCE_FILTER (list vs detail)

**Orders list** (`listOrders`, same file L313–331):

1. `assertCommercialListScope(ctx, query.ownerMemberId)` (`commercial-auth.ts` L31–42)  
   - non-`people.admin` → **forces** `ownerMemberId = ctx.auth.memberId`  
   - requesting another owner → `PERMISSION_DENIED`
2. `listOrderReadModels(..., { ownerMemberId })` — store filter to self  
3. `filterVisibleOrders` → again `canViewCommercialRecord` (owner or `people.admin`)

**Orders do not support `visibility` at all.**  
`ListOrdersQuerySchema` (`packages/os-contracts/src/queries.ts` L292–298) has `q|status|partyId|quoteId|ownerMemberId` only — **no `visibility` enum**.

By contrast, opportunities/quotes:

- Schema includes `visibility: own|team|org` (`queries.ts` L281–288 for quotes; opportunities analogous).
- Service uses `resolveOwnerReadScope` / `ownerInReadScope` / `canReadOwnedRecord`  
  (`leadership-visibility.ts` L31–109, `commercial-query-service.ts` L199–310).
- `canReadOwnedRecord` **does** allow `commercial.org.read` for single-record reads (L101).

### 2.3 EvaluationProjection / View As interaction

| Layer | File | Behavior for this defect |
|---|---|---|
| Projection | `apps/os-web/lib/role-preview/evaluation-projection.ts` | Cookie-driven; `active=false` when no View As persona |
| Desk/owner filters | `evaluation-resource-access.ts` L59–66, L68–79 | Inactive projection → allow all desks / no owner slice |
| List query narrowing | `commercial-list-query.ts` | When active, adds `visibility` + optional `ownerMemberId` for Asesor |
| Order detail page | `pedidos/[orderId]/page.tsx` | **Does not read projection** |

**Conclusion:** With View As **off**, evaluation code does not deny the Pedido. The API still denies because order auth never consults `commercial.org.read`. View As cannot “fix” this either for Gerencia (`visibility=org`) until `listOrders`/`getOrder` honor leadership visibility — and `listOrders` does not even accept `visibility`.

### 2.4 OWNER_EVAL_STATE

No symbol named `OWNER_EVAL_STATE` exists in the repo (grep empty).

Operational meaning of “owner evaluation without View As”:

1. Real membership scopes = SYNTH business set (includes `commercial.org.read`, excludes `people.admin`).  
2. `EvaluationProjection.active === false` → no UI narrowing.  
3. Expected product rule (documented in synth scopes): **broad SYNTH business visibility**; View As narrows projection only.

Actual Pedido commercial reads violate that rule: they behave like **Asesor self-owned** unless `people.admin`.

### 2.5 Why this seeded Pedido is forbidden for Carmen

Seed ownership (`packages/os-database/src/owner-demo/seed.ts`):

1. Commercial actor = `w2.asesor@isalwa.demo` (fallback fixture seed) — L153–156, L1195–1199.  
2. Quote/order loop runs as that commercial session — L1247+.  
3. `CreateOrder` copies `ownerMemberId: quote.ownerMemberId`  
   (`packages/os-commercial/src/commercial-command-service.ts` L1056–1062).

Therefore Maderas order `ownerMemberId` = Wave2 Asesor member, **not** Carmen.

Carmen decision with View As off:

```
tenant match? yes
people.admin? no (hard-forbidden on SYNTH)
ownerMemberId === Carmen.memberId? no (owned by w2.asesor)
→ canViewCommercialRecord = false
→ PERMISSION_DENIED → 403 → AccessDeniedState
```

This is **already encoded as expected behavior** in unit tests (legacy lag, not product intent for owner-eval):

`packages/os-query/src/leadership/leadership-visibility.test.ts` L440–458:

> `commercial.org.read` may list/get opportunities & quotes, but  
> `getOrder(gerente, 'o-report')` → `PERMISSION_DENIED` and `listOrders` → `[]`.

---

## 3) Authorization decision path (compact)

```
GET /v1/orders/:orderId
  → OrdersController.get
  → buildQueryContext (member scopes; Carmen has commercial.org.read, not people.admin)
  → CommercialQueryService.getOrder
  → getOrderReadModel (row exists for Maderas seed)
  → canViewCommercialRecord(ctx, model)
       REQUIRED: people.admin OR ownerMemberId === actor
       RESOURCE_FILTER: none beyond tenant + ownership
       EvaluationProjection: not consulted
       OWNER_EVAL / View As: not consulted
  → throw PERMISSION_DENIED
  → HTTP 403
  → OsApiError forbidden
  → AccessDeniedState
```

**Parallel (working) path for Cotización / Oportunidad:**

```
getQuote / getOpportunity
  → canReadOwnedRecord(...)
       allows: self | people.admin | commercial.org.read | commercial.team.read+direct report
```

That asymmetry is the root defect for Owner Evaluation broad visibility.

---

## 4) Every Pedido read path + auth semantics

| Surface | Call path | Auth semantics | Differs from commercial detail? |
|---|---|---|---|
| **Pedido detail page** | `getOrder` → `canViewCommercialRecord` | owner **or** `people.admin` | Canonical failing path |
| **Orders index / list APIs** | `listOrders` → `assertCommercialListScope` + `filterVisibleOrders` | Forced self owner; no `visibility` | Same legacy gate; stricter than quotes |
| **Cliente360 Comercial Pedidos** | `listOrders({ partyId })` only | Same as list | Empty for Carmen |
| **Cliente360 Resumen Pedidos count** | derived from that list (see §5) | Same | Shows **0** |
| **Cliente360 finance summary** | `listOrders({ partyId, limit: 100 })` | Same | Open-order totals empty/unavailable |
| **Cliente360 document links** | `listOrders({ partyId, limit: 20 })` | Same | Misses order dossier links |
| **Quote page linked orders** | `listOrders({ quoteId, partyId })` | Same | |
| **Inicio / Mapa / Auditoría / Compras / Finanzas options / command search** | `listOrders(...)` (± `commercialListQueryFromProjection`) | Same legacy list; View As `visibility` **ignored by API** for orders | Opp/Quote View As narrowing works; Orders cannot |
| **Aprobaciones / memoria / staff subject resolve** | `getOrder(subjectId)` | Same detail gate | Approval subject may 403 for non-owner |
| **Warehouse / postsale desks** | Prefer `listOrders` + `getOrder`; fallback `delivery-ops` | Commercial path fails; **ops fallback** uses different auth | See below |
| **Entregas linked orders** | `listOrders({ status: 'open' })` | Commercial legacy | |
| **delivery-ops** `GET /delivery-ops/orders[+/:id]` | `canRecordDelivery \|\| canRecordWarehouseOutbound` | Org-wide open orders; **no ownership filter**; no money | Different capability set; Carmen SYNTH **has** these scopes → ops path can see Pedido context even when commercial cannot |
| **Delivery notes for order** | delivery command `authorizeResource` | Delivery scopes | Not commercial ownership |
| **UI-only `pedido-access.ts`** | leadership scopes incl. `commercial.org.read` + coverage | Would **allow** Carmen | **Not wired** to hosted detail page / API |
| **`os-pedido-case` authorize** | exact `commercial.team.read` **or** `management.org.read` | Explicitly says `commercial.org.read` is **not** this read | Another divergent model; unused by `getOrder` |
| **History / timeline** | party timeline + delivery events after order loads | Secondary; never reached if detail 403 | |
| **Audit** | audit search by resourceId + `listOrders` for labels | Audit desk uses admin scopes separately; order **href** coherence assumes commercial read works | |

**Key divergence:** commercial Pedido SoR (`/orders`) is ownership/`people.admin`-only; operational Pedido (`/delivery-ops`) is desk-scope org-wide. Owner Evaluation needs the **commercial** SoR (money, quote link, Cliente360 counts), which is the broken path.

---

## 5) Cliente360 Resumen Pedidos count

### Computation chain

1. `loadCliente360` (`apps/os-web/lib/cliente/load-cliente-360.ts` L58–71):  
   - Opportunities/Quotes: try `visibility: 'org'`, fallback without (L44–69).  
   - **Orders: `client.listOrders({ partyId, limit: 10 })` only — no org visibility attempt** (L71). Comment at L44–46 acknowledges org visibility for other commercial graphs but was never applied to orders.
2. `buildCliente360Intelligence` (`client-intelligence.ts` L48–51):  
   - `orders = items.length` when list status `ok`  
   - `openOrders = items.filter(status === 'open').length`
3. `Cliente360Intelligence` UI (`cliente-360-intelligence.tsx` L20–26):  
   - Stat **Pedidos** = `facts.orders` (else openOrders).

### Why Pedidos=0 (not “—”)

`listOrders` for Carmen succeeds with **HTTP 200 and empty items** (self-owned filter), not forbidden.  
So `orders.status === 'ok'` and `items.length === 0` → displayed **0**.

Detail URL still 403 if navigated via seed/audit href — coherent with RC2: “order id exists but detail forbidden.”

Opp=1 / Quote=1 works because those lists use `visibility=org` + `canReadOwnedRecord` / `resolveOwnerReadScope`.

---

## 6) ROOT_CAUSE

**Root cause:** Pedido commercial reads (`listOrders` / `getOrder`) still use the pre-leadership resolver `canViewCommercialRecord` / `assertCommercialListScope`, which only admit **record owner** or **`people.admin`**. Opportunities and quotes already use the canonical leadership visibility stack (`resolveOwnerReadScope` / `canReadOwnedRecord`), which treats **`commercial.org.read` as org-wide commercial read**.

Carmen Owner Evaluation is correctly granted `commercial.org.read` and correctly **denied** `people.admin`. Seeded DEMO MADERAS Pedido is owned by `w2.asesor@isalwa.demo`, not Carmen. Therefore Owner Evaluation without View As is forbidden on Pedido detail and sees Pedidos=0 on Cliente360 — while Cotización/Oportunidad for the same party remain visible.

This is **not** a View As bug, not a missing seed, and not a UI-only AccessDenied mis-render.

**Evidence anchors:**

| Claim | Citation |
|---|---|
| Detail calls `getOrder` → AccessDenied on forbidden | `pedidos/[orderId]/page.tsx` L70, L580–585 |
| `getOrder` uses `canViewCommercialRecord` | `commercial-query-service.ts` L334–338 |
| Gate = owner \|\| `people.admin` | `commercial-auth.ts` L13–29 |
| Quotes use `canReadOwnedRecord` (includes org.read) | `commercial-query-service.ts` L286–298; `leadership-visibility.ts` L92–109 |
| Orders query has no `visibility` | `queries.ts` L292–298 vs L281–288 |
| Cliente360 orders lack org visibility | `load-cliente-360.ts` L58–71 |
| Resumen count from list length | `client-intelligence.ts` L48–51; `cliente-360-intelligence.tsx` L20–26 |
| Test locks org.read out of getOrder | `leadership-visibility.test.ts` L440–458 |
| Carmen SYNTH has org.read, not people.admin | `staging-carmen-synth-demo-scopes.ts` L8–42 |
| Seed commercial owner = w2.asesor | `owner-demo/seed.ts` L153–156, L1195–1199; CreateOrder L1062 |

---

## 7) CORRECT fix (proposed — do not implement in this trace)

### Goal

Owner Evaluation **without** View As → broad SYNTH commercial Pedido visibility (same as Opp/Quote).  
View As → remains a **narrowing** overlay only (never elevates).  
No `system.admin`, `people.admin`, `qa.access`, hardcoded Carmen/order IDs, or UI-only bypass.

### Canonical change (server — required)

Align Pedido commercial query with opportunities/quotes:

1. **`ListOrdersQuerySchema`** (`packages/os-contracts/src/queries.ts`): add optional `visibility: own|team|org` (same enum as quotes).
2. **`CommercialQueryService.listOrders`**: replace `assertCommercialListScope` + `filterVisibleOrders` with:
   - `resolveOwnerReadScope({ ctx, visibility, requestedOwnerMemberId, lookup })`
   - `toStoreOwnerFilter` + `ownerInReadScope` (mirror `listQuotes`).
3. **`CommercialQueryService.getOrder`**: replace `canViewCommercialRecord` with **`canReadOwnedRecord`** (same args pattern as `getQuote`).
4. Update / invert `leadership-visibility.test.ts` expectations that currently assert `getOrder` denies `commercial.org.read`.
5. Keep `canViewCommercialRecord` either deprecated for orders or reduced to a non-API helper — do **not** reintroduce `people.admin` as the org-read shortcut (comments already say people.admin is not a leadership shortcut for visibility=team|org).

### Cliente360 (client — required for Pedidos count)

6. **`loadCliente360`**: call `listOrders` with the same `listPartyScoped(visibility: 'org', …)` pattern already used for opportunities/quotes (`load-cliente-360.ts` L47–71).

### View As (must stay narrow)

7. Once `listOrders` accepts `visibility`, existing `commercialListQueryFromProjection` (`commercial-list-query.ts`) correctly narrows:
   - Asesor → `visibility=org` + `ownerMemberId=subject` (or impossible owner when subject missing)
   - Jefe → `visibility=team`
   - Gerencia → `visibility=org`
8. Optional hardening: order detail page may apply `evaluationBlocksDirectParty` / owner checks **after** a successful API read for Asesor View As — same pattern as other commercial desks — without changing server elevation.

### Explicit non-fixes

- Do **not** grant Carmen `people.admin`.  
- Do **not** re-seed Maderas orders as owned by Carmen.  
- Do **not** special-case order ids or emails.  
- Do **not** only hide AccessDenied in the UI while leaving API deny.  
- Do **not** route Cliente360 Pedidos through `delivery-ops` (loses commercial money/quote graph).  
- Do **not** treat `os-pedido-case`’s narrower scope list as the commercial SoR gate.

### Proof matrix after fix (expected)

| Subfeature | Expected state |
|---|---|
| `GET /orders/:maderas` as Carmen, View As off | 200 with seeded order |
| Cliente360 Resumen Pedidos | ≥1 for Maderas |
| Opp/Quote unchanged | still org-visible with org.read |
| View As Asesor without subject | empty / blocked commercial slice |
| View As Asesor with subject | only that owner’s Pedidos |
| View As Jefe | team visibility only (direct reports) |
| people.admin still not required | PASS |
| Hosted browser | must re-prove; mark UNPROVEN until BV |

---

## 8) Trace verdict

| Question | Answer |
|---|---|
| Where does forbidden originate? | `canViewCommercialRecord` in `commercial-auth.ts` via `getOrder` |
| Required capability today? | Owner match **or** `people.admin` |
| Why owner-eval fails? | Has `commercial.org.read`, lacks `people.admin`, is not order owner |
| View As involved? | **No** for this defect when inactive |
| Why Pedidos=0? | `listOrders` self-filter returns empty ok list; intelligence counts length |
| Correct fix locus? | Align order list/detail with `leadership-visibility` + Cliente360 org visibility call |

**IMPLEMENTED:** no (trace only)  
**TESTED:** root cause confirmed by code + existing unit test that encodes the lag  
**HOSTED / BROWSER-VERIFIED fix:** UNPROVEN (defect hosted-confirmed in RC2; fix not applied)
