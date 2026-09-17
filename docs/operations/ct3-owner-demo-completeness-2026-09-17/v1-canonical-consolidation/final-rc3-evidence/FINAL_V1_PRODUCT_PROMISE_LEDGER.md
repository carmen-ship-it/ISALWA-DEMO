# FINAL_V1_PRODUCT_PROMISE_LEDGER

**Date:** 2026-09-17  
**Mode:** READ-ONLY reconciliation (pre-commit / pre-cut)  
**LIVE tip:** `8f1ac76185af432bb244ea94b7ae6a647eaa0ebc` (RC2 FAIL)  
**LOCAL:** dirty RC3 worktree on top of LIVE tip  
**Sources:** PP1–PP8 lanes + RC2/RC3 evidence + CT3 docs Sep 15–17  

**Note:** The 37-requirement scorecard is **not** the sole source of truth. This ledger includes user-visible promises from archaeology (UPR), CTA inventories, loops, View As, visual language, and tour decisions.

LIVE_vs_LOCAL for tour/Story app files: **same as HEAD** (PP1). RC3 dirty diffs are primarily Pedido auth / View As narrowing / Cliente360 / coverage tests / evidence — not new Story Mode.

---

## Legend

| Field | Meaning |
|---|---|
| INTENDED | LIVE / REMOVED / FUTURE / HIDDEN_UNTIL_READY |
| LOCAL_RC3 | YES / NO / PARTIAL (includes uncommitted RC3) |
| LIVE_RC2 | YES / NO / PARTIAL / STALE |
| STATUS | MATCH / LOCAL_ONLY / STALE_LIVE / MISSING_LOCAL_AND_LIVE / PARTIAL / FUTURE_BY_DESIGN / UNPROVEN |
| FIX_BEFORE_RC3 | YES only if blocks honest V1 owner-eval cut |

---

## A. Tours / Story Mode / onboarding (PP1 + UPR)

| PROMISE_ID | USER_VISIBLE_REQUIREMENT | SOURCE | INTENDED | LOCAL | LIVE | STATUS | FIX_BEFORE_RC3 |
|---|---|---|---|---|---|---|---|
| P-TOUR-01 | ONE full owner walkthrough = Story Mode | PP1, UPR tour docs | LIVE | YES | YES | MATCH | NO |
| P-TOUR-02 | CTA label **Ver recorrido completo** | PP1 | LIVE | YES | YES | MATCH | NO |
| P-TOUR-03 | Shell + Inicio + Ayuda + `?story=1` open same Story | PP1 | LIVE | YES | YES | MATCH | NO |
| P-TOUR-04 | No floating **Mostrar recorrido** / GuidePanel launcher | PP1, guide.test | REMOVED | YES (deleted) | STALE (stub on LIVE) | LOCAL_ONLY until RC3 ships | NO (closed locally) |
| P-TOUR-05 | First-use IntroWelcome only (short orientation; no multi-step IntroCoach) | Carmen 2026-09-17 | LIVE | YES | PARTIAL (LIVE still mounts coaches) | LOCAL_ONLY | NO |
| P-TOUR-06 | Page micro-tours **removed** — Story Mode sole multi-step | Carmen 2026-09-17 | REMOVED | YES (deleted coaches) | STALE on LIVE | LOCAL_ONLY | NO |
| P-TOUR-07 | Modo aprendizaje on Ayuda | PP1 | LIVE | YES | YES | MATCH | NO |
| P-TOUR-08 | RoleQuickstartPanel not visible | PP1 | REMOVED | YES (deleted) | STALE file on LIVE | LOCAL_ONLY | NO |
| P-TOUR-09 | ContextualMicroTipCoach not visible | PP1 | REMOVED | YES (deleted) | STALE file on LIVE | LOCAL_ONLY | NO |
| P-TOUR-10 | Story steps use normal routes (+ datos=demo) | PP1, PP7 OA-5 | LIVE | YES (nav appends datos) | PARTIAL | LOCAL_ONLY | NO |
| P-TOUR-11 | Management **Ver ejemplo** ≠ Story Mode | PP1 | LIVE | YES | YES | MATCH | NO |
| P-TOUR-12 | No competing small “full tour” product | Carmen 2026-09-17 | LIVE | YES | STALE (micro-tour on LIVE) | LOCAL_ONLY | NO |

---

## B. Cliente360 (6 tabs + header)

