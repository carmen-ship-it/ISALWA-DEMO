# FINAL_V1_REQUIREMENTS_RECONCILIATION

**RC:** `02688431b9290b818c8fb245d68c086379363b3f`
**Method:** Source + prior hosted BV + unit negatives. Do not collapse to vague PASS.

## A01 — Carmen REAL↔SYNTH switching via Demo/Datos reales + company cookie
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | Owner-eval / OA-1 |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | owner-company-context maps demo→SYNTH; cookies DEMO_DATA_MODE + OWNER_EFFECTIVE_COMPANY; x-os-organization-id |
| FILES | apps/os-web/lib/demo/owner-company-context.ts; auth/actions.ts; os-api-client.ts; owner-demo-provider.tsx |
| ROUTES | /inicio, global shell |
| API | os-api org header |
| DATABASE / ENTITY | Membership multi-org |
| SEED / DATA DEPENDENCY | seeded SYNTH org 01M2JKF77TXMJNDTKNCYNHH9G5 |
| ROLES AFFECTED | Carmen owner |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | YES (BV demo context) |
| NEGATIVE SECURITY PROVEN? | PARTIAL (palette e2e UNPROVEN) |
| EVIDENCE FILE | carmen-owner-bv-results.json; CR1 gap |
| OPEN GAP | Palette cross-tenant hosted negative not re-run at RC |
| SEVERITY | P1 |

## A02 — REAL/SYNTH isolation / no cross-company leakage
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-1 |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | API session org scoping; PDF NOT_FOUND cross-tenant; conversation findMany by organizationId |
| FILES | tenant-isolation.test.ts; quote-pdf.http.test.ts; customer-conversations.controller.ts |
| ROUTES | PDF routes, conversations |
| API | GET/POST scoped |
| DATABASE / ENTITY | org FK on rows |
| SEED / DATA DEPENDENCY | N/A |
| ROLES AFFECTED | all |
| HOSTED AT RC SHA? | YES (code+prior) |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | YES (unit/API) |
| EVIDENCE FILE | CR1_CR5_CR6; quote-pdf.http.test |
| OPEN GAP | Hosted isolation script not re-executed this pass |
| SEVERITY | P1 |

## A03 — Membership resolution fail-closed
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-1 |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | canonical-request-session ambiguousWithoutSelector fail_closed; login probes REAL then SYNTH |
| FILES | packages/os-request-session; auth/actions.ts |
| ROUTES | /login |
| API | membership validate |
| DATABASE / ENTITY | os_memberships |
| SEED / DATA DEPENDENCY | Carmen SYNTH membership apply scripts |
| ROLES AFFECTED | Carmen |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | YES login BV |
| NEGATIVE SECURITY PROVEN? | N/A |
| EVIDENCE FILE | carmen-owner-bv-results login |
| OPEN GAP | — |
| SEVERITY | — |

## A04 — Resource-level authorization (not nav-only)
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-1/CR-2 |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | EvaluationProjection + commercial authority + desk allow-lists; some pages (inicio/aprobaciones/compromisos/incidencias) lack getEvaluationProjection |
| FILES | evaluation-*; commercial-authority; pages listed in explore |
| ROUTES | many commercial/ops pages |
| API | list* with visibility |
| DATABASE / ENTITY | SoR rows |
| SEED / DATA DEPENDENCY | demo seed |
| ROLES AFFECTED | View As + roles |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | YES unit A–J |
| EVIDENCE FILE | evaluation-history-filter.test.ts |
| OPEN GAP | Inicio/aprobaciones/compromisos/incidencias View As not wired |
| SEVERITY | P1 |

## B01 — Carmen broad V1 business-eval surface (no admin bypass)
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | Owner-eval clarification |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | OWNER_DEMO_SYNTH_FORBIDDEN_SCOPES strips people/master_data/qa/system.admin; management.org.read enables preview |
| FILES | staging-carmen-synth-demo-scopes.ts |
| ROUTES | full business nav |
| API | N/A |
| DATABASE / ENTITY | membership scopes |
| SEED / DATA DEPENDENCY | scope-correct fixtures |
| ROLES AFFECTED | Carmen SYNTH |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | YES |
| NEGATIVE SECURITY PROVEN? | YES admin denied BV |
| EVIDENCE FILE | carmen-owner-bv neg_administracion |
| OPEN GAP | Runtime DB scopes not re-probed this pass |
| SEVERITY | P2 |

