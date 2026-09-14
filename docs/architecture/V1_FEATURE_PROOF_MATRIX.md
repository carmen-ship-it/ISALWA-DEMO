# V1 Feature Proof Matrix — ISALWA OS

Honest states only. Never collapse PLANNED → USER-ACCEPTED.

**Exact candidate SHA:** _(set to ending SHA after this P0 pass commit)_  
Parent lineage: `fea519369eca49f19485d569a4e786d3df101840` → P0 member selector + quote-authority decision lock.  
Integration pin remains: `316426f272bce29924ffd4991da88ffe7d421bbd` (not moved).

Prior `96c797b` / `fea5193` build proofs are **not** silently inherited — re-prove on ending SHA.

Legend cells: Y = yes for that state · — = no · P = partial · U = UNPROVEN · G = FOUNDATION_GAP · D = BUSINESS_DECISION_REQUIRED · X = CROSS_LANE · H = HOLD

Columns: FEATURE · SUBFEATURE · OWNER ROLE · SOURCE OF TRUTH · PLANNED · IMPLEMENTED · TESTED · INTEGRATED · PUSHED · DEPLOYED · HOSTED · BROWSER-VERIFIED · USER-ACCEPTED · BLOCKER

Extra where useful: LOCAL_FUNCTION · AUTH_PATH_LOCAL · LOCAL_HTTP

---

## Release / staging prep

| FEATURE | SUBFEATURE | OWNER | SOURCE | P | I | T | Int | Push | Dep | Host | Br | UA | BLOCKER |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Clean build | pnpm -r + web/api/os-api/catalog + prisma validate | Platform | WAVE2_P0_FIRST_PILOT_BLOCKER_PASS | Y | Y | Y | Y | — | — | — | — | — | Gate C for deploy |
| Payment | Mixed tenders 1070+200 | Caja | reported-operational-fact | Y | Y | Y | Y | — | — | U | — | — | hosted UI |
| Governance | Quote/visit/location/coordination proposals | Carmen | WAVE2_STAGING_GOVERNANCE_PROPOSALS | Y | — | — | — | — | — | — | — | — | proposal only |
| Quote convert | commercial.quote.convert.own vs CreateOrder | Carmen | QUOTE_CONVERSION_AUTHORITY_DECISION | Y | — | Y | — | — | — | — | — | — | D CROSS_LANE — unwired |
| Member picker | ServerMemberTypeahead + searchActiveMembers | Admin/Comercial | P0_MEMBER_SELECTOR_INVENTORY | Y | Y | Y | Y | — | — | — | — | — | HOSTED/BROWSER unproven |

| FEATURE | SUBFEATURE | OWNER | SOURCE | P | I | T | Int | Push | Dep | Host | Br | UA | BLOCKER |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Session | Canonical request/session resolver | Platform | apps/api + os-api trusted session | Y | Y | Y | Y | — | — | U | — | — | none |
| Authz | Server-derived org + capabilities | Platform | trusted session | Y | Y | Y | Y | — | — | U | — | — | none |
| Authz | Client tenant/scope not authority | Platform | Gate A predicates | Y | Y | Y | Y | — | — | U | — | — | none |
| Isolation | Member search tenant predicate | Platform | member-search.adversarial | Y | Y | Y | Y | — | — | U | — | — | hosted adversarial |

LOCAL_HTTP: prior route proof on candidate (session/party/location/outbox/quote PDF).

## Commercial / customer

| FEATURE | SUBFEATURE | OWNER | SOURCE | P | I | T | Int | Push | Dep | Host | Br | UA | BLOCKER |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Cliente | 360 commercial read | Asesor/Jefe | commercial projection | Y | Y | Y | Y | — | — | U | — | — | hosted proof |
| Commercial | Opportunity/quote write | Asesor | commercial core | Y | Y | Y | Y | — | — | U | — | — | hosted proof |
| Dates | Customer date-issue informed | Jefe | date facts | Y | Y | P | Y | — | — | U | — | — | partial source |
| Comms | Informed-of-order general | Asesor | — | Y | — | — | — | — | — | — | — | — | G CUSTOMER_INFORMED_OF_ORDER |
| Pedido | Truthful operating ports | Asesor/Gerencia | Pedido adapter | Y | Y | Y | Y | — | — | U | — | — | hosted; missing ports = UNPROVEN |

## Production / warehouse