| PROMISE_ID | USER_VISIBLE_REQUIREMENT | INTENDED | LOCAL | LIVE | STATUS | FIX_BEFORE_RC3 |
|---|---|---|---|---|---|---|
| P-C360-01 | Exactly 6 tabs: Resumen/Comercial/Operación/Trabajo/Documentos/Historial | LIVE | YES | YES | MATCH | NO |
| P-C360-02 | Header: identity, status, owner, helper, primary/secondary, next action | LIVE | YES | YES | PARTIAL | NO (polish) |
| P-C360-03 | Resumen counts from authorized graph (Opp/Quote/Pedido) | LIVE | YES (RC3 org visibility) | NO (Pedidos=0 RC2) | LOCAL_ONLY | YES — in RC3; must ship |
| P-C360-04 | Apoyo temporal grant/revoke UI | LIVE | YES | YES | MATCH | NO (hosted mutate UNPROVEN) |
| P-C360-05 | Reasignar responsable | LIVE | YES | YES | MATCH | NO |
| P-C360-06 | View As Asesor B cannot open other advisor Cliente | LIVE | YES (RC3 gate) | PARTIAL | LOCAL_ONLY | YES — ship RC3 |
| P-C360-07 | Ops View As suppresses commercial negotiation lists | LIVE | YES (RC3) | NO | LOCAL_ONLY | YES — ship RC3 |
| P-C360-08 | One panel at a time / no giant flat page | LIVE | YES | YES | PARTIAL | NO |

---

## C. Commercial manual actions (PP2)

| PROMISE_ID | ACTION | EXISTS | WHERE | LOCAL | LIVE | STATUS | FIX_BEFORE_RC3 |
|---|---|---|---|---|---|---|---|
| P-COM-01 | Nueva oportunidad | YES | Cliente360 / commercial | YES | YES | MATCH | NO |
| P-COM-02 | Crear cotización | YES | Opp / Comercial | YES | YES | MATCH | NO |
| P-COM-03 | Agregar/editar líneas | YES | Quote editor | YES | YES | MATCH | NO |
| P-COM-04 | Ver/Descargar PDF | YES | Quote | YES | YES | MATCH | NO |
| P-COM-05 | Registrar como enviada | YES | Quote envío | YES | YES | MATCH | NO |
| P-COM-06 | Programar/Registrar seguimiento | YES | Quote / Cliente | YES | YES | MATCH | NO |
| P-COM-07 | Solicitar aprobación | YES | Quote | YES | YES | MATCH | NO |
| P-COM-08 | Aprobar / Rechazar | YES | Aprobaciones | YES | YES | MATCH | NO |
| P-COM-09 | Escalar a Gerencia | YES — EscalateApproval + CTA | Quote/Aprobaciones decide surface | YES | NO | LOCAL_ONLY | NO |
| P-COM-10 | Cliente aceptó / aceptación | FOLDED | into Convertir flow | YES | YES | PARTIAL | NO |
| P-COM-11 | Convertir a Pedido | YES | Quote | YES | YES | MATCH | NO |
| P-COM-12 | Quién tiene la pelota card | YES | Quote (mainly) | YES | YES | PARTIAL — quote-only | NO (visual debt) |

---

## D. Coverage / ownership (PP2 + RC3)

| PROMISE_ID | REQUIREMENT | LOCAL | LIVE | STATUS | FIX_BEFORE_RC3 |
|---|---|---|---|---|---|
| P-COV-01 | Asignar apoyo temporal | YES | YES | MATCH | NO |
| P-COV-02 | Quitar apoyo temporal | YES | YES | MATCH | NO |
| P-COV-03 | Canonical owner unchanged on grant | YES (tests) | UNPROVEN hosted | LOCAL_ONLY proof | NO for cut; hosted later |
| P-COV-04 | Coverage alone ≠ convert | YES (tests) | UNPROVEN | LOCAL_ONLY | NO for cut |
| P-COV-05 | View As hides coverage mutation | YES | YES | MATCH | NO |

---

## E. Post-sale / Pedido (PP3 + RC3 auth)

| PROMISE_ID | ACTION / RULE | LOCAL | LIVE | STATUS | FIX_BEFORE_RC3 |
|---|---|---|---|---|---|
| P-OPS-01 | Owner-eval can open Maderas Pedido | YES (RC3) | NO (403) | LOCAL_ONLY | YES — ship RC3 |
| P-OPS-02 | Solicitar revisión Producción/Almacén/Compras (explicit, not auto) | YES | YES | MATCH | NO |
| P-OPS-03 | Production update CTA | YES | YES | MATCH | NO |
| P-OPS-04 | Warehouse finished-goods fact | YES | YES | MATCH | NO |
| P-OPS-05 | Crear Nota de Entrega | YES | YES | MATCH | NO |
| P-OPS-06 | Nota PDF | YES | YES | MATCH | NO |
| P-OPS-07 | Registrar salida | YES | YES | MATCH | NO |
| P-OPS-08 | Registrar entrega | YES | YES | MATCH | NO |
| P-OPS-09 | Progress Cotización→…→Entrega language | YES | YES | MATCH | NO |
| P-OPS-10 | Approval≠Pedido / Nota≠Salida / Salida≠Entrega | YES | YES | MATCH | NO |
| P-OPS-11 | Lane cards preserve orderId deep-link | YES | PARTIAL | LOCAL_ONLY — `?orderId=` on Prod/Almacén/Entregas | NO |
| P-OPS-12 | Compras OC write from Pedido | NO | NO | FUTURE_BY_DESIGN | NO — Carmen locked; V1 = solicitar revisión de Compras only |

