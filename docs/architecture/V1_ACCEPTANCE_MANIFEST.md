# V1 Acceptance Manifest — ISALWA OS (pre-first-deployment)

Promise-level acceptance contract. Not a page inventory.

Evidence for Isa paper forms: Carmen transcription only (see `ISA_DOCUMENT_RECONCILIATION_WAVE2.md`). Photographs were not inspected by engineering.

Status of this artifact: **AUTHORING / PLANNED for hosted UAT**  
Gate A: LOCAL DEPLOYMENT CANDIDATE READY  
Gate C: HOLD / BLOCKED_DB_STATE_UNKNOWN  
SAFE FOR ISA / ÁLVARO: **NO**  
Deploy / migrate this pass: **NO**

Each case uses:

ROLE · PROMISE · SETUP · ACTION · EXPECTED · NEGATIVE · SOURCE OF TRUTH · PROOF REQUIRED · CURRENT STATE

---

## A. Role journeys

### A1. ASESOR COMERCIAL — Journey: Vender

| Field | Content |
|---|---|
| ROLE | Asesor Comercial |
| PROMISE | Find/select/create permitted customer; open opportunity; create quote with governed price context; respect approval boundary; convert/open Pedido when authorized; record follow-up without inventing informed-of-order; see next action; cannot warehouse/produce/admin |
| SETUP | Member with commercial write scopes only; tenant fixtures |
| ACTION | Complete Vender path through available commercial facts |
| EXPECTED | Customer and quote facts tenant-scoped; approval gates hold; Pedido shows real facts; missing production/Listo/delivery show UNPROVEN not zero |
| NEGATIVE | No manager/warehouse/production mutations; no cross-tenant customer; no PriceList write from historical entrega prices |
| SOURCE OF TRUTH | Party + commercial projection + capability registry |
| PROOF REQUIRED | TESTED → HOSTED → BROWSER-VERIFIED → USER-ACCEPTED |
| CURRENT STATE | Convert: owner / active coverage / commercial.order.convert TESTED; convert.own DEPRECATE_LATER; HOSTED UNPROVEN; informed-of-order P1 FOUNDATION_GAP |

### A2. JEFE COMERCIAL

| Field | Content |
|---|---|
| ROLE | Jefe Comercial |
| PROMISE | Team commercial visibility; customer/date issues; approvals/exceptions; drillthrough to evidence; title alone grants no technical admin |
| SETUP | Lead commercial capabilities; no people.admin |
| ACTION | Open team exceptions and date-issue cases; drill to source |
| EXPECTED | Exceptions backed by facts; date-issue informed only when source exists |
| NEGATIVE | Cannot invite/suspend workforce; cannot change system config via title |
| SOURCE OF TRUTH | Commercial timeline + customer date facts + capabilities |
| PROOF REQUIRED | HOSTED + BROWSER-VERIFIED |
| CURRENT STATE | Partial TESTED; general informed-of-order FOUNDATION_GAP |

### A3. GERENTE GENERAL

| Field | Content |
|---|---|
| ROLE | Gerente General |
| PROMISE | Cross-functional exceptions (production risk, purchase blockers, special orders, Listo awaiting action, delivery/comms gaps); decisions from factual sources only; missing coverage never looks like “no problem” |
| SETUP | Management org.read (+ decision scopes if any) |
| ACTION | Open Gerencia / exceptions; drill each item |
| EXPECTED | Each exception cites source; UNPROVEN/NO_FACT labeled |
| NEGATIVE | Dead KPI; invented zero stock; fake payment confirmed |
| SOURCE OF TRUTH | Ops/coordination readers + finished-goods reader + purchase status |
| PROOF REQUIRED | HOSTED + BROWSER-VERIFIED + USER-ACCEPTED |
| CURRENT STATE | Readers TESTED locally; coordination prior-decision read CROSS_LANE |

### A4. PRODUCCIÓN

