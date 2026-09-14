# Wave 2 — First Staging Readiness Review

Candidate: `8aa82c32bfeb3112ce8a5a81983afb3757c10379` (P0 blocker pass; lineage via `fea5193` / `96c797b`)  
Branch: `wave2/candidate-unified`  
Parent lineage includes: `29d63bc` → `96c797b` → `fea5193` → this SHA  
Integration pin: `316426f272bce29924ffd4991da88ffe7d421bbd` (unmoved)  
Deploy / migrate this pass: **NO**

Evidence for Isa paper forms remains Carmen transcription only.

---

## B. Clean build proof (re-proven on this SHA)

### Before

```
## wave2/candidate-unified
HEAD 96c797bdee606605a19b8460569ff39a95409c02
```

No uncommitted tracked changes. No dependency on dirty main or sibling worktrees.

### Commands and results

| Command | Result |
|---|---|
| `corepack pnpm install --frozen-lockfile` | PASS |
| `corepack pnpm -r build` | PASS |
| `corepack pnpm --filter web build` | PASS |
| `corepack pnpm --filter api build` | PASS |
| `corepack pnpm --filter os-api build` | PASS |
| `corepack pnpm --filter @isalwa/os-catalog build` | PASS |
| `OS_DATABASE_URL=postgresql://validate:validate@127.0.0.1:5432/validate prisma validate` | PASS (dummy URL for schema only; no DB connect) |
| Prisma validate without env | FAIL expected (missing `OS_DATABASE_URL`) |

`prisma generate` during build dirtied tracked `packages/os-database/src/generated/client/*`; restored with `git checkout -- packages/os-database/src/generated` so the worktree returned clean.

### Affected tests (this SHA)

| Package / suite | Pass | Fail |
|---|---:|---:|
| `@isalwa/os-contracts` | 159 | 0 |
| `@isalwa/os-delivery` | 24 | 0 |
| `@isalwa/os-finished-goods` | 7 | 0 |
| `@isalwa/os-domain` | 230 | 0 |
| `@isalwa/os-request-session` | 4 | 0 |
| `@isalwa/os-workforce` | 47 | 0 |
| `@isalwa/os-events` | 3 | 0 |
| `@isalwa/os-pedido-case` | 20 | 0 |
| `@isalwa/os-coordination-read` | 27 | 0 |
| `@isalwa/os-read-dates` | 24 | 0 |
| `@isalwa/os-read-ops` | 20 | 0 |
| `@isalwa/os-read-fulfillment` | 22 | 0 |
| `@isalwa/os-commercial` | 45 | 0 |
| `@isalwa/os-allocation` | 21 | 0 |
| os-api `inspection-reads.adversarial` | 15 | 0 |
| contracts `reported-operational-fact` (mixed tenders) | 5 | 0 |
| **Total counted** | **673** | **0** |

### After

```
## wave2/candidate-unified
HEAD 96c797bdee606605a19b8460569ff39a95409c02
```

Clean. Generated client restored to committed state.

---

## C. Governance proposals (proposal only — not registered)

See also existing `packages/os-contracts/src/governance-proposals.ts` and  
`docs/architecture/WAVE2_STAGING_GOVERNANCE_PROPOSALS.md`.

| ID | Recommendation |
|---|---|
| QUOTE_CREATE_SEND_ACCEPT | Split writes; do not keep `member_active` as final quote write authority |
| VISIT_WRITE_AUTHORITY | Dedicated visit check-in write; no existing scope fits |
| LOCATION_DETAIL_READ | Dedicated location-detail read; `management.org.read` / `commercial.team.read` insufficient |
| COORDINATION_READ_AUTHORITY | Dedicated decision-history read; write ≠ read; board may use `management.org.read` for composed exceptions only |
| PARTY_DETAIL_READ / PARTY_LOCATIONS_READ | Explicit decision needed — today `AUTHORIZATION_UNPROVEN` (member_active + tenant) |