## B02 — Owner actions attributed to Carmen
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | Owner-eval |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | Identity remains Carmen; View As does not swap auth |
| FILES | role-preview banner; BV checks |
| ROUTES | all |
| API | actorMemberId Carmen |
| DATABASE / ENTITY | events/audit actor |
| SEED / DATA DEPENDENCY | N/A |
| ROLES AFFECTED | Carmen |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | YES |
| NEGATIVE SECURITY PROVEN? | YES |
| EVIDENCE FILE | carmen-owner-bv authenticated_actor_* |
| OPEN GAP | — |
| SEVERITY | — |

## C01 — View As Asesor: nav+data+resource narrowing+mutations off+identity unchanged
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-2 / RC View As |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | Persona `Asesor` via cookie; presentation scopes; commercialListQueryFromProjection; evaluationBlocks*; mutation gate; identity Carmen |
| FILES | evaluation-projection.ts; presets.ts; mutation-gate; persona-cookie; evaluation-history-filter; evaluation-resource-access; subjectMemberId cookie; own visibility |
| ROUTES | clientes,cliente360,cotizaciones,oportunidades,conversaciones,trabajo,mapa,ops desks,auditoria,finanzas |
| API | list APIs narrowed where wired |
| DATABASE / ENTITY | N/A |
| SEED / DATA DEPENDENCY | demo data |
| ROLES AFFECTED | Carmen+persona |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | YES unit; hosted View As pack |
| EVIDENCE FILE | v1-rc-viewas-bv.json; role-preview.test.ts |
| OPEN GAP | Asesor subject picker UX hosted PASS partial |
| SEVERITY | P1 |

## C02 — View As Jefe Comercial: nav+data+resource narrowing+mutations off+identity unchanged
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-2 / RC View As |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | Persona `Jefe Comercial` via cookie; presentation scopes; commercialListQueryFromProjection; evaluationBlocks*; mutation gate; identity Carmen |
| FILES | evaluation-projection.ts; presets.ts; mutation-gate; persona-cookie; evaluation-history-filter; evaluation-resource-access; team visibility commercial lists |
| ROUTES | clientes,cliente360,cotizaciones,oportunidades,conversaciones,trabajo,mapa,ops desks,auditoria,finanzas |
| API | list APIs narrowed where wired |
| DATABASE / ENTITY | N/A |
| SEED / DATA DEPENDENCY | demo data |
| ROLES AFFECTED | Carmen+persona |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | YES unit; hosted View As pack |
| EVIDENCE FILE | v1-rc-viewas-bv.json; role-preview.test.ts |
| OPEN GAP | Inicio not projection-wired |
| SEVERITY | P1 |

## C03 — View As Gerencia: nav+data+resource narrowing+mutations off+identity unchanged
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-2 / RC View As |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | Persona `Gerencia` via cookie; presentation scopes; commercialListQueryFromProjection; evaluationBlocks*; mutation gate; identity Carmen |
| FILES | evaluation-projection.ts; presets.ts; mutation-gate; persona-cookie; evaluation-history-filter; evaluation-resource-access; org visibility |
| ROUTES | clientes,cliente360,cotizaciones,oportunidades,conversaciones,trabajo,mapa,ops desks,auditoria,finanzas |
| API | list APIs narrowed where wired |
| DATABASE / ENTITY | N/A |
| SEED / DATA DEPENDENCY | demo data |
| ROLES AFFECTED | Carmen+persona |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | YES unit; hosted View As pack |
| EVIDENCE FILE | v1-rc-viewas-bv.json; role-preview.test.ts |
| OPEN GAP | Inicio not projection-wired |
| SEVERITY | P1 |

## C04 — View As Producción: nav+data+resource narrowing+mutations off+identity unchanged
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-2 / RC View As |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | Persona `Producción` via cookie; presentation scopes; commercialListQueryFromProjection; evaluationBlocks*; mutation gate; identity Carmen |
| FILES | evaluation-projection.ts; presets.ts; mutation-gate; persona-cookie; evaluation-history-filter; evaluation-resource-access; desk allow-list; history filter strips quotes |
| ROUTES | clientes,cliente360,cotizaciones,oportunidades,conversaciones,trabajo,mapa,ops desks,auditoria,finanzas |
| API | list APIs narrowed where wired |
| DATABASE / ENTITY | N/A |
| SEED / DATA DEPENDENCY | demo data |
| ROLES AFFECTED | Carmen+persona |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | YES unit; hosted View As pack |
| EVIDENCE FILE | v1-rc-viewas-bv.json; role-preview.test.ts |
| OPEN GAP | — |
| SEVERITY | P1 |

