# Commercial journey reconciliation — 2026-11-18

Documentation + evidence only. No product, data, role, env, or deployment changes in this task.

**Phase 0 audit note (same day):** T04 independent-review provenance corrected (external PASS WITH FOLLOW-UPS; formal repo receipt absent). Recorrido availability labels **not** changed. Hosted product tip remains `904cf24a…` while docs tip advances on `ct3/v1-repairs`.

## Phase A — Source and deployment pinning

| Field | Value |
|---|---|
| Integrator worktree | `/Users/carmen/projects/isalwa-wt-v1-repairs` |
| Branch | `ct3/v1-repairs` |
| Phase 0 docs commit | `9823b85ac541df40c96ed65e6ab70b8d59055907` (from reconciliation `8951b5e8…`; branch tip may include later docs-only pin refreshes) |
| Hosted product source (unchanged) | `904cf24a7acd40ad4278a229e9f9fc8fc5d9f781` |
| Hosted product tree | `8befbec21f33da631b24d239cf0a74de7038e8ca` |
| Index lock / other writer | none observed at Phase 0 start |
| Unrelated dirty (preserved) | `.cursor/settings.json`, `.tmp/`, `apps/os-api/.tmp-stage-a/`, `docs/operations/commercial-release/evidence/**`, `isalwa-transfer-readiness/` |
| Hosted web | https://isalwa-os-web-evaluation.vercel.app |
| Production deployment | `dpl_E8wQPK77NNw3siDnyCXZVudfdL8S` (READY; alias production; rechecked 2026-11-18) |
| Approved deployed source | tip `904cf24a…` (allowlisted export `isalwa-transfer-readiness/deploy/904cf24a-evaluation`) |
| Architecture | Vercel web → Railway API/workers `/v1` → Supabase evaluation DB + Auth |
| Railway API | `isalwa-os-api-evaluation-production.up.railway.app/v1` — health HTTP 200 liveness rechecked 2026-11-18 |
| DB connectivity | Supabase session pooler `aws-1-sa-east-1.pooler.supabase.com:5432` (direct `db.*` IPv6-only) |
| Railway spend | Hobby; **$5 soft alert only**; no hard cutoff; no added paid resources |
| Mac API / Cloudflare tunnel | **stopped**; not required for hosted evaluation |
| Evaluation label | TEMPORARY HOSTED EVALUATION — NOT DURABLE / NOT LAUNCH READY |
| Tenant | dedicated `isalwa-eval-demo-v1` only; never restore global `datos=demo` |
| T04 review provenance | External **PASS WITH FOLLOW-UPS**; formal `REVIEW-T04-QUOTES.md` absent — `receipts/T04-INDEPENDENT-REVIEW-PROVENANCE.md` |

Authority for Journey titles/status copy: `apps/os-web/lib/journey/story-steps.ts`. Product contracts: `docs/product/COMMERCIAL_RELEASE_V2.md`, A1, A2. Authority matrix: `REUSE_MAP.md` §12–§13. Hosted fixture/cutover: `receipts/EVALUATION-FIXTURE-SEED.md`, `EVALUATION-PROMOTE-904cf24a-VERCEL.md`, `EVALUATION-RAILWAY-CUTOVER-904cf24a.md`.

Classification rules used below: **implemented ≠ hosted ≠ verified create path**. Fixture visibility ≠ full create/refuse/authority proof. Manual conversation ≠ WhatsApp send. Coordinate ≠ Mapbox. Payment report ≠ bank confirmation.

---

## Phase B — Evidence-based 20-step reconciliation