---

## D. Isa questions

- `docs/architecture/ISA_QUESTION_FACTORY_DELIVERY_NOTE.md`
- `docs/architecture/ISA_QUESTION_DOCUMENT_NUMBERING.md`

---

## E. Payment tender proof

Invariant proven in `reported-operational-fact.test.ts`:

- 107000 efectivo + 20000 QR = 127000 total, `source_reference` `007472`, confirmation `pending`
- sum mismatch rejected (`tenders_must_sum_to_total`)
- `reportedFactMayConfirmPayment()` false
- tenders live inside org-scoped fact payload (no separate cross-tenant tender resource)
- not ledger / tax / bank / journal

---

## F. Migration inventory (unapplied — do not apply)

Gate C: **HOLD / BLOCKED_DB_STATE_UNKNOWN**. Additive ≠ permission to apply.

| Migration | Class |
|---|---|
| 20260823120000_os_foundation_step10 … through 20260915140000_os_customer_conversation | ADDITIVE (table/foundation family; staging apply-set unknown) |
| 20260915150000_os_delivery | ADDITIVE |
| 20260915160000_os_customer_committed_date | ADDITIVE |
| 20260915170000_os_order_allocation | ADDITIVE |
| 20260915180000_os_purchase_request | ADDITIVE |
| 20260916100000_os_price_list | ADDITIVE |
| 20260916120000_os_special_order | ADDITIVE |
| **20260916140000_os_purchase_status_workflow** | **REWRITE** (drops checks, remaps status values) |
| 20260916160000_os_coordination_decision | ADDITIVE |
| **20260917120000_os_finished_goods_receipt** | **ADDITIVE** |
| **20260917140000_os_external_document_number** | **ADDITIVE** |

No migration classified DESTRUCTIVE (drop table / truncate). Purchase status workflow is the notable REWRITE.

Live DB (`isalwa-os-staging` / `isalwa_os_staging`) apply-state: **UNKNOWN** — no IP allowlist change, no connection attempt this pass.

### Gate C read-only evidence still required

1. Which migrations already applied on `isalwa_os_staging` (read-only `_prisma_migrations` or operator inventory).  
2. Whether `20260916140000_os_purchase_status_workflow` is safe given current status values.  
3. Operator-approved apply order for remaining ADDITIVE migrations including Listo + external document number.  
4. Backup / rollback note before REWRITE.

---

## H–L. Matrices

See:

- Live loop: this file §H below  
- P0/P1/P2: §I  
- Roles: §J  
- Guided: §K  
- UI: §L  
- Feature Proof Matrix: `docs/architecture/V1_FEATURE_PROOF_MATRIX.md` (updated to this SHA)

### H. Live operating loop (honest)