---

## F. Work / Inicio / Issues / Commitments / Conversations (PP4)

| PROMISE_ID | REQUIREMENT | LOCAL | LIVE | STATUS | FIX_BEFORE_RC3 |
|---|---|---|---|---|---|
| P-INI-01 | Inicio as command center (attention, due, approvals, issues, commitments, work) | YES | YES | MATCH | NO |
| P-INI-02 | Mío / Equipo / Empresa lenses | YES | YES | MATCH | NO |
| P-INI-03 | Zero counts vs visible records honesty | PARTIAL | PARTIAL (RC2 Pedidos) | PARTIAL | YES via Pedido auth |
| P-WRK-01 | Create Work via business action | YES | YES | MATCH | NO |
| P-WRK-02 | Complete Work explicit | YES | YES | MATCH | NO |
| P-WRK-03 | Reassign Work (admin) | YES | YES | MATCH | NO |
| P-WRK-04 | Reading notification ≠ complete Work | YES | YES | MATCH | NO |
| P-ISS-01 | Report incidencia | YES | YES | MATCH | NO |
| P-ISS-02 | Assign incidencia | YES | YES | MATCH | NO |
| P-ISS-03 | Resolve incidencia in UI | YES | NO | LOCAL_ONLY — ResolveIssueForm + ResolveIssue | NO (closed locally; ship RC3) |
| P-CMT-01 | Crear compromiso | YES | YES | MATCH | NO |
| P-CMT-02 | Completar compromiso | YES | YES | MATCH | NO |
| P-CNV-01 | Conversation suggest → human confirm before effect | YES | PARTIAL | LOCAL_ONLY — Review navigates only; Ignore durable company evidence | NO |
| P-CNV-02 | No fake WhatsApp send | YES | YES | MATCH | NO |
| P-CNV-03 | Durable manual conversation register | YES | PARTIAL | LOCAL_ONLY — POST OsCustomerConversation | NO |

---

## G. View As / Search / Map / Finance (PP5)

| PROMISE_ID | REQUIREMENT | LOCAL | LIVE | STATUS | FIX_BEFORE_RC3 |
|---|---|---|---|---|---|
| P-VA-01 | Desk allow-list per persona | YES | YES | MATCH | NO |
| P-VA-02 | Mutations disabled under View As (commercial/work) | YES | YES | MATCH — commitments + postsale gated | NO |
| P-VA-03 | Asesor person-specific | YES | YES | MATCH | NO |
| P-VA-04 | Carmen org.read must not leak under View As | YES (RC3) | NO | LOCAL_ONLY | YES — ship |
| P-VA-05 | Nav still lists excluded desks | YES | YES | LOCAL_ONLY — `evaluationNavItemVisible` hides excluded | NO |
| P-VA-06 | ⌘K Acciones under View As | YES | YES | LOCAL_ONLY — Acciones suppressed when blocksMutations | NO |
| P-SEA-01 | ⌘K / Ctrl+K palette | YES | YES | MATCH | NO |
| P-SEA-02 | Search obeys role / View As / demo | YES | YES | PARTIAL hosted | NO for cut |
| P-MAP-01 | Mapa desk + evaluation gate | YES | YES | MATCH | NO |
| P-FIN-01 | Finanzas operational desk | YES | YES | MATCH — View As mutationsBlocked | NO |

---

## H. Visual hierarchy (PP6)

| PROMISE_ID | REQUIREMENT | LOCAL | LIVE | STATUS | FIX_BEFORE_RC3 |
|---|---|---|---|---|---|
| P-VIS-01 | Porcelain / kiln / glaze tokens | YES | YES | MATCH | NO |
| P-VIS-02 | Who-has-the-ball beyond quote | PARTIAL | PARTIAL | PARTIAL | NO (does not block security cut) |
| P-VIS-03 | Shared progress steppers (no forks) | PARTIAL | PARTIAL | PARTIAL | NO |
| P-VIS-04 | Mobile ~390 usable | UNPROVEN | UNPROVEN | UNPROVEN | NO for functional cut; YES for invite |

---

## I. Demo / empty / reachability (PP7)

