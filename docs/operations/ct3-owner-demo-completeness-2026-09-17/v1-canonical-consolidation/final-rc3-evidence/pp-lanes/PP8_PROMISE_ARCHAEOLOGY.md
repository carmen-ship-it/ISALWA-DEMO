# PP-8 — Promise archaeology (user-visible, outside the 37-row scorecard)

**Lane:** PP-8 · READ-ONLY  
**At:** 2026-09-17  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo`  
**Window mined:** ~2026-09-15 → 2026-09-17 (ops docs, receipts, Story Mode, superseded claims, agent-transcript notes)  
**Scorecard baseline:** `v1-canonical-consolidation/final-rc-evidence-0268843/FINAL_V1_REQUIREMENTS_RECONCILIATION.md` + `FINAL_V1_SCORECARD_AND_VERDICT.md` (**37** master rows A01–T01)

## Method

1. Treat A01–T01 as the “simple 37-requirement scorecard.”
2. Mine CT3 / post-finish / forensic / RC2–RC3 / CT2 owner-decision / coverage docs for **USER-VISIBLE** product promises (buttons, tours, copy, chrome, fail-closed UX).
3. List only promises with a **cited SOURCE path**. Do not invent requirements.
4. Mark items **UNREPRESENTED** when they are **not** a discrete A–T row (even if loosely collapsed into a broader PARTIAL such as S01/R01/T01).

**Not acceptance.** This register does not score PASS/FAIL of product; it surfaces promises a 37-row scorecard can hide.

---

## Already represented in the 37 (do not re-list as gaps)

| Theme | Scorecard row(s) | Notes |
|---|---|---|
| Demo ↔ REAL company context | A01–A03 | Cookie / membership / fail-closed login |
| Resource auth / View As personas | A04, C01–C08, B01–B02 | Nav + data + mutations-off + identity Carmen |
| Ownership / coverage ≠ convert / reassign | D01–D05 | D02 PARTIAL = no grant UI at RC1; RC2 claimed FULL code |
| Approvals / no auto-Pedido | E01–E03 | |
| Commercial + ops loops | F01, G01 | |
| Work / who-has-the-ball / Inicio lenses | H01 | |
| Durable conversations | I01 | |
| Cliente360 six tabs | J01 | |
| Progress vocabulary (Approval≠Pedido; Nota≠Salida≠Entrega) | K01 (+ G01 residual) | |
| Search auth + View As | L01 | |
| Map no Revenue / demo filter | M01 | |
| Gerencia factual metrics | N01 | |
| Finance operational-only | O01 | |
| Quote/DN PDF same impl | P01 | |
| History / audit View As | Q01 | |
| Story Mode 20 steps | R01 | |
| Visual system + mobile (coarse) | S01 | |
| AI tenant filter + **AI_OWNER_REVIEW_READY=NO** | T01 | |

---

## UNREPRESENTED_PRIOR_REQUESTS

Each row is a user-visible promise (or explicit removal/keep decision) **not** given its own A–T requirement id.

| ID | USER-VISIBLE PROMISE | SOURCE (path) | DATE (if known) | WHY OUTSIDE 37 | RELATED ROW (if any) |
|---|---|---|---|---|---|
| UPR-01 | Floating full-tour **GuidePanel** / label **“Mostrar recorrido”** removed from product chrome | `workers/pf6-receipt.md`; `CT3_FINAL_RECEIPT.md` (POST-FINISH); `POST_FINISH_CLAIM_AUDIT.md`; `pf8-results.json` (`old_walkthrough_removed`); `CT3_HOSTED_BV.md` | 2026-09-17 | R01 scores Story Mode presence, not **button retirement** | R01 adjacent |
| UPR-02 | Ayuda **multi-journey “Recorrido del piloto”** launcher removed; must not relaunch old pilot tour | `workers/pf6-receipt.md` | 2026-09-17 | Not a scorecard row | R01 adjacent |
| UPR-03 | **KEEP** lightweight help: intro replay, **micro-tours**, **Modo aprendizaje**, **¿Qué significa esto?**, role quick-start — while full tour is Story Mode only | `workers/pf6-receipt.md`; `CT3_FINAL_RECEIPT.md` | 2026-09-17 | Keep/retire split not scored; forensic only flags micro-tours as P2 polish (`FORENSIC_CONTROL_TOWER_SUMMARY.md`) | — |
| UPR-04 | Canonical sole full guided walkthrough = Story Mode CTA **“Ver recorrido completo”** with **Paso N de 20 / Siguiente / Anterior / Salir del recorrido** + DEMO badge | `workers/pf6-receipt.md`; `CT3_COPY_RECEIPT.md`; `PRODUCT_ACCEPTANCE_ADDENDUM.md` §5; `CT3_HOSTED_BV.md`; `POST_FINISH_ADDENDUM_RECEIPT.md` | 2026-09-17 | R01 = “20 steps / normal routes”; chrome labels & exit controls are addendum BV, not discrete rows | R01 |
| UPR-05 | Persistent banner **`DEMO · DATOS FICTICIOS`** + toggle **`Datos reales` \| `Demo`**; **default remains Datos reales**; cookie `isalwa-demo-data-mode` | `workers/pf6-receipt.md`; `CT3_FINAL_RECEIPT.md`; `CT3_COPY_RECEIPT.md`; `POST_FINISH_ADDENDUM_RECEIPT.md` | 2026-09-17 | A01 is company switching mechanism, not banner/default UX contract | A01 |
| UPR-06 | **Compromisos** must be a real **`/compromisos`** desk; nav **must not** land on `/inicio` | `PRODUCT_ACCEPTANCE_ADDENDUM.md` §6; `workers/lane-a-receipt.md`; `CT3_HOSTED_BV.md`; `PROGRESS_RECEIPT.md` | 2026-09-17 | Non-negotiable addendum gate; **no** Compromisos row in A–T | — |
| UPR-07 | Cliente360: **exactly six tabs**; **only one panel visible**; URL `?tab=` persistence; **not** one long page of all six | `PRODUCT_ACCEPTANCE_ADDENDUM.md` §1; `workers/lane-a-receipt.md`; `CT3_VISUAL_ACCEPTANCE.md`; `CT3_HOSTED_BV.md` | 2026-09-17 | J01 names six tabs + role projection; addendum’s **one-panel / not-long-page** UX is the acceptance wording | J01 |
| UPR-08 | List density: empty / compact **1–5** / **“Ver todos”** at **6+** (`ScaledListReveal`) | `workers/lane-a-receipt.md`; `CT3_DEVIATIONS.md` #7; `CT3_FINAL_RECEIPT.md` (SSR crash fix note) | 2026-09-17 | Not in A–T; only appears as deviation soft-match | S01 adjacent |
| UPR-09 | Conversaciones desktop: **3-column** (list / thread / context); **demo watermark**; **smart context** wired | `PRODUCT_ACCEPTANCE_ADDENDUM.md` §3; `CT3_VISUAL_ACCEPTANCE.md`; `CT3_COPY_RECEIPT.md` (`DEMO·WHATSAPP`); `CT3_HOSTED_BV.md` | 2026-09-17 | I01 = durable DB conversations only | I01 |
| UPR-10 | Certainty labels **CONFIRMADO / PENDIENTE DE CONFIRMAR / NO REGISTRADO** (hosted examples); no AI probability labels | `PRODUCT_ACCEPTANCE_ADDENDUM.md` §4; `workers/lane-d-receipt.md`; `CT3_COPY_RECEIPT.md`; `workers/lane-h-receipt.md` | 2026-09-17 | No certainty row; not T01 (AI gateway) | — |
| UPR-11 | Freshness copy rules: **Actualizado hace… / ayer / Última actualización…**; **“Puede requerir confirmación”** only under allowed rules — never invent “desactualizado” | `workers/lane-d-receipt.md` | 2026-09-17 | Not in A–T | — |
| UPR-12 | WhatsApp honesty: **“Canal no conectado. Nada se envía ni se recibe desde ISALWA.”** — no fake send | `CT3_COPY_RECEIPT.md` | 2026-09-17 | I01 notes WhatsApp FUTURE; honesty string not scored | I01 FUTURE |
| UPR-13 | When **AI_OWNER_REVIEW_READY = NO**, UI **must hide / not pretend live** Ask controls; Story may say asistencia en validación but must not claim live AI | `PRODUCT_ACCEPTANCE_ADDENDUM.md` §9; `CT3_FINAL_RECEIPT.md`; `CT3_DEVIATIONS.md` #5; `workers/lane-h-receipt.md`; `PROGRESS_RECEIPT.md`; `SUPERSEDED_CLAIM_REGISTER.md` | 2026-09-17 | T01 scores readiness + gateway; **hide-live-controls** is the UX promise | T01 |
| UPR-14 | Mobile ~**390px**: **no horizontal body overflow** on key routes (Cliente360 + Conversaciones cited) | `PRODUCT_ACCEPTANCE_ADDENDUM.md` opening table `MOBILE_BV`; `CT3_VISUAL_ACCEPTANCE.md`; `CT3_HOSTED_BV.md`; `CT3_FINAL_RECEIPT.md` | 2026-09-17 | S01 lumps “mobile” without this concrete matrix | S01 |
| UPR-15 | Exact color / token conformance with documented deviations (navy kiln `#18324b` vs requested `#12324A`; soft teal via mix) | `PRODUCT_ACCEPTANCE_ADDENDUM.md` §7; `CT3_DEVIATIONS.md` #1–2; `CT3_COLOR_RECEIPT.md` (indexed) | 2026-09-17 | S01 is visual-system PARTIAL; color table is addendum gate | S01 |
| UPR-16 | QA **“Ver como”** that swaps `actorMemberId` = **impersonation** — **rejected** for owner Demo; View As must keep Carmen identity | `OWNER_DEMO_COMPANY_CONTEXT.md`; `OWNER_ORCHESTRATION_COLLISION_MAP.md`; `SUPERSEDED_CLAIM_REGISTER.md` (role-preview gate) | 2026-09-17 | B02/C* say identity unchanged; explicit **reject QA Ver como** is separate product decision | B02, C* |
| UPR-17 | Demo mode must switch effective company to **SYNTH** (Carmen SYNTH membership), not merely filter names inside REAL; if SYNTH membership missing → **fail-closed** (do not pretend switch) | `OWNER_DEMO_COMPANY_CONTEXT.md`; `FORENSIC_CONTROL_TOWER_SUMMARY.md` (P0 org-local filter); `CARMEN_OWNER_PATH_REPRO.md` | 2026-09-17 | A01 describes intended cookie/company map; forensic shows prior empty-list failure mode still a user-visible promise | A01 |
| UPR-18 | In-app nav / Story CTAs should preserve Demo query context (`datos=demo`); forensic: **82/89** links **DROP** query (cookie may still bridge) | `NAVIGATION_STATE_PRESERVATION_AUDIT.md`; `FORENSIC_CONTROL_TOWER_SUMMARY.md`; `STORY_MODE_20_STEP_RECONCILIATION.md` | 2026-09-17 | No A–T row for demo-state URL preservation | A01 / R01 |
| UPR-19 | Story Mode **normal-nav parity**: deep links must not be the only way to reach DEMO records for the owner path | `STORY_MODE_20_STEP_RECONCILIATION.md`; `FORENSIC_CONTROL_TOWER_SUMMARY.md` (`STORY_MODE_NORMAL_NAV_PARITY`) | 2026-09-17 | R01 = steps exist; parity FAIL is user journey promise | R01 |
| UPR-20 | Story Mode gated to **role-preview** (`canUseOwnerDemo` / people.admin); not “any demo viewer” | `CT3_DEVIATIONS.md` #4; `workers/pf6-receipt.md`; `CT3_HOSTED_BV.md` (asesor Story absent expected) | 2026-09-17 | Deviation vs naive request; not a scorecard row | R01 |
| UPR-21 | **Ver ejemplo completo** affordance for owner/evaluation | `lane-e-receipt.md`; `COLLISION_MAP.md` (CT3-E) | 2026-09-17 | Not in A–T | R01 / A01 |
| UPR-22 | Post-approval UX must not **dead-end** on “Volver” only — owner needs continue path to quote / convert (approve ≠ Pedido remains true) | `OWNER_JOURNEY_DEAD_END_AUDIT.md`; `APPROVAL_QUOTE_ORDER_RECONCILIATION.md`; `FORENSIC_CONTROL_TOWER_SUMMARY.md` P0#4 | 2026-09-17 | E02 = no auto-Pedido; **continue CTA** is separate UX promise | E02 |
| UPR-23 | Audit / historial provenance: Spanish **“creada\|o desde conversación”** strings + **“Ver conversación”** link | `CT3_COPY_RECEIPT.md`; `CT3_DEVIATIONS.md` #6; `workers/pf7-receipt.md` | 2026-09-17 | Q01 is audit filter/no backdoor; conversation-origin copy not a row | Q01 |
| UPR-24 | Delivery Note PDF: commercial asesor **403** without `delivery.record`; coordinacion path is the honest owner-demo proof | `CT3_DEVIATIONS.md` #3; `CT3_HOSTED_BV.md` negatives; `CT3_FINAL_RECEIPT.md` residual | 2026-09-17 | P01 = same PDF implementation; **role denial honesty** is user-visible | P01 |
| UPR-25 | Who-has-the-ball shows **Apoyo temporal only if evidenced**; **name + Cargo** for waiting approval | `OWNERSHIP_COVERAGE_HANDOFF_RULES.md`; commit ledger who-has-the-ball; `CR3_CR4_OWNERSHIP_APPROVAL_GAP.md` (temporarySupport often null) | 2026-09-17 | H01 mentions who-has-the-ball; evidenced-only Apoyo + Cargo detail not discrete | H01 / D02 |
| UPR-26 | Coverage UI copy: **Apoyo temporal** / **Asignar** / **Quitar**; warning **no cambia el responsable** / **no autoriza convertir** | `RC3_COVERAGE_UI_DIAGNOSIS.md`; `RC1_TO_RC2_REQUIREMENT_DELTA.md` (D02 FULL code at RC2); `rc2-hosted-bv-results.json` (Apoyo temporal UI probe) | 2026-09-17 | D02 is capability+UI gap at RC1; **specific CTA/copy** is the visible contract | D02 |
| UPR-27 | Under View As, coverage manage CTAs stay **hidden** (or eval banner) — harness asserts this | `final-rc2-evidence-8a153a4/rc2-hosted-bv-results.json` (`coverage CTA hidden or eval banner under View As`) | 2026-09-17 | C* mutations-off; coverage CTA hide is a specific visible rule | C*, D02 |
| UPR-28 | Progress vocab user-facing strips: Pedido lifecycle **Cotización → Pedido → Preparación → Salida → Entrega**; delivery desk **Nota ≠ Salida ≠ Entrega**; do not invent % | `workers/lane-f-receipt.md`; `RC1_TO_RC2_REQUIREMENT_DELTA.md` (Nota de Entrega ≠ Preparación); K01 residual naming | 2026-09-17 | K01/G01 name principles; **exact strip labels** are the owner-visible promise | K01, G01 |
| UPR-29 | Cliente360 **unauthorized tabs must not leak** via `?tab=` (nav chrome / empty panel still reveals areas) | `v1-canonical-consolidation/workers/CR7_CLIENTE360_INICIO_MAP_GAP.md` §C; J01 OPEN GAP “URL fail-closed tab matrix” | 2026-09-17 | J01 PARTIAL open gap only; CR7 states explicit **anti-leak** contract | J01 |
| UPR-30 | Visual hierarchy: single **next-action hero**; Cliente360 **command header**; do not duplicate next-action in Resumen | `v1-canonical-consolidation/workers/VISUAL_HIERARCHY_GAP.md` | 2026-09-17 | S01 coarse; hierarchy contract is separate user-visible ask | S01 |
| UPR-31 | **USER_ACCEPTED = NO** always in engineering pass; product authority must sign — engineering may not self-approve | `PRODUCT_ACCEPTANCE_ADDENDUM.md` §10; `CT3_FINAL_RECEIPT.md`; `RC3_LOCAL_CUT_GATE.md` | 2026-09-17 | Process promise visible in every handoff; not A–T | — |
| UPR-32 | **REAL_SEVEN_MUTATED = NO** — demo densify must not touch protected REAL seven | `PRODUCT_ACCEPTANCE_ADDENDUM.md`; `CT3_FINAL_RECEIPT.md`; `POST_FINISH_CLAIM_AUDIT.md`; `RC1_TO_RC2_REQUIREMENT_DELTA.md` non-goals | 2026-09-17 | Safety boundary, not a business-loop row | — |
| UPR-33 | Escalation UI **view-only** / must **not auto-escalate** without policy (“Vencido desde …” only) | `OWNERSHIP_COVERAGE_HANDOFF_RULES.md`; `CR3_CR4_OWNERSHIP_APPROVAL_GAP.md`; E03 adjacent | 2026-09-17 | E03 = no auto Gerencia pick; overdue auto-escalate ban is separate visible rule | E03 |
| UPR-34 | Carmen SYNTH owner-eval scopes: **no** `people.admin` / `master_data.admin` / `qa.access` / system Controles — admin path denied | `CARMEN_SYNTH_MEMBERSHIP_SCOPE_CORRECTION.md`; `SUPERSEDED_CLAIM_REGISTER.md`; `SHIP_ATTEMPT_OWNER_PROOF.md` negatives | 2026-09-17 | B01 = broad business surface without admin bypass; **named scopes removed** are the visible correction | B01 |
| UPR-35 | Map / management: no **Revenue** / profit / rankings language (Valor ≠ Revenue) | `CT3_COPY_RECEIPT.md`; `CT3_HOSTED_BV.md`; `workers/lane-g-receipt.md` watermark note | 2026-09-17 | Largely M01/N01; listed because copy receipts treat it as a standing honesty promise owners still cite | M01, N01 |
| UPR-36 | Reusable shell **próximo paso** strip / next-step density on ops desks without inventing business actions | `workers/lane-a-receipt.md`; `workers/lane-f-receipt.md`; `VISUAL_HIERARCHY_GAP.md` | 2026-09-17 | Not an A–T row; H01/F/G mention work attention loosely | H01 |
| UPR-37 | Evaluation / View As desks: Quote desk excluded; ops View As suppresses commercial negotiation lists (RC3 local product intent) | `RC3_LOCAL_CUT_GATE.md` (“What landed this closure”) | 2026-09-17 | Dirty-tree RC3; not a discrete A–T id beyond C* PARTIAL | C* |