| Domain | Model | Read | Write | Authority | Persistence | Audit/event | UI | Proof | First-pilot blocker? |
|---|---|---|---|---|---|---|---|---|---|
| Customer | Party | tenant + often member_active | Party commands | party scopes / member_active mix | Prisma | events | Clientes | partial | P1 if create works for pilot staff |
| Opportunity | Opportunity | commercial reads | Create/Update… | often member_active | Prisma commercial | yes | Oportunidades | TESTED local | P1 authority cleanup |
| Quote | Quote | commercial reads | Create/Update/Submit | **member_active today** | Prisma | yes | Cotizaciones | TESTED | **P0 policy** — granular caps undecided |
| Quote PDF | PDF route | session | n/a | session | generated | n/a | PDF | LOCAL_HTTP prior | P1 |
| Pedido/Order | Order | Pedido adapter | CreateOrder convert | convert/own rules | Prisma | yes | Pedidos | TESTED reads | P1 |
| Customer communication | Conversation | scoped | manual record | varies | model exists | evidence | Mensajes | partial | P1 |
| Payment evidence | Reported fact | org | record payment | operational | OS path: row builders; live Prisma OS writer not proven here. Legacy CRM payment may exist separately | pending confirm | Finanzas | TESTED contracts | P1 hosted OS UI; do not conflate with ledger |
| Customer informed | date-issue only | readers | date informed | exists for date-issue | partial | — | Pedido | FOUNDATION_GAP general | P1 gap label |
| Purchase Request | OsPurchaseRequest | ops read | transition | purchasing.* | **memory writer** | FOUNDATION_GAP | Compras | NOT live Prisma writer | **P0 if Compras promised** |
| Production entry | Trace | production UI | entry | production.entry | **memory** | FOUNDATION_GAP | Producción | NOT live | **P0 if Producción promised** |
| Quema / Loss / Consumption | Trace | — | — | production.entry | **memory** | FOUNDATION_GAP | Producción | NOT live | **P0 / P1** by journey |
| Finished Goods receive | OsFinishedGoodsReceipt | org read | receive | warehouse.finished_goods.receive | Prisma writer exists; **migration unapplied** | events designed | Almacén | TESTED local | **P0 migrate+host** for Listo |
| Allocation | OsOrderAllocation | readers | allocate cmd | allocate scope | **memory** | FOUNDATION_GAP | Almacén | NOT live DB writer | **P0 for Cumplir Pedido** |
| Warehouse Exit | delivery models | fulfillment | command | warehouse.outbound.record | **memory; DELIVERY_LIVE_WRITE UNPROVEN** | — | Entregas | memory | **P0 for Entregar** |
| Delivery / Nota Entrega | delivery models | panel | delivery.record | delivery.record | **memory; live write UNPROVEN** | — | Entregas | TESTED memory | **P0 for Entregar** |
| Commercial exception | capability only | — | authorize | commercial.exception.authorize | FOUNDATION_GAP writer | — | — | — | P1 |
| Special Order | classification model | — | — | no write cap | CROSS_LANE | — | — | — | P1 |
| Coordination decision | OsCoordinationDecision | **read CLOSED** | record helper | coordination.decision.record | schema exists; **live write UNPROVEN** in module | write≠read | Coordinación | read CROSS_LANE | **P0 for prior-decision history** |
| Work / next action | work/attention | work scopes | work cmds | work scopes | Prisma work | yes | Trabajo | prior | P1 |

### I. Gap classification (conservative)

**P0 — before Isa/Álvaro see V1**

1. Gate C DB apply-state known + approved migration plan (incl. REWRITE purchase workflow).  
2. Quote write authority decision (stop relying on `member_active` as product promise); clarify `commercial.order.convert` vs unwired `commercial.quote.convert.own`.  
3. Party/location detail read decision or routes remain clearly non-pilot / blocked.  
4. Persistent writers for any Guided journey shown as complete: Listo receive (after migrate), allocation, delivery/salida, production entry/quema if those journeys are offered.  
5. Coordination prior-decision read authority if Coordinar promises history.  
6. No fake zeros / UNPROVEN labeled in Pedido/Gerencia.  
7. Hosted browser proof of security negatives for tenant isolation.  
8. ~~Replace giant member `<select>` / fetch-capped directory pickers~~ → **local FIX** (`ServerMemberTypeahead`); still need HOSTED browser proof before Isa/Álvaro.

**P1 — visibly closed/unavailable OK**

- Factory note mapping (`BUSINESS_ROLE_REQUIRES_MAPPING`)  
- Document numbering generation  
- General customer informed-of-order  
- Visit check-in  
- Mixed-tender Caja UI polish (contracts exist)  
- Special order write capability  
- Commercial exception Prisma writer  

**P2 — post-pilot**

- Digital signature platform  
- Ledger/tax/bank  
- Map provider completeness  
- WhatsApp send  
- FX columns on Caja form  

### J. Role-journey readiness

