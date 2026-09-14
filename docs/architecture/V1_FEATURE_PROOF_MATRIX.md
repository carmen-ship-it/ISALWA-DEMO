# V1 Feature Proof Matrix — ISALWA OS

Honest states only. Never collapse PLANNED → USER-ACCEPTED.

**Exact candidate SHA (deployed):** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
Worktree tip may be docs-ahead of deploy; **hosted proof bound to `ef7eeab` only**.  
Integration pin remains: `316426f272bce29924ffd4991da88ffe7d421bbd` (not moved).

Prior build proofs are **not** silently inherited — re-prove on ending tip / live SHA.

Legend cells: Y = yes for that state · — = no · P = partial · U = UNPROVEN · G = FOUNDATION_GAP · D = BUSINESS_DECISION_REQUIRED · X = CROSS_LANE · H = HOLD

Columns: FEATURE · SUBFEATURE · OWNER ROLE · SOURCE OF TRUTH · PLANNED · IMPLEMENTED · TESTED · INTEGRATED · PUSHED · DEPLOYED · HOSTED · BROWSER-VERIFIED · USER-ACCEPTED · BLOCKER

Extra where useful: LOCAL_FUNCTION · AUTH_PATH_LOCAL · LOCAL_HTTP

---

## Release / staging prep

| FEATURE | SUBFEATURE | OWNER | SOURCE | P | I | T | Int | Push | Dep | Host | Br | UA | BLOCKER |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Clean build | pnpm -r + web/api/os-api/catalog + prisma validate | Platform | ef7eeab local pilot | Y | Y | Y | Y | — | Y | Y | — | — | Bound to ef7eeab deploy |
| Gate C migrate | staging `_prisma_migrations`=29 | Platform | WAVE2_GATE_C_EVIDENCE_RESULT | Y | Y | Y | Y | — | Y | Y | — | — | MIGRATED_AND_VERIFIED; count not re-queried this pass |
| Staging deploy pass | exact SHA ef7eeab | Platform | WAVE2_STAGING_DEPLOY_SMOKE_EF7EEAB | Y | Y | Y | Y | — | Y | Y | — | — | API+web live; Auto-Deploy expected OFF |
| Synthetic role fixtures | 9 V1 roles + synthetic tenant | Platform | staging-wave2-role-fixtures.ts | Y | Y | — | — | — | — | — | — | — | CREDENTIAL_BLOCKED / DB IP allowlist |
| Hosted acceptance gauntlet | role homes + journeys A–I | Platform | WAVE2_HOSTED_ACCEPTANCE_RESUME_EF7EEAB | Y | — | — | — | — | Y | Y | — | — | Blocked on fixtures; Carmen browser PARTIAL |
| Payment | Mixed tenders 1070+200 | Caja | reported-operational-fact | Y | Y | Y | Y | — | — | U | — | — | hosted UI |
| Governance | Quote/visit/location/coordination proposals | Carmen | WAVE2_STAGING_GOVERNANCE_PROPOSALS | Y | — | — | — | — | — | — | — | — | proposal only |
| Quote convert | owner OR coverage OR order.convert | Comercial | QUOTE_CONVERSION_AUTHORITY_DECISION | Y | Y | Y | Y | — | — | — | — | — | coverage migration unapplied |
| convert.own | DEPRECATE_LATER unwired | Carmen | commercial-authority | Y | Y | Y | Y | — | — | — | — | — | own-quote only |
| Production | entry/quema/loss/consumption prisma_port | Producción | os-production | Y | Y | Y | Y | — | — | — | — | — | migration unapplied |
| Allocation | allocate prisma_port | Almacén | os-allocation | Y | Y | Y | Y | — | — | — | — | — | migration unapplied |
| Delivery | customer delivery prisma_port | Entrega | os-delivery | Y | Y | Y | Y | — | — | — | — | — | migration unapplied |
| Warehouse exit | outbound prisma_port | Almacén | warehouse.outbound.record | Y | Y | Y | Y | — | — | — | — | — | migration unapplied |
| Coordination write | decision.record prisma_port | Auxiliar | os-coordination-read | Y | Y | Y | Y | — | — | — | — | — | read P1 visible limit |
| Warehouse selectors | SearchableSelect on allocate | Almacén | warehouse-desk | Y | Y | Y | Y | — | — | — | — | — | server search when live load grows |
| Payment evidence | reported fact prisma_port | Caja | reported-operational-fact-writer | Y | Y | Y | Y | — | — | U | — | — | hosted UI |
| Purchase transition | status workflow | Compras | Gate C migrate applied empty | Y | Y | — | Y | — | — | — | — | — | Schema migrated; HOSTED/BROWSER still unproven |
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
| Listo | Allocate to Pedido | Almacén | warehouse.finished_goods.allocate | Y | Y | Y | Y | — | — | — | — | — | migration unapplied |
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
| Guided | Honesty + 8 journeys | All | WAVE2_HOSTED_ACCEPTANCE_RESUME_EF7EEAB | Y | Y | — | Y | — | Y | Y | P | — | Replay/dismiss/Continuar PASS; 9-role + full journeys BLOCKED |

---

## Roll-up

- PUSHED: deploy candidate `ef7eeab` is live on staging (API+web)  
- MIGRATED: YES (29) · DEPLOYED: YES · HOSTED: YES · BROWSER-VERIFIED: **NO** · USER-ACCEPTED: **NO**  
- SAFE FOR ISA / ÁLVARO: **NO** — synthetic fixtures + 9-role gauntlet incomplete  
- Do not say “feature passed” — score subfeatures only  
- Evidence: `docs/architecture/WAVE2_HOSTED_ACCEPTANCE_RESUME_EF7EEAB.md`