## C05 — View As Almacén: nav+data+resource narrowing+mutations off+identity unchanged
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-2 / RC View As |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | Persona `Almacén` via cookie; presentation scopes; commercialListQueryFromProjection; evaluationBlocks*; mutation gate; identity Carmen |
| FILES | evaluation-projection.ts; presets.ts; mutation-gate; persona-cookie; evaluation-history-filter; evaluation-resource-access; desk + DN docs allowed |
| ROUTES | clientes,cliente360,cotizaciones,oportunidades,conversaciones,trabajo,mapa,ops desks,auditoria,finanzas |
| API | list APIs narrowed where wired |
| DATABASE / ENTITY | N/A |
| SEED / DATA DEPENDENCY | demo data |
| ROLES AFFECTED | Carmen+persona |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | YES unit; hosted View As pack |
| EVIDENCE FILE | v1-rc-viewas-bv.json; role-preview.test.ts |
| OPEN GAP | — |
| SEVERITY | P1 |

## C06 — View As Compras: nav+data+resource narrowing+mutations off+identity unchanged
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-2 / RC View As |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | Persona `Compras` via cookie; presentation scopes; commercialListQueryFromProjection; evaluationBlocks*; mutation gate; identity Carmen |
| FILES | evaluation-projection.ts; presets.ts; mutation-gate; persona-cookie; evaluation-history-filter; evaluation-resource-access; desk; strips party commercial evidence |
| ROUTES | clientes,cliente360,cotizaciones,oportunidades,conversaciones,trabajo,mapa,ops desks,auditoria,finanzas |
| API | list APIs narrowed where wired |
| DATABASE / ENTITY | N/A |
| SEED / DATA DEPENDENCY | demo data |
| ROLES AFFECTED | Carmen+persona |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | YES unit; hosted View As pack |
| EVIDENCE FILE | v1-rc-viewas-bv.json; role-preview.test.ts |
| OPEN GAP | — |
| SEVERITY | P1 |

## C07 — View As Coordinación/Entregas: nav+data+resource narrowing+mutations off+identity unchanged
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-2 / RC View As |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | Persona `Coordinación/Entregas` via cookie; presentation scopes; commercialListQueryFromProjection; evaluationBlocks*; mutation gate; identity Carmen |
| FILES | evaluation-projection.ts; presets.ts; mutation-gate; persona-cookie; evaluation-history-filter; evaluation-resource-access; entregas desk |
| ROUTES | clientes,cliente360,cotizaciones,oportunidades,conversaciones,trabajo,mapa,ops desks,auditoria,finanzas |
| API | list APIs narrowed where wired |
| DATABASE / ENTITY | N/A |
| SEED / DATA DEPENDENCY | demo data |
| ROLES AFFECTED | Carmen+persona |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | YES unit; hosted View As pack |
| EVIDENCE FILE | v1-rc-viewas-bv.json; role-preview.test.ts |
| OPEN GAP | — |
| SEVERITY | P1 |

## C08 — View As Finanzas: nav+data+resource narrowing+mutations off+identity unchanged
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-2 / RC View As |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | Persona `Finanzas` via cookie; presentation scopes; commercialListQueryFromProjection; evaluationBlocks*; mutation gate; identity Carmen |
| FILES | evaluation-projection.ts; presets.ts; mutation-gate; persona-cookie; evaluation-history-filter; evaluation-resource-access; finance desk gate |
| ROUTES | clientes,cliente360,cotizaciones,oportunidades,conversaciones,trabajo,mapa,ops desks,auditoria,finanzas |
| API | list APIs narrowed where wired |
| DATABASE / ENTITY | N/A |
| SEED / DATA DEPENDENCY | demo data |
| ROLES AFFECTED | Carmen+persona |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | YES unit; hosted View As pack |
| EVIDENCE FILE | v1-rc-viewas-bv.json; role-preview.test.ts |
| OPEN GAP | — |
| SEVERITY | P1 |