---

## Superseded / overclaimed promises that still shape owner expectation

Cited so archaeology does not treat old receipts as current PASS — still **user-visible expectation risk**.

| Prior claim | SOURCE | Status per register | Owner-visible residue |
|---|---|---|---|
| Carmen SYNTH scopes ≈ REAL minus system/integration.admin (included people/QA) | `SUPERSEDED_CLAIM_REGISTER.md`; `CARMEN_SYNTH_MEMBERSHIP_SCOPE_CORRECTION.md` | **SUPERSEDED** | Expect Controles / QA Ver como absent on owner path |
| Role preview requires `system.admin` + `management.org.read` | `SUPERSEDED_CLAIM_REGISTER.md` | **SUPERSEDED** | Gate now `management.org.read` OR `people.admin` |
| Role preview = full resource projection | `SUPERSEDED_CLAIM_REGISTER.md` | **OVERCLAIMED / PARTIAL** | Vista copy vs real narrowing |
| `DEMO_MODE_POPULATED_ACROSS_PRODUCT = YES` for Carmen REAL org path | `POST_FINISH_CLAIM_AUDIT.md`; `FORENSIC_CONTROL_TOWER_SUMMARY.md` | **MATERIAL_OVERCLAIM / CONTRADICTED** for Carmen | Banner ≠ rows |
| `PF8_BV = PASS 33/33` as owner-journey proof | `POST_FINISH_CLAIM_AUDIT.md`; `PF8_33_ASSERTION_BREAKDOWN.md` | **INSUFFICIENT** as Carmen proof | Still cited in addendum receipts |
| `AI_OWNER_REVIEW_READY` PASS implied | `SUPERSEDED_CLAIM_REGISTER.md`; T01 | **UNPROVEN / NO** | Must stay hidden (UPR-13) |
| FINAL tip `e5f6d3a` live forever | `SUPERSEDED_CLAIM_REGISTER.md` | **SUPERSEDED** | Pin moves |