| Journey step | Real-world trigger | Primary role(s) | Must see/do | Persisted outcome / handoff | Source state | Hosted state | Evidence | Authority / tenant | Honest limitation (evaluator) | Missing dependency | Next acceptance test | Next owner |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1. Empieza con lo que requiere atención** | Start of day / return to work | Asesor; Gerencia (scoped) | Open Hoy; open a pending item without re-search | Deep link to exact resource; filters preserved | **implemented** | **hosted and verified** (read/shell) | Routes `/inicio`; V2 §5.1; Recorrido step 1 `available`; promote verify PASS; railway cutover verify-2 PASS (inicio populated EVALUACIÓN) | Membership + commercial/read scopes; tenant `isalwa-eval-demo-v1` | Some Hoy subsections may show empty/error honestly; not a claim of all queues | Full team/empresa sections need broader grants | Shared seat: login → `/inicio` shows fixture attention/commercial cards; denied scopes show honest empty | integrator (keep stable); Isa/Álvaro inspect |
| **2. Atiende una conversación o registra una atención** | WhatsApp/call/visit/manual note | Asesor | List/filter conversations; open thread; save manual attention / internal note | `OsCustomerConversation` + attention state; no provider send | **partial** (manual path local+hosted fixture; inbound/provider not) | **hosted partial** | `/conversaciones`; Batch 5/5B receipts; fixture 4 conversations with exact “sin conexión a Meta/WhatsApp”; Recorrido `partial` + WhatsApp external | Account/coverage/tenant; claim rules | Mensaje send disabled / not Meta; examples are evaluation-only | Meta/WABA; release/reassign; inbound reopen | Open conversaciones; confirm Meta disclaimer; register manual attention if UI allows for seat | integrator; Carmen Meta decision; external provider later |
| **3. Busca o registra al cliente** | New inquiry / unknown party | Asesor | Search before create; register with bounded fields; shared-phone review without auto-merge | Party/contact/account; owner = actor when advisor | **implemented** (T03 + Batch 2) | **hosted partial** (list/search/fixture yes; full create path not proven on shared seat this pin) | `/clientes`, `/clientes/nuevo`; ACCEPTANCE-LANE-B-T03; BATCH-2-CUSTOMER-ENTRY; fixture 4 EVALUACIÓN customers | `commercial.customer.create` / edit; resource authority | Shared seat has create scope; hosted proof emphasized fixture visibility, not every create refusal case | None for foundation | Hosted: search EVALUACIÓN; create synthetic customer if authorized; outsider 404 | integrator / independent reviewer for create path |
| **4. Consulta Cliente 360** | Need full customer context | Asesor; Gerencia | Tabs Resumen/Comercial/…; owner; coverage; history | Read models only; no silent ownership change | **implemented** | **hosted partial** (list/contexts verified on promote/cutover; Cliente 360 open not recorded in those hosted receipts) | Cliente 360 pages in source; ACCEPTANCE-LANE-B (local); promote/cutover `/clientes` list PASS; availability matrix notes 360 path | Resource-scoped reads | Hosted 360 tab navigation not separately receipted on tip `904cf24a`; do not upgrade to live-journey verified without that proof | — | Open one EVALUACIÓN customer 360; confirm owner + commercial links; deposit hosted evidence | Isa/Álvaro (inspect); integrator (evidence) |
| **5. Corrige datos con trazabilidad** | Wrong name/address/etc. | Asesor autorizado; steward for legal name | Edit with motive; see before/after history; issued docs unchanged | Events/audit; version conflict | **implemented** | **hosted partial** (UI present; fixture may include correction; full matrix local) | T03-EDIT-REASON-HISTORY; ACCEPTANCE legal-name/history flows | `commercial.customer.edit`; `master_data.admin` for legal name | Documents already issued keep original data | — | Edit a non-sensitive field with motive; reload history | independent reviewer spot-check hosted |
| **6. Gestiona teléfonos y contactos** | Number change / leave company | Asesor autorizado; steward | Update/retire phone; end relation without deleting person; justified reveal | Endpoint history; relation end; cancel unsent intents when provider exists | **implemented** | **hosted partial** | T03-CONTACT-PHONE; L1 relation end; C6 endpoint history; fixture contacts | customer.edit; reveal justification | Pending WhatsApp sends not applicable until Meta | WhatsApp for pending-send cancel | Phone update + relation end on synthetic contact | integrator |
| **7. Da apoyo temporal sin cambiar al responsable** | Absence / help needed | Gerencia autorizada (grantor) | Grant ≤30d bounded actions; revoke; owner unchanged | `OsCustomerCoverageGrant` | **implemented** | **hosted partial** (fixture 1 active coverage; grant UI local-proven) | T03 coverage receipts; ACCEPTANCE coverage grant/revoke; fixture `coverageGrantsActive=1` | `commercial.account.reassign` + reach scopes | Coverage ≠ ownership; convert needs explicit quote.convert | — | View coverage on fixture; grant/revoke only if seat has grantor scopes | Carmen/Isa for who grants in live |
| **8. Mantén el cliente al día** | Follow-up preference / archive | Asesor; Gerencia | Follow-up prefs; correction requests; archive/reactivate with obligation checks | Preferences; issues; party status | **partial** | **hosted partial** | T03 L2/L3/L4; archive refusal with open obligations (local); fixture commitments/payments affect archive rules | edit / issue.manage / archive scopes | Archive obligation automation incomplete without all modules linked | Payments/orders/commitments completeness | Try archive with open commitment → must block or list obligations | integrator |
| **9. Consulta el catálogo de productos** | Need product/price | Asesor | Browse published catalog; Precio por confirmar when no basis | No invented SKU/price | **proposal-only** / lane blocked | **not hosted** as approved catalog | Recorrido `proposal`; BATCH-4-CATALOG-BLOCKED; availability matrix catalog lane | browse scopes | Shell `/productos` may show honest empty/pending — not approved PDF | **Approved catalog PDF + price matrix** (ISALWA decision #3) | Do not treat empty catalog as failure; record missing PDF | Carmen / Isa / Álvaro supply PDF |
| **10. Organiza la oportunidad y el próximo paso** | Qualified interest | Asesor | Create/advance opportunity; next step + date | `OsOpportunity` | **implemented** | **hosted partial** (fixture 4 opportunities visible) | `/oportunidades`; fixture seed; Recorrido still marks **proposal** (copy lag — see conflicts) | commercial work scopes | Fixture shows stages; full stage-machine hosted create not fully journey-proven | — | Open oportunidades; open one EVALUACIÓN opportunity | Isa/Álvaro (visibility); integrator (create path) |
| **11. Prepara la cotización** | Need formal offer | Asesor | Draft lines; contexts Showroom/>10/Segunda/Viajes; save draft | `OsQuote` draft + lines | **implemented** locally | **hosted partial** (fixture drafts visible; free-text symbolic prices) | BATCH-3-T04; fixture drafts; lines “no es precio de catálogo” | quote create/edit | Recorrido says not enabled — **conflict** with fixture visibility | Catalog/price policy for real prices | Open cotizaciones borrador; do not treat symbolic BOB as catalog | Carmen price policy |
| **12. Solicita la aprobación necesaria** | Price/discount exception | Asesor + aprobador | Request approval bound to revision; no self-approve | `OsApprovalRequest` | **implemented** (synthetic) | **hosted partial** (fixture pending/approved; synthetic Jefatura) | T04; fixture approvals; shared seat has **no** `commercial.price.approve` | `commercial.price.approve` + range (range open) | **Named real holders + thresholds undecided** | ISALWA decisions #1–#2 | Confirm shared seat cannot decide approvals; synthetic jefe only in fixture | Carmen / Isa / Álvaro |
| **13. Emite el documento exacto** | Terms ready + approval if required | Asesor | Issue → Emitida; PDF hash; issue ≠ send | submitted/issued fields + hash | **implemented** | **hosted partial** (Emitida fixture + label PASS on promote) | formatQuoteStatus Emitida; BATCH-3B PDF hash pin; promote verify Emitida | convert/issue permissions | PDF public issuer data incomplete; blob store open | Issuer public data (decision) | Open submitted quote; label Emitida not Enviada; download if allowed | independent reviewer |
| **14. Comparte la cotización y registra la aceptación** | Send / customer yes | Asesor | Manual send record; acceptance with version/evidence | manual send event; acceptance; **not** Meta delivery | **partial** | **hosted partial** (fixture accepted→order; no WhatsApp) | RecordQuoteManualSend; RecordQuoteCustomerAcceptance; Recorrido `external` | ownership/coverage | Delivery/read ≠ acceptance; no Meta | Corporate WhatsApp model (decision #4) + Meta | Register acceptance on synthetic quote only; never claim WhatsApp | Carmen WhatsApp model |
| **15. Crea el pedido de forma explícita** | After valid acceptance | Asesor autorizado | Explicit Crear pedido; unique order/quote | `OsOrder` | **implemented** | **hosted partial** (fixture 1 order) | CreateOrder rules; fixture orders=1 | `commercial.quote.convert.own` / convert coverage | Cancel authority + team convert undecided | Decision #6 | Open pedidos; confirm order does not claim dispatch | Carmen |
| **16. Reporta y verifica pagos** | Customer says paid | Asesor; Contabilidad | Report tenders; Contabilidad confirm/reject | payment report ≠ confirmed funds | **implemented** report path | **hosted partial** (1 pending report; no confirm on shared seat) | BATCH-6; fixture payment report; seat has `payments.report` not confirm | payments.report / confirm | No bank truth; no published payment instructions | Decision #5; Contabilidad roster; instructions publish | View finanzas report if visible; confirm still pending | Carmen / Contabilidad owner |
| **17. Cumple compromisos y resuelve problemas** | Promise / incident | Asesor; responsable | Create/reschedule/complete commitments; issues | commitments/issues | **partial** (engine gaps) | **hosted partial** (fixture 2 commitments on inicio) | BATCH-7; fixture commitments; Recorrido proposal lag | responsible member | No 48h engine/scheduler/sound | Decision #8 hours/escalation | Open compromisos; complete one synthetic | integrator |
| **18. El equipo continúa sin perder contexto** | Handover / absence | Asesor; Gerencia | Coverage + history + queues | grants; reassignment queues | **partial** | **hosted partial** | Coverage + history (T03); suspension queues partial | reassignment reach scopes | Full absence queue incomplete | — | View coverage + history actors preserved | Isa/Álvaro |
| **19. Revisa clientes y seguimiento en el mapa** | Geographic follow-up | Gerencia; asesor | Confirmed pins only; pending list honest | locations | **partial** (coords yes; Mapbox no) | **hosted partial** / honest empty canvas | `/mapa`; fixture 4 coords; no Mapbox token; Recorrido proposal | customer read | Coordinate ≠ confirmed map product; no Mapbox claim | Decision #7 GPS policy + Mapbox provider | Open mapa; expect pending/honest empty canvas | Carmen GPS + provider |
| **20. Conecta WhatsApp e IA con control humano** | Channel/AI activation | Config autorizada | See Not connected; human control | no real sends | **external dependency** / not started adapters | **not hosted** (honesty only) | Batch 9; Recorrido `external`; conversaciones Meta disclaimer | integrations.manage future | Never infer Meta/AI live | Decision #8 + Meta + budget | Confirm UI shows disconnected; no send | Carmen / external |

### 20-step status summary (compact)

| # | Source | Hosted |
| ---: | --- | --- |
| 1 | implemented | hosted and verified (read) |
| 2 | partial | hosted partial |
| 3 | implemented | hosted partial |
| 4 | implemented | hosted partial (list verified; 360 open not in promote/cutover receipts) |
| 5–7 | implemented | hosted partial |
| 8 | partial | hosted partial |
| 9 | proposal-only / blocked | not hosted (approved catalog) |
| 10–11 | implemented | hosted partial (fixture) |
| 12–16 | implemented (synth limits) | hosted partial (fixture) |
| 17–18 | partial | hosted partial |
| 19 | partial | hosted partial (honest map) |
| 20 | external / not started | unproven as connected |

---

## Phase C — End-to-end acceptance chains

### A. Conversation/attention → customer → owner → next action

| Link | State |
|---|---|
| Manual attention / fixture conversations | **working in hosted evaluation** (visibility + disclaimer) |
| Find/create customer | **implemented locally**; **hosted partial** (search/fixture; create not fully journey-proven) |
| Assigned owner | **working** on fixture accounts |
| Next action from chat (prepare quote, etc.) | **implemented locally**; **hosted partial** |
| Real WhatsApp inbound claim | **blocked by external provider** + decision #4/#8 |

**First missing link for live journey:** Meta-connected inbound (or accepted long-term manual-only policy).

### B. Correction/phone → history → masked/revealed

| Link | State |
|---|---|
| Edit + motive + history | **implemented**; local browser ACCEPTANCE; hosted UI present |
| Phone update / relation end / justified reveal | **implemented**; local ACCEPTANCE |
| Hosted full refusal matrix | **unproven** end-to-end on production URL with all synthetic roles |

**First missing link:** hosted multi-role refusal proof on Railway pin (not just fixture read).

### C. Temporary coverage → revoke → owner accountable

| Link | State |
|---|---|
| Grant/revoke ≤30d | **implemented** + local ACCEPTANCE |
| Fixture active coverage | **hosted** visibility |
| Hosted grantor journey on shared seat | **not** (shared seat lacks reassignment grantor scopes) |

**First missing link:** hosted proof with a grantor seat (not shared reviewer).

### D. Opportunity → quote → approval → issue → send/accept

| Link | State |
|---|---|
| Opportunity/quote/order commands | **implemented locally** (T04) |
| Fixture draft/pending/issued/accepted | **hosted** visibility |
| Emitida wording | **hosted and verified** (promote PASS) |
| Named real `commercial.price.approve` holders + thresholds | **blocked by business decision** #1–#2 |
| WhatsApp send of PDF | **blocked by external provider** + #4 |
| Independent review of T04 lifecycle | **PASS WITH FOLLOW-UPS (external)**; formal repo receipt `REVIEW-T04-QUOTES.md` **absent** — do not treat as “not started.” Packet `REVIEW-PACKET-T04-QUOTES.md` still shows stale “NOT STARTED” and older freeze `5e7131cc`; product pin is `904cf24a` |

**First missing link for activation:** ISALWA named approvers + thresholds (catalog/prices also block “real” quotes).

### E. Accepted quote → order → payment report → confirm → delivery

| Link | State |
|---|---|
| Explicit order after acceptance | **implemented**; fixture order hosted |
| Payment report | **implemented**; fixture pending report hosted |
| Contabilidad confirm | **implemented locally**; **not** on shared seat; no bank |
| Dispatch / Nota de Entrega evidence | **not started** / future |
| Payment-before-dispatch rule | **blocked by decision** #5 |

**First missing link:** Contabilidad roster + published payment instructions + decision #5.

### F. Commitment → reminder → miss → visibility → resolution

| Link | State |
|---|---|
| Create/list commitments | **implemented**; fixture on Hoy hosted |
| Due/overdue scheduler + 48h follow-up | **not started** / partial Batch 7 gaps |
| Hours/escalation owners | **blocked by decision** #8 |

**First missing link:** reminder/scheduler implementation after hours decision.

### G. Location → confirmation policy → map → follow-up

| Link | State |
|---|---|
| Stored lat/long | **hosted** fixture (4) |
| Mapbox canvas | **not hosted** (no token) |
| GPS confirmation policy | **blocked by decision** #7 |

**First missing link:** decision #7 then provider credentials.

### H. WhatsApp/AI → FAQ/escalation → human → record

| Link | State |
|---|---|
| Honesty / disconnected labels | **working hosted** |
| A01–A22 / AI auto-send | **proposal-only / not started** |
| Meta + FAQ + budget + escalation | **blocked by decision** #8 + provider |

**First missing link:** corporate WhatsApp + content/budget decisions.

---

## Phase D — Execution queue (dependency order)

### Batch R1 — Hosted evaluation freeze & Journey honesty sync (docs + tiny copy only when authorized)

| Field | Value |
|---|---|
| Journey steps | Recorrido `proposal` / `decision` / `external` lag for steps **9–17 and 19** (exact statuses: 9–11 proposal, 12 decision, 13 proposal, 14 external, 15–17 proposal, 19 proposal) vs fixture visibility |
| Business outcome | Recorrido matches what evaluators actually see (fixture vs proposal/decision/external) |
| Prerequisite | Carmen decides: keep Recorrido conservative **or** upgrade selected statuses to “partial / fixture visible” without claiming create paths |
| Source inputs | This reconciliation; `story-steps.ts` living-contract rules in RECORRIDO receipt |
| Files likely | `story-steps.ts` (+ tests), worksheet — **only after explicit implementation authorization** (not this docs task) |
| Parallel? | No (evaluation narrative) |
| Builder tests | Journey contract tests |
| Independent review | Docs/product-evidence review of this reconciliation first |
| Hosted proof | Recorrido step labels match hosted screens |
| Release criteria | Copy change promoted only with named RC |
| Stop | If Carmen keeps conservative copy — stop after documenting conflict |

### Batch R2 — Catalog + price basis (blocks real quote pricing)

| Field | Value |
|---|---|
| Steps | 9, 11–13 |
| Outcome | Approved products/prices or explicit exception path |
| Prerequisite | **Decision #3** PDF/matrix/SKU/exception policy |
| Inputs | `CatalogoVitriCompleto2026.pdf` (or successor) + price matrix |
| Systems | catalog package, `/productos`, quote price basis |
| Parallel? | After decision; parallel with R3 planning only |
| Tests | Precio por confirmar; no invented SKU; Agregar a cotización |
| Review | Catalog lane independent review (still open) |
| Hosted proof | `/productos` shows published source; quote uses basis or approval |
| Stop | Missing PDF/matrix |

### Batch R3 — Approval activation (no T04 rewrite)

| Field | Value |
|---|---|
| Steps | 12–13, 15 |
| Outcome | Real named approvers; thresholds; no self-approve preserved |
| Prerequisite | **Decisions #1–#2**; R2 or explicit “all manual prices need approval” |
| Inputs | Named holders of `commercial.price.approve`; threshold table |
| Systems | grants only — **do not reimplement T04 lifecycle** |
| Parallel? | After #1–#2; not before R2 if prices claimed |
| Tests | Self-approve refused; stale approval after edit; range |
| Review | Complete `REVIEW-PACKET-T04-QUOTES.md` first |
| Hosted proof | Non-synthetic approver seat decides one exception |
| Stop | No named holders |

### Batch R4 — Order/payment/delivery honesty completion

| Field | Value |
|---|---|
| Steps | 15–16 |
| Outcome | Report → verify → (future) dispatch/delivery evidence distinct |
| Prerequisite | **Decision #5–#6**; Contabilidad member; payment instructions publish path |
| Inputs | Bank/QR publish package (A1); cancel/convert rules |
| Systems | payments, finanzas, orders — no bank connector V1 |
| Parallel? | After R3 for convert-related rules |
| Tests | Report≠confirm; confirm requires payments.confirm; no fake dispatch |
| Stop | Missing Contabilidad / instructions / decisions |

### Batch R5 — Commitments scheduler / follow-up

| Field | Value |
|---|---|
| Steps | 17–18 |
| Outcome | Due reminders + missed follow-up suggestions (no auto WhatsApp) |
| Prerequisite | **Decision #8** hours/escalation (subset) |
| Parallel? | Yes with R4 if decisions ready |
| Stop | No hours/escalation owners |

### Batch R6 — Map provider

| Field | Value |
|---|---|
| Step | 19 |
| Prerequisite | **Decision #7** + Mapbox (or chosen) credentials |
| Stop | No GPS policy or token |

### Batch R7 — WhatsApp / AI

| Field | Value |
|---|---|
| Steps | 2, 14, 20 |
| Prerequisite | **Decisions #4 + #8** + Meta access + FAQ publish + AI budget |
| Stop | Any missing; never fake Connected |

### Cross-cutting rules for every source-changing batch

Local tests → independent review → explicit promotion → deployed verification → Journey status update. Keep hosted evaluation stable; build in isolated worktrees. Do not reopen T03 foundation except verified defect/evaluator feedback. Do not reimplement T04 lifecycle.

**First three executable engineering batches (once decisions supplied):** R2 (catalog), R3 (approval grants), R4 (payment/order policy wiring).

---

## Phase E — Guion de evaluación para Isa y Álvaro

### Orden exacto de inspección (hosted)

1. Abrir https://isalwa-os-web-evaluation.vercel.app e iniciar sesión con la cuenta compartida que Carmen indique **fuera de este documento**.
2. Descartar la bienvenida (**Entendido**) si aparece.
3. **/inicio (Hoy)** — ver tarjetas y compromisos EVALUACIÓN.
4. Abrir **Ver recorrido completo** — leer las 20 etapas; separar “probar ahora” vs “propuesta”.
5. **/conversaciones** — leer el aviso de **sin conexión a Meta/WhatsApp**.
6. **/clientes** — cuatro contextos (Showroom, Más de 10, Calidad Segunda, Viajes/Trópico); abrir un Cliente 360.
7. En 360: responsable, cobertura si aparece, historial, teléfonos (sin asumir revelación).
8. **/oportunidades** y **/cotizaciones** — borrador vs **Emitida** (emitida ≠ enviada).
9. **/pedidos** — pedido explícito de ejemplo si visible.
10. **/compromisos** — promesas de ejemplo.
11. **/productos** — catálogo pendiente/vacío honesto (no precios inventados).
12. **/mapa** — lista/pendiente; **no** afirmar Mapbox.
13. Cerrar sesión; comprobar que `/clientes` exige login.

### Qué es usable ahora

- Navegación comercial de evaluación con datos **sintéticos EVALUACIÓN**.
- Lectura de clientes, oportunidades, cotizaciones (incl. Emitida), pedidos/compromisos de fixture.
- Conversaciones manuales de ejemplo sin Meta.
- Recorrido guiado para discutir el sistema diseñado.

### Qué es solo propuesta / decisión

- Catálogo PDF y matriz de precios reales.
- Aprobadores reales y umbrales.
- Envío WhatsApp, IA automática, Mapbox, confirmación bancaria, despacho/entrega con Nota de Entrega.
- Cancelación de pedidos y conversión de cotizaciones ajenas (reglas abiertas).

### Decisiones que cada propuesta pide

Usar la lista canónica del encabezado de este encargo (aprobadores, umbrales, catálogo, WhatsApp, pago-antes-despacho, cancel/convert, GPS, horario/FAQ/IA).

### Cómo reportar un problema

Anotar: etapa del Recorrido, pantalla/URL, rol, qué esperaban, qué vieron, si es dato/regla/autoridad, y quién debería decidir. Registrar en `EVALUACION_ISA_ALVARO_DECISIONES_Y_FEEDBACK.md` (Carmen). No cambiar configuración.

### Nunca inferir como ya conectado

Meta/WhatsApp · confirmación bancaria · precios/PDF de catálogo aprobados · Mapbox · datos de producción · auto-aprobación · que Emitida implica envío.

---

## Conflicts: Journey copy vs hosted/local behavior

1. **Recorrido steps 9–17 and 19** remain `proposal` / `decision` / `external` (see Batch R1 exact map) while hosted fixture shows opportunities, quotes (Emitida), orders, payment report, commitments, and coordinates — **visibility ≠ full create/authority proof**. Intentional conservatism until Carmen authorizes copy upgrade (`RECORRIDO-DUAL-LAYER-EVALUATION.md` living contract).
2. **`EVALUACION_ISA_ALVARO_…` worksheet intro** previously said Journey was NOT HOSTED — **resolved in Phase 0/1**: intro now distinguishes hosted visibility vs live-journey verification vs proposal/blocked, without upgrading Recorrido step availability labels.
3. **T04 review packet** historically showed independent review **NOT STARTED** and freeze `5e7131cc`; **Phase 0 corrected** the status line to external **PASS WITH FOLLOW-UPS** (formal `REVIEW-T04-QUOTES.md` absent). Current product pin is `904cf24a` / `dpl_E8wQPK77…`. Authority: `receipts/T04-INDEPENDENT-REVIEW-PROVENANCE.md`.
4. **Batch-3 receipt** noted “Enviada” pill debt; promote hygiene + fixture review moved product wording to **Emitida** — treat Batch-3 / packet “Enviada” gap notes as superseded for labels.
5. **Batch-3 / local-verify receipts** still say “independent review not done / open”; those lines are **stale relative to the external PASS WITH FOLLOW-UPS**. Do not rewrite those historical receipts’ original timestamps; use the provenance receipt as the current authority for review status.
6. **Mi día / some Hoy subsections** may show “No pudimos cargar…” intermittently; commercial fixture cards can still populate — do not treat partial Hoy failure as full API down without checking Railway health.

## Open ISALWA decisions (unresolved — do not invent)

1. Named holders of `commercial.price.approve`.
2. Discount/amount/context approval thresholds.
3. Approved catalog PDF, price matrix, SKU source, exception policy.
4. Corporate WhatsApp per advisor vs shared line.
5. Payment-before-dispatch rule and exception authorizer.
6. Who can cancel an order; who may convert another advisor’s quote.
7. GPS confirmation policy before confirmed map pin.
8. WhatsApp hours, escalation owners, FAQ source, human-save confirmation, AI budget.

## Review packet for independent documentation / product-evidence review

Use this document as the primary packet:

`docs/operations/commercial-release/COMMERCIAL_JOURNEY_RECONCILIATION-2026-11-18.md`

Companion receipt: `docs/operations/commercial-release/receipts/EVALUATION-JOURNEY-RECONCILIATION-2026-11-18.md`.