## D01 — One canonical commercial owner
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-3 |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | CommercialAccount.ownerMemberId |
| FILES | prisma-party-store; reassignCommercialAccountOwner |
| ROUTES | cliente360 / party |
| API | ReassignCommercialAccountOwner |
| DATABASE / ENTITY | CommercialAccount |
| SEED / DATA DEPENDENCY | demo parties owned |
| ROLES AFFECTED | Jefe/Gerencia/admin |
| HOSTED AT RC SHA? | YES code |
| BROWSER PROVEN? | UNPROVEN hosted reassignment |
| NEGATIVE SECURITY PROVEN? | YES unit |
| EVIDENCE FILE | commercial-authority.test.ts |
| OPEN GAP | Hosted reassignment BV not in RC pack |
| SEVERITY | P1 |

## D02 — Temporary coverage ≠ ownership / ≠ convert
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-3 |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | coverageAuditForConvert voids coverage for convert; coverage grants exist; NO GrantCustomerCoverage command/UI |
| FILES | commercial-authority.ts; operations-scopes; prisma coverage grants |
| ROUTES | admin continuity panels |
| API | CreateOrder |
| DATABASE / ENTITY | osCustomerCoverageGrant |
| SEED / DATA DEPENDENCY | staging continuity scripts |
| ROLES AFFECTED | Jefe/Gerencia intended |
| HOSTED AT RC SHA? | PARTIAL |
| BROWSER PROVEN? | NO |
| NEGATIVE SECURITY PROVEN? | YES unit deny coverage convert |
| EVIDENCE FILE | CR3_CR4 gap |
| OPEN GAP | No product grant/revoke coverage UI |
| SEVERITY | P0 |

## D03 — Permanent reassignment + history preserved
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-3 |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | ReassignCommercialAccountOwner + commercial_account.owner_reassigned event |
| FILES | commercial-command-service; timeline-labels; reassign-owner-form |
| ROUTES | party UI |
| API | command |
| DATABASE / ENTITY | events |
| SEED / DATA DEPENDENCY | N/A |
| ROLES AFFECTED | reassign scope |
| HOSTED AT RC SHA? | YES code |
| BROWSER PROVEN? | UNPROVEN |
| NEGATIVE SECURITY PROVEN? | YES |
| EVIDENCE FILE | events.ts |
| OPEN GAP | Hosted proof missing |
| SEVERITY | P1 |

## D04 — Asesor self-takeover blocked
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-3 |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | canReassign requires commercial.account.reassign (not plain asesor) |
| FILES | commercial-authority |
| ROUTES | — |
| API | — |
| DATABASE / ENTITY | — |
| SEED / DATA DEPENDENCY | — |
| ROLES AFFECTED | Asesor |
| HOSTED AT RC SHA? | YES code |
| BROWSER PROVEN? | UNPROVEN |
| NEGATIVE SECURITY PROVEN? | YES |
| EVIDENCE FILE | authority tests |
| OPEN GAP | — |
| SEVERITY | P2 |

## D05 — Cross-owner conversion blocked unless authorized
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-3 V1 convert.own |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | CreateOrder requires owner+convert.own OR commercial.order.convert; coverage≠convert |
| FILES | scopes.ts; commercial-authority; CreateOrder |
| ROUTES | quote→pedido |
| API | CreateOrder |
| DATABASE / ENTITY | Quote/Order |
| SEED / DATA DEPENDENCY | demo |
| ROLES AFFECTED | owner Asesor / convert scope |
| HOSTED AT RC SHA? | YES code |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | YES |
| EVIDENCE FILE | commercial-authority.test.ts |
| OPEN GAP | Hosted convert-as-other-asesor not in RC BV |
| SEVERITY | P1 |

## E01 — Commercial exception → named Jefe Comercial assignee
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-4 |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | RequestApproval requires approverMemberId same-org; no cargo auto-pick |
| FILES | work-command-service RequestApproval; commercial-approval-panel |
| ROUTES | /aprobaciones; quote |
| API | RequestApproval/DecideApproval |
| DATABASE / ENTITY | Approval work |
| SEED / DATA DEPENDENCY | demo pending Q-* |
| ROLES AFFECTED | Jefe with approval.act / price.approve |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL (pending items visible on Inicio) |
| NEGATIVE SECURITY PROVEN? | YES unit no auto-Pedido |
| EVIDENCE FILE | commercial-approval.test.ts |
| OPEN GAP | REAL staff not bound to Member |
| SEVERITY | P1 |