| Field | Content |
|---|---|
| ROLE | Producción |
| PROMISE | Product-based production (process, quema, loss, consumption, blocker); Finished Goods handoff; no Pedido-driven production fiction |
| SETUP | Production write scopes |
| ACTION | Record production on product; hand off to Listo path when modeled |
| EXPECTED | Production independent of Pedido; loss fields retained |
| NEGATIVE | Cannot invent Order→ProductionRun; consumption does not decrement authoritative stock |
| SOURCE OF TRUTH | Production packages + FinishedGoodsReceipt |
| PROOF REQUIRED | TESTED → HOSTED |
| CURRENT STATE | Production entry/quema/loss/consumption prisma_port TESTED; migration unapplied; HOSTED UNPROVEN |

### A5. ALMACÉN

| Field | Content |
|---|---|
| ROLE | Almacén |
| PROMISE | Record FinishedGoodsReceipt; distinguish receive from allocate; partial/multiple allocation only with allocation authority; warehouse exit (Nota de Salida) without claiming Entrega or Fábrica note; no cross-tenant leakage |
| SETUP | `warehouse.finished_goods.receive`; allocation scope separate; outbound scope separate |
| ACTION | Receive Listo; attempt allocate without scope; record salida; refuse auto-map of Nota de Entrega de Fábrica |
| EXPECTED | Receipt stored; allocate denied without scope; salida ≠ entrega ≠ fábrica; Fábrica stays BUSINESS_ROLE_REQUIRES_MAPPING |
| NEGATIVE | Receive must not allocate; foreign tenant id fails closed; Fábrica ≠ Listo/Salida/Entrega/Delivery/Allocation |
| SOURCE OF TRUTH | OsFinishedGoodsReceipt + delivery outbound + capabilities |
| PROOF REQUIRED | LOCAL tests done; HOSTED + BROWSER required |
| CURRENT STATE | Receive + allocate prisma_port TESTED; warehouse exit write CROSS_LANE (authority not registered); migrations unapplied; HOSTED UNPROVEN |

### A6. COMPRAS

| Field | Content |
|---|---|
| ROLE | Compras |
| PROMISE | Exact purchase status sequence; authorized transitions only; no fake stock truth from purchase |
| SETUP | Purchase scopes |
| ACTION | Transition statuses along governed sequence |
| EXPECTED | Labels exact; illegal transition refused |
| NEGATIVE | Purchase must not invent warehouse stock |
| SOURCE OF TRUTH | Purchase status workflow (Gate C migration policy separate) |
| PROOF REQUIRED | TESTED → HOSTED |
| CURRENT STATE | Model prior; Gate C HOLD — do not apply purchase migration this pass |

### A7. CONTABILIDAD / CAJA

| Field | Content |
|---|---|
| ROLE | Contabilidad (ops payment evidence) / Caja |
| PROMISE | Preserve operational payment evidence including mixed tenders and official receipt reference `007472` pattern; never claim ledger truth |
| SETUP | Reported operational payment path |
| ACTION | Record Bs 1,270 as efectivo 1,070 + QR 200 with source_reference 007472 |
| EXPECTED | Tenders stored; confirmation pending; no journal |
| NEGATIVE | Tender sum mismatch rejected; UI must not show “pagado contable” |
| SOURCE OF TRUTH | `reported-operational-fact` |
| PROOF REQUIRED | Contract TESTED; HOSTED UI later |
| CURRENT STATE | Mixed tenders + reported-operational-fact prisma_port TESTED; non-ledger; HOSTED UNPROVEN |

### A8. AUXILIAR / COORDINACIÓN

| Field | Content |
|---|---|
| ROLE | Auxiliar / Coordinación |
| PROMISE | Surface cross-functional issues with decision owner/due/follow-up; disclose incomplete source coverage; cannot impersonate operating departments |
| SETUP | Coordination scopes only |
| ACTION | Open coordination board; attempt warehouse receive |
| EXPECTED | Issues show coverage gaps; receive denied |
| NEGATIVE | Empty board must not mean “no history” when read authority blocked |
| SOURCE OF TRUTH | Coordination adapters + CROSS_LANE read authority |
| PROOF REQUIRED | HOSTED |
| CURRENT STATE | Decision write prisma_port TESTED (`coordination.decision.record`); read still CROSS_LANE — COORDINATION_READ_AUTHORITY; HOSTED UNPROVEN |

### A9. OWNER / ISALWA MANAGER