| PROMISE_ID | REQUIREMENT | LOCAL | LIVE | STATUS | FIX_BEFORE_RC3 |
|---|---|---|---|---|---|
| P-DEM-01 | SYNTH graph coherent for owner eval | YES | PARTIAL (auth hide) | LOCAL_ONLY fix | YES |
| P-DEM-02 | Story CTAs append datos=demo | YES | YES | MATCH | NO |
| P-DEM-03 | Sidebar keeps demo mode | YES | PARTIAL | LOCAL_ONLY — nav appends `?datos=demo` + cookie SSR | NO |

---

## J. Unrepresented archaeology (PP8 — UPR-01…37)

37 UPRs catalogued in `pp-lanes/PP8_PROMISE_ARCHAEOLOGY.md`. Each UPR has a **primary exclusive** bucket below (secondary “folded into P-*” notes are not second counts).

---

## K. Mutually exclusive primary-state rollup (118)

**Inventory:** 81 `P-*` thematic rows + 37 `UPR-*` = **118**. Nothing deleted.

**Missing-from-prior-117 diagnosis:** Prior gate used `REMOVED = 5` by counting IntroCoach as an extra REMOVED item **without** a discrete `P-*` id, while simultaneously treating all 37 UPRs as “folded” without assigning each a primary exclusive bucket. That under-counted the exclusive universe by **1** (117 vs 118). The omitted exclusive slot is restored by giving every UPR its own primary bucket (IntroCoach multi-step retirement is covered by **UPR-03** keep/retire split + **P-TOUR-05/06**, not a phantom 5th REMOVED P-id).

### Primary buckets (exclusive)

| Bucket | P-* | UPR-* | Total |
|---|---:|---:|---:|
| MATCH_LOCAL | 48 | 28 | **76** |
| LOCAL_ONLY_EXPECTED_TO_SHIP | 22 | 4 | **26** |
| FUTURE_BY_DESIGN | 1 | 1 | **2** |
| HIDDEN_UNTIL_READY | 0 | 0 | **0** |
| REMOVED | 4 | 2 | **6** |
| PARTIAL_LOCAL | 6 | 2 | **8** |
| MISSING_MUST_FIX | 0 | 0 | **0** |
| **PROMISE_BUCKET_SUM** | **81** | **37** | **118** |

**FUTURE_BY_DESIGN**
- P-OPS-12 Compras OC write
- UPR-12 WhatsApp provider send (honesty string MATCH elsewhere; live WhatsApp FUTURE)

**REMOVED** (local product mounts gone; ship clears LIVE stale)
- P-TOUR-04 GuidePanel / Mostrar recorrido
- P-TOUR-06 MicroTourCoach
- P-TOUR-08 RoleQuickstartPanel
- P-TOUR-09 ContextualMicroTipCoach
- UPR-01 floating GuidePanel retirement (primary REMOVED claim)
- UPR-02 Ayuda multi-journey Recorrido del piloto launcher

**LOCAL_ONLY_EXPECTED_TO_SHIP** (implemented dirty RC3; not on LIVE tip) — includes P-OPS-01, P-C360-03/06/07, P-COM-09, P-ISS-03, P-CNV-01/03, P-OPS-11, P-VA-04/05/06, P-DEM-01/03, tour LOCAL_ONLY rows, plus UPR-18/19/37 (demo nav / Story parity / ops View As negotiation) where local-only vs LIVE.

**PARTIAL_LOCAL** — visual polish / mobile UNPROVEN / folded acceptance / quote-heavy ball / hosted search nuance (non-blocking for this cut).

**MATCH_LOCAL** — remaining P-* + UPR-* whose intended local behavior is present (may also be LIVE).

### Manual actions (normalized)

Derived from PP2 + PP3 + PP4 CTA inventories (catalogued 42; Compras OC write = FUTURE):

| Metric | Count |
|---|---:|
| MANUAL_ACTIONS_CATALOGUED_TOTAL | **42** |
| MANUAL_ACTIONS_V1_PROMISED | **41** |
| MANUAL_ACTIONS_FUTURE_BY_DESIGN | **1** (Compras OC write / P-OPS-12) |
| MANUAL_ACTIONS_V1_REACHABLE_LOCAL | **41** |
| MANUAL_ACTIONS_V1_MISSING_LOCAL | **0** |

Invariant: `CATALOGUED_TOTAL = V1_PROMISED + FUTURE_BY_DESIGN`.

### Distinctions (do not collapse)

| Flag | Meaning |
|---|---|
| IMPLEMENTED_LOCAL | Code present in dirty RC3 worktree |
| LIVE_RC2 | Present on tip `8f1ac76…` |
| HOSTED_PROVEN | Hosted browser-verified — **not** claimed by this ledger refresh |

See `V1_PRODUCT_DRIFT_REPORT.md` for cut implication.