## E02 — No auto-Pedido on approval; explicit convert next
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-4 |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | decideApproval status only; post-approval-continue cues convert separately |
| FILES | post-approval-continue.ts; work-command-service |
| ROUTES | quote detail |
| API | DecideApproval |
| DATABASE / ENTITY | Approval |
| SEED / DATA DEPENDENCY | — |
| ROLES AFFECTED | approver then owner |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | YES |
| EVIDENCE FILE | post-approval-continue.test.ts |
| OPEN GAP | Full approve→convert hosted loop not in primary BV |
| SEVERITY | P1 |

## E03 — No automatic Gerencia escalation / no random Gerente
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-4 |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | Escalation view-only; no auto manager route; two Gerentes never auto-picked |
| FILES | APPROVAL_RESPONSIBILITY_ROUTING.md; work service |
| ROUTES | — |
| API | — |
| DATABASE / ENTITY | — |
| SEED / DATA DEPENDENCY | — |
| ROLES AFFECTED | Gerencia |
| HOSTED AT RC SHA? | YES code |
| BROWSER PROVEN? | UNPROVEN |
| NEGATIVE SECURITY PROVEN? | YES design |
| EVIDENCE FILE | CR3_CR4 |
| OPEN GAP | Which Gerente for which type = BUSINESS_DECISION |
| SEVERITY | P1 |

## F01 — Cliente→Opp→Quote→PDF→enviada→follow-up→accept→approval?→Convert→Pedido
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | OA-2 / commercial |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | Full command path exists; seed densifies Maderas through Pedido+DN; Story Mode 20 steps on normal routes |
| FILES | commercial actions; story-mode-steps (20); seeded-ids |
| ROUTES | /clientes/... cotizaciones/pedidos |
| API | commercial commands |
| DATABASE / ENTITY | Opportunity Quote Order |
| SEED / DATA DEPENDENCY | fixture:owner-demo |
| ROLES AFFECTED | commercial roles |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL (nav/PDF/cliente proven; full interactive loop not entire BV) |
| NEGATIVE SECURITY PROVEN? | PARTIAL |
| EVIDENCE FILE | seeded-ids; carmen BV; pf4 pdf test |
| OPEN GAP | End-to-end interactive convert on RC not scored PASS |
| SEVERITY | P1 |

## G01 — Pedido→ops review→Prod/Wh/Purch facts→DN→PDF→Salida→Entrega→Finance ops
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-5 / ops |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | Explicit order-prep Work; distinct Nota/Salida/Entrega facts; finance desk operational-only; progress strips parallel |
| FILES | order-prep-*; delivery-progress; finance-operational-desk; pedido-lifecycle |
| ROUTES | /produccion /almacen /compras /entregas /finanzas; pedido page |
| API | delivery/warehouse commands |
| DATABASE / ENTITY | DN Exit Delivery FG receipt |
| SEED / DATA DEPENDENCY | Maderas seed has DN+FG |
| ROLES AFFECTED | ops roles |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | PARTIAL |
| EVIDENCE FILE | CR5 gap; seeded-ids Maderas |
| OPEN GAP | Pedido lifecycle uses Preparación vs Nota naming split; specialist depth FUTURE |
| SEVERITY | P1 |

## H01 — Work/Attention + who-has-the-ball + Inicio Mío/Equipo/Empresa
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | OA-3 / CR |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | Work lists; who-has-the-ball component; Inicio lenses; View As on /trabajo |
| FILES | who-has-the-ball*; trabajo/page; inicio |
| ROUTES | /trabajo /inicio |
| API | work APIs |
| DATABASE / ENTITY | WorkItem |
| SEED / DATA DEPENDENCY | seed follow-up/prep work Maderas |
| ROLES AFFECTED | all |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | PARTIAL |
| EVIDENCE FILE | carmen BV nav_trabajo |
| OPEN GAP | Inicio lacks EvaluationProjection; attention counts can be 0 while approvals list shows items (lens inconsistency UNPROVEN root) |
| SEVERITY | P1 |

## I01 — 5 durable DB conversations (not JSON SoT)
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | OA-4 / RC seed |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | OsCustomerConversation rows; UI prefers listCustomerConversations; JSON fallback only if empty |
| FILES | seed.ts; conversaciones/page.tsx; customer-conversations.controller |
| ROUTES | /conversaciones |
| API | listCustomerConversations |
| DATABASE / ENTITY | os_customer_conversations |
| SEED / DATA DEPENDENCY | fixture:owner-demo 5 rows |
| ROLES AFFECTED | commercial |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | YES |
| NEGATIVE SECURITY PROVEN? | YES org isolation test |
| EVIDENCE FILE | seeded-ids; carmen BV durableMarkers |
| OPEN GAP | WhatsApp provider not live (by design) |
| SEVERITY | — |