---

## Focus themes → UPR index

| Focus (PP-8 brief) | UPR ids |
|---|---|
| Buttons removed / tour decisions | UPR-01, UPR-02, UPR-03, UPR-04, UPR-20, UPR-21 |
| Demo chrome | UPR-05, UPR-17, UPR-18, UPR-19 |
| View As / evaluation | UPR-16, UPR-27, UPR-34, UPR-37 |
| Coverage | UPR-25, UPR-26, UPR-27 |
| Progress vocab | UPR-28 |
| Cliente360 tabs | UPR-07, UPR-08, UPR-29, UPR-30 |
| Search | *(covered by L01; no extra discrete URL-preservation for ⌘K beyond UPR-18 palette DROP note in nav audit)* |
| Mobile | UPR-14, UPR-15 |
| AI = NO / hide live | UPR-13 |
| Conversations / certainty / honesty | UPR-09–UPR-12, UPR-23 |
| Compromisos / approval continue | UPR-06, UPR-22 |
| Safety / acceptance process | UPR-31, UPR-32 |

**Search note:** Command-palette View As + cross-company fail-closed remains **L01**. The archaeology add-on is demo-query preservation on palette/nav (UPR-18), not a second search-auth row.

---

## Sources mined (non-exhaustive index)

| Area | Paths |
|---|---|
| Scorecard | `.../final-rc-evidence-0268843/FINAL_V1_REQUIREMENTS_RECONCILIATION.md`, `FINAL_V1_SCORECARD_AND_VERDICT.md` |
| Acceptance / CT3 receipts | `PRODUCT_ACCEPTANCE_ADDENDUM.md`, `CT3_FINAL_RECEIPT.md`, `CT3_HOSTED_BV.md`, `CT3_VISUAL_ACCEPTANCE.md`, `CT3_COPY_RECEIPT.md`, `CT3_DEVIATIONS.md`, `POST_FINISH_ADDENDUM_RECEIPT.md` |
| Tours / Story | `workers/pf6-receipt.md`, `STORY_MODE_20_STEP_RECONCILIATION.md`, `lane-e-receipt.md` |
| Forensic / claims | `FORENSIC_CONTROL_TOWER_SUMMARY.md`, `POST_FINISH_CLAIM_AUDIT.md`, `NAVIGATION_STATE_PRESERVATION_AUDIT.md`, `OWNER_JOURNEY_DEAD_END_AUDIT.md`, `OWNER_DEMO_COMPANY_CONTEXT.md` |
| Coverage / ownership | `OWNERSHIP_COVERAGE_HANDOFF_RULES.md`, `RC3_COVERAGE_UI_DIAGNOSIS.md`, `workers/CR3_CR4_OWNERSHIP_APPROVAL_GAP.md` |
| RC deltas | `RC1_TO_RC2_REQUIREMENT_DELTA.md`, `RC3_LOCAL_CUT_GATE.md`, `SUPERSEDED_CLAIM_REGISTER.md` |
| Visual / Cliente360 gaps | `workers/VISUAL_HIERARCHY_GAP.md`, `workers/CR7_CLIENTE360_INICIO_MAP_GAP.md`, `workers/lane-a-receipt.md`, `workers/lane-d-receipt.md`, `workers/lane-f-receipt.md` |
| Agent transcripts | Parent CT2/CT3 thread `agent-transcripts/999f7859-f4aa-4263-bf79-9a9266ea71fe/` (points at same ops docs; no additional inventable requirements beyond cited files) |

---

## Counts

| Metric | Value |
|---|---|
| Scorecard master rows | **37** (A01–T01) |
| UNREPRESENTED_PRIOR_REQUESTS listed | **37** (UPR-01…UPR-37) |
| Invented (uncited) requirements | **0** |
| App product code edited | **NO** |

**PP-8 archaeology status:** COMPLETE (read-only evidence file).