| Field | Content |
|---|---|
| ROLE | Owner / ISALWA manager |
| PROMISE | Gerencia business lens distinct from technical/system area; access/capability/config/integration/audit only per actual authority; people.admin is not business-manager shortcut |
| SETUP | Split business vs technical capabilities |
| ACTION | Open system area vs Gerencia |
| EXPECTED | Clear separation; capability-gated |
| NEGATIVE | Cargo/title alone grants nothing |
| SOURCE OF TRUTH | Capability registry + admin self-service boundary |
| PROOF REQUIRED | HOSTED + security matrix |
| CURRENT STATE | Boundary docs INTEGRATED; HOSTED proof separate |

---

## B. Modo Guiado journeys (1–8)

For each: start · Continuar · destination · real records · refresh · back · resume · dismiss · replay from Ayuda · role restriction · mobile · no fake completed state.

| # | Journey | Primary next action | Secondary | Blocked example | Drillthrough |
|---|---|---|---|---|---|
| 1 | Vender | Continue quote/Pedido | Open customer | Allocate stock | Cliente / Cotización |
| 2 | Atender un Pedido | See factual Pedido ports | Date issue | Invent production | Pedido detail |
| 3 | Producción | Record product production | Loss/quema | Pedido-driven run | Production record |
| 4 | Cumplir Pedido | Allocate with authority | Partial allocate | Receive-as-allocate | Listo / allocation |
| 5 | Entregar | Delivery + Nota de Entrega | Preserve external # | Map Fábrica note | Delivery note |
| 6 | Resolver un problema | Open exception | Assign follow-up | Fake resolution | Underlying evidence |
| 7 | Coordinar la empresa | Coordination board | Prior decision if authorized | Impersonate Almacén | Issue detail |
| 8 | Gerencia | Exception list | Drill evidence | Dead KPI zero | Source document/fact |

Guided Mode CURRENT STATE: shell prior; honesty contract AUTHORING; HOSTED Guided acceptance UNPROVEN.

---

## C. Screen “¿Qué hago ahora?” (major surfaces)

| Surface | Primary | Secondary | Blocked + why | Drill |
|---|---|---|---|---|
| Inicio / Gerencia | Top exception | Refresh | Action without source coverage | Exception evidence |
| Clientes | Open/search customer | Create if permitted | Foreign tenant | Cliente 360 |
| Pedido | Next factual gap | Communication when sourced | Zero for missing port | Port detail |
| Producción | Record/continue run | Report loss | Link to Pedido as driver | Product |
| Almacén Listo | Receive | View receipts | Allocate without scope | Receipt |
| Entregas | Record delivery | Attach external number | Create note before delivery | Nota de Entrega |
| Caja | Record payment evidence | Split tenders | Confirm ledger | Receipt ref |
| Coordinación | Triage issue | Set owner/due | Read prior decisions if CROSS_LANE | Issue |
| Admin personas | Invite/capability | Suspend | Business shortcut via people.admin | Member audit |
| Ayuda / Modo Guiado | Continuar / replay | Dismiss | Fake completed step | Journey destination |

---

## D. Open decisions blocking honest Guided coverage

1. DOCUMENT_NUMBERING  
2. FACTORY_DELIVERY_NOTE_ROLE / BUSINESS_ROLE_REQUIRES_MAPPING  
3. CUSTOMER_INFORMED_OF_ORDER  
4. COORDINATION_READ_AUTHORITY  
5. Quote/visit/location capability proposals (no invented scopes)

---

## E. Acceptance gates

| Gate | Meaning | Current |
|---|---|---|
| A Local candidate | Build + relevant tests on SHA | READY after this commit |
| B Hosted deploy | Operator-controlled deploy + migrate | NOT THIS PASS |
| C DB state known | Staging/prod DB + purchase migration policy | HOLD / BLOCKED_DB_STATE_UNKNOWN |
| D Browser proof | Control Tower disprove pass | NOT STARTED for Isa docs |
| E User acceptance | Isa + Carmen sign journeys | NOT STARTED |

**Promise count (this manifest):** 9 role journeys + 8 Guided journeys + 10 screen next-action contracts = **27** promise blocks (each with negative case).