## J01 — Six true tabs one panel; role projection inside
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CT3-A / CR-7 |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | tabs resumen|comercial|operacion|trabajo|documentos|historial; evaluation on cliente360 page |
| FILES | nav-sections.ts; cliente/[partyId]/page.tsx |
| ROUTES | /clientes/[id]?tab= |
| API | party reads |
| DATABASE / ENTITY | Party |
| SEED / DATA DEPENDENCY | demo parties |
| ROLES AFFECTED | role-dependent |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | YES tabs/nav |
| NEGATIVE SECURITY PROVEN? | PARTIAL |
| EVIDENCE FILE | carmen BV cliente360 |
| OPEN GAP | URL fail-closed tab matrix not fully tested |
| SEVERITY | P2 |

## K01 — Shared factual progress; Approval≠Pedido; Nota≠Salida≠Entrega
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-5 |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | process-steps + indicator; commercial/delivery strips; no auto invent %; parallel strip UIs remain |
| FILES | process-steps.ts; *-progress-strip; pedido-lifecycle |
| ROUTES | quote/pedido/map/entregas |
| API | N/A |
| DATABASE / ENTITY | facts on records |
| SEED / DATA DEPENDENCY | seed |
| ROLES AFFECTED | authorized viewers |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | N/A |
| EVIDENCE FILE | CR5; process-steps |
| OPEN GAP | Shared single strip not universal; Preparación≠Nota vocabulary |
| SEVERITY | P2 |

## L01 — Search auth-filtered + View As + cross-company fail-closed
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-1/CR-2 |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | command-search uses org auth client; View As not fully applied to palette |
| FILES | command-search.ts; parties search |
| ROUTES | ⌘K |
| API | searchParties |
| DATABASE / ENTITY | Party |
| SEED / DATA DEPENDENCY | — |
| ROLES AFFECTED | all |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | UNPROVEN |
| NEGATIVE SECURITY PROVEN? | PARTIAL API adversarial |
| EVIDENCE FILE | CR1 |
| OPEN GAP | No dedicated View As search hosted negative |
| SEVERITY | P1 |

## M01 — Map role-filtered; REAL confirmed-only; Demo synthetic; no Revenue
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CT3-G / CR-7 |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | filterByDemoDataMode; confirmed coords only; commercial-lens no revenue; View As on mapa page |
| FILES | mapa/page; commercial-lens; build-view-model |
| ROUTES | /mapa |
| API | party locations |
| DATABASE / ENTITY | locations |
| SEED / DATA DEPENDENCY | demo coords SYNTH |
| ROLES AFFECTED | commercial View As |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | YES nav_mapa |
| NEGATIVE SECURITY PROVEN? | PARTIAL |
| EVIDENCE FILE | carmen BV; commercial-lens.test |
| OPEN GAP | Asesor own-filter depth vs coverage UNPROVEN hosted |
| SEVERITY | P2 |

## N01 — Gerencia factual metrics only (no revenue/profit/rankings)
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CT3-G |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | org-metrics allow-list; never revenue labels |
| FILES | org-metrics.ts; management-org-metrics.tsx |
| ROUTES | /inicio?lente=gerencia |
| API | — |
| DATABASE / ENTITY | aggregates |
| SEED / DATA DEPENDENCY | demo |
| ROLES AFFECTED | Gerencia/Carmen |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL (page loads; cue weak) |
| NEGATIVE SECURITY PROVEN? | N/A |
| EVIDENCE FILE | carmen BV nav_gerencia; org-metrics.test |
| OPEN GAP | — |
| SEVERITY | P2 |

## O01 — Finance operational context only (not ledger)
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | Finance desk |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | finance-operational-desk copy + gate |
| FILES | finance-operational-desk.tsx; finanzas/page |
| ROUTES | /finanzas |
| API | — |
| DATABASE / ENTITY | reported evidence |
| SEED / DATA DEPENDENCY | — |
| ROLES AFFECTED | Finanzas/Carmen |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | YES nav |
| NEGATIVE SECURITY PROVEN? | N/A |
| EVIDENCE FILE | carmen BV nav_finanzas |
| OPEN GAP | No accounting integration (FUTURE) |
| SEVERITY | — |