| Role | State | Reason |
|---|---|---|
| Asesor Comercial | PARTIAL | Quote/opportunity paths exist but write authority is coarse (`member_active`); visit write undecided; informed-of-order gap |
| Jefe Comercial | PARTIAL | Reads/approvals partial; same quote authority debt |
| Gerente General | PARTIAL | Exception board readers TESTED; coordination history CLOSED; hosted UNPROVEN |
| Producción | BLOCKED | Production/quema/loss/consumption live Prisma writers FOUNDATION_GAP |
| Almacén | PARTIAL | Listo receive IMPLEMENTED locally, migration unapplied, HOSTED no; allocate/salida live UNPROVEN |
| Compras | BLOCKED | Status transition live Prisma writer FOUNDATION_GAP; Gate C REWRITE unknown |
| Contabilidad | PARTIAL | Payment evidence contracts TESTED; UI/ledger boundary must stay honest; HOSTED no |
| Auxiliar/Coordinación | PARTIAL | Board composed read via management.org.read; prior decisions CROSS_LANE |
| ISALWA Manager/Owner | PARTIAL | Admin/workforce TESTED prior; business vs technical separation policy holds; HOSTED partial |

### K. Modo Guiado readiness

| Journey | Entry | Coverage | Blocked step | Priority |
|---|---|---|---|---|
| Vender | /oportunidades, /clientes | commercial create paths | Authority honesty / visit | P0 policy |
| Atender un Pedido | Pedido | truthful ports | Missing ports must stay UNPROVEN | P0 label honesty |
| Producción | /produccion | UI exists | Persistent entry/quema/loss | P0 if offered |
| Cumplir Pedido | Almacén/Pedido | Listo receive local | Allocate live writer | P0 |
| Entregar | /entregas | panel + memory cmds | Live delivery/salida UNPROVEN | P0 |
| Resolver un problema | Coordinación/Inicio | exceptions | Decision history read | P0/P1 |
| Coordinar la empresa | /coordinacion | composed board | Prior decision read | P0 if history promised |
| Gerencia | /inicio | exception lens | Hosted proof; dead KPI ban | P0 honesty |

### L. UI humiliation readiness

28 cases in `V1_UI_HUMILIATION_ACCEPTANCE.md`.

- **Local-testable now:** copy/contracts presence, Entrega boundary copy, reader UNPROVEN≠zero unit semantics, permission deny unit tests.  
- **Require hosted browser:** typeahead/fetch-all, pagination, drawers/Escape/focus, narrow viewport, refresh/back, Guided fake-complete, autocomplete leakage, dead buttons on live pages.

- **Obvious P0 UI defect (fixed this pass, local only):** Admin/commercial member pickers no longer use giant `<select>` + capped `listMembers` / active-options dump. Replaced with `ServerMemberTypeahead` + tenant-scoped `searchActiveMembers` (`docs/architecture/P0_MEMBER_SELECTOR_INVENTORY.md`). HOSTED/BROWSER still UNPROVEN.
- Warehouse allocate desk still dumps in-memory product/pedido lists into `<select>` → **P1** while those journeys remain BLOCKED on live writers.

No new dead-button / fake-KPI code defect was proven beyond honesty risks already gated in readers.

---

## S. Decision

**READY_FOR_STAGING_PREP**

Meaning: clean SHA build is coherent for operator staging **preparation**.  
This is **not** permission to deploy or migrate. Gate C and P0 items in §I / §T still block actual first deployment and Isa/Álvaro exposure.

### T. Exact blockers to actual first deployment

1. Gate C: DB migration apply-state unknown; REWRITE purchase workflow risk.  
2. Operator apply plan for ADDITIVE migrations (Listo + external numbers + earlier set).  
3. Carmen approval on quote / party-location / coordination-read governance proposals (or explicit fail-closed product behavior).  
4. Persistent writers for any offered P0 Guided mutations.  
5. Hosted deploy + browser security/UI proof.  
6. SAFE FOR ISA / ÁLVARO remains **NO** until Gate D/E.