| FEATURE | SUBFEATURE | OWNER | SOURCE | P | I | T | Int | Push | Dep | Host | Br | UA | BLOCKER |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Production | Product-based runs | Producción | os-production | Y | Y | Y | Y | — | — | U | — | — | hosted |
| Listo | FinishedGoodsReceipt model | Almacén | OsFinishedGoodsReceipt | Y | Y | Y | Y | — | — | — | — | — | migration unapplied |
| Listo | Receive writer | Almacén | warehouse.finished_goods.receive | Y | Y | Y | Y | — | — | U | — | — | hosted |
| Listo | Org-read reader | Gerencia | management.org.read | Y | Y | Y | Y | — | — | U | — | — | hosted |
| Listo | Allocate to Pedido | Almacén | allocation | Y | P | P | — | — | — | — | — | — | live writer gap / auth |
| Semantics | Receive ≠ allocate | Almacén | contracts/tests | Y | Y | Y | Y | — | — | U | — | — | none |
| Semantics | Missing port ≠ zero | Gerencia | reader | Y | Y | Y | Y | — | — | U | — | — | none |

## Delivery / Isa documents

| FEATURE | SUBFEATURE | OWNER | SOURCE | P | I | T | Int | Push | Dep | Host | Br | UA | BLOCKER |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Delivery | Salida ≠ Entrega | Almacén/Entrega | os-delivery | Y | Y | Y | Y | — | — | U | — | — | hosted |
| Delivery | Note after delivery only | Entrega | boundary | Y | Y | Y | Y | — | — | U | — | — | none |
| Delivery | externalDocumentNumber | Entrega | Carmen transcription 007189 | Y | Y | Y | Y | — | — | U | — | — | migration unapplied |
| Delivery | OS noteNumber generation | — | — | Y | — | — | — | — | — | — | — | — | D DOCUMENT_NUMBERING |
| Delivery | Customer ack evidence | Entrega | delivery_confirmation | Y | Y | Y | Y | — | — | U | — | — | no signature product |
| Delivery | Seller/transporter fields | Entrega | form labels | Y | — | — | — | — | — | — | — | — | MISSING_FIELD |
| Delivery | Unit price on note lines | Entrega | historical 305/330 | Y | — | — | — | — | — | — | — | — | MISSING_FIELD (must not PriceList) |
| Factory | Nota Entrega Fábrica write | — | transcription 002693 | Y | — | — | — | — | — | — | — | — | BUSINESS_ROLE_REQUIRES_MAPPING / D FACTORY_DELIVERY_NOTE_ROLE |

## Payments / finance

| FEATURE | SUBFEATURE | OWNER | SOURCE | P | I | T | Int | Push | Dep | Host | Br | UA | BLOCKER |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Payment | Operational reported fact | Caja | reported-operational-fact | Y | Y | Y | Y | — | — | U | — | — | hosted UI |
| Payment | Mixed tenders cash+QR | Caja | transcription 007472 | Y | Y | Y | Y | — | — | U | — | — | hosted UI |
| Payment | Ledger confirm from Caja | Contabilidad | boundary refusal | Y | Y | Y | Y | — | — | U | — | — | none (must stay refused) |
| Finance | Journal/tax | Contabilidad | ADR finance boundary | Y | — | — | — | — | — | — | — | — | out of V1 ledger scope |

## Coordination / governance

| FEATURE | SUBFEATURE | OWNER | SOURCE | P | I | T | Int | Push | Dep | Host | Br | UA | BLOCKER |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Coordination | Exception projection | Auxiliar | adapters | Y | Y | Y | Y | — | — | U | — | — | hosted |
| Coordination | Prior decision read | Auxiliar | — | Y | Y | — | — | — | — | — | — | — | X COORDINATION_READ_AUTHORITY |
| Caps | Quote/visit/location proposals | Governance | proposals only | Y | — | — | — | — | — | — | — | — | no invented scopes |

## Workforce / security

| FEATURE | SUBFEATURE | OWNER | SOURCE | P | I | T | Int | Push | Dep | Host | Br | UA | BLOCKER |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Workforce | Lifecycle mutations | Admin | Step 14 evidence | Y | Y | Y | Y | — | — | P | P | — | prior live evidence partial |
| Isolation | Delivery tenant isolation | Platform | isolation tests | Y | Y | Y | Y | — | — | U | — | — | hosted adversarial |
| Isolation | people.admin ≠ business mgr | Owner | admin boundary | Y | Y | Y | Y | — | — | U | — | — | hosted |

## Guided Mode / UI

| FEATURE | SUBFEATURE | OWNER | SOURCE | P | I | T | Int | Push | Dep | Host | Br | UA | BLOCKER |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Shell | Production shell | All | UI_0 evidence | Y | Y | Y | Y | — | — | P | P | — | prior |
| Guided | Honesty + 8 journeys | All | V1_ACCEPTANCE_MANIFEST | Y | — | — | — | — | — | — | — | — | Gate B/C + decisions |

---

## Roll-up

- PUSHED: no (this candidate local)  
- DEPLOYED / HOSTED / BROWSER-VERIFIED / USER-ACCEPTED for Isa document work: no  
- SAFE FOR ISA / ÁLVARO: NO  
- Do not say “feature passed” — score subfeatures only