## P01 — Quote/DN PDF same implementation Demo/Real; URL auth
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | PF-4 |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | same /api/quotes|delivery-notes/.../pdf; cross-tenant NOT_FOUND |
| FILES | pdf routes; pf4-pdf-same-implementation.test; quote-pdf.http.test |
| ROUTES | /api/.../pdf |
| API | PDF GET |
| DATABASE / ENTITY | documents |
| SEED / DATA DEPENDENCY | seeded IDs |
| ROLES AFFECTED | authorized |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL |
| NEGATIVE SECURITY PROVEN? | YES |
| EVIDENCE FILE | pf4 test; quote-pdf.http |
| OPEN GAP | Owner BV did not re-download PDF bytes this pack |
| SEVERITY | P2 |

## Q01 — History/Audit meaningful changes; View As filter; no backdoor
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-8 / RC |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | auditoria page filterAuditItemsForProjection; historial timeline filter; management.org.read gate |
| FILES | auditoria/page; evaluation-history-filter; cliente historial |
| ROUTES | /auditoria; ?tab=historial |
| API | listAudit |
| DATABASE / ENTITY | BusinessEvent/Audit |
| SEED / DATA DEPENDENCY | events from seed |
| ROLES AFFECTED | roles+View As |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | YES owner historial/auditoria recheck |
| NEGATIVE SECURITY PROVEN? | YES A–J unit |
| EVIDENCE FILE | evaluation-history-filter.test; v1-rc-bv-recheck |
| OPEN GAP | Hosted unauthorized-asesor audit matrix not full interactive |
| SEVERITY | P1 |

## R01 — Story Mode 20 steps normal routes Demo context
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | OA-5 |
| IMPLEMENTED | YES |
| EXACT_IMPLEMENTATION | STORY_MODE_STEPS length 20; storyHref wrappers; seeded IDs |
| FILES | story-mode-steps.ts; owner-demo.test.ts |
| ROUTES | story CTAs → product routes |
| API | — |
| DATABASE / ENTITY | seed IDs |
| SEED / DATA DEPENDENCY | seeded-ids.json |
| ROLES AFFECTED | Carmen |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL (button present) |
| NEGATIVE SECURITY PROVEN? | N/A |
| EVIDENCE FILE | story-mode-steps 20; Ver recorrido |
| OPEN GAP | Full 20-step hosted walk not re-run at RC |
| SEVERITY | P2 |

## S01 — Visual system porcelain/navy/teal/status/hierarchy/tabs/progress/mobile
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CT3 visual / CR visual |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | Design tokens + CT3 visual work; screenshots captured at RC |
| FILES | tokens.css; cliente360; who-has-the-ball; process-step-indicator |
| ROUTES | listed screens |
| API | N/A |
| DATABASE / ENTITY | N/A |
| SEED / DATA DEPENDENCY | N/A |
| ROLES AFFECTED | all |
| HOSTED AT RC SHA? | YES |
| BROWSER PROVEN? | PARTIAL screenshots |
| NEGATIVE SECURITY PROVEN? | N/A |
| EVIDENCE FILE | FINAL_V1_VISUAL_ACCEPTANCE.md; screenshots/ |
| OPEN GAP | Formal mobile matrix + color computed CSS not fully re-proven at RC |
| SEVERITY | P2 |

## T01 — AI/Jarvis tenant+resource filter; mutation deny; hosted interactive
| Field | Value |
|---|---|
| SOURCE_PROMPT / DECISION | CR-6 |
| IMPLEMENTED | PARTIAL |
| EXACT_IMPLEMENTATION | assist gateway org+resource; mutation features denied; hosted Ask UNPROVEN |
| FILES | ai.controller; ai-features; hosted-state; ai-assist-panel |
| ROUTES | assist UI |
| API | /v1/ai assist |
| DATABASE / ENTITY | evidence packet |
| SEED / DATA DEPENDENCY | N/A |
| ROLES AFFECTED | authorized |
| HOSTED AT RC SHA? | PARTIAL env |
| BROWSER PROVEN? | NO interactive PASS |
| NEGATIVE SECURITY PROVEN? | YES unit hidden evidence |
| EVIDENCE FILE | CR6; hosted-state.ts |
| OPEN GAP | AI_OWNER_REVIEW_READY=NO |
| SEVERITY | P0 |

---

## Architecture coverage map (sections A–T)

See REQ rows A*–T* above. Detailed role matrix / cascades / demo graph in sibling files.
