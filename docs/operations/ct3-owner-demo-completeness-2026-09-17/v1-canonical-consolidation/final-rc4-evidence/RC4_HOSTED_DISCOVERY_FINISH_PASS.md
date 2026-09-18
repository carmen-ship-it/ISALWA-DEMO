# RC4 HOSTED DISCOVERY — FINISH PASS (pre-RC5)

**RC4_SHA (frozen):** `9e1cfe3ee1f18e568b7f34254e5794cf49baa8b7`  
**Policy:** No patch · no commit · no deploy · no RC5 implementation  
**Date:** 2026-09-17 (finish pass)

Confirmed P0s remain: **RC5-01**, **RC5-02**, **RC5-09**.

---

## 1. STORY MODE — 20/20 CONTRADICTION RESOLVED

### What “ROUTE_MISMATCHES = 20/20” meant (prior wording)

Prior BV compared **Siguiente** (overlay step counter only) to each step’s **CTA target route**.  
That comparison is **invalid as a product failure**.

**By design** (`OwnerStoryMode`):

- **Siguiente / Anterior** only change `current` inside the overlay. They do **not** navigate the host URL.
- Host URL while advancing with Siguiente stays on the Story launch route (typically `/inicio?datos=demo&story=1`).
- **Normal product path** is the step **CTA Link** (`hrefFor` → seeded DEMO MADERAS routes + `?datos=demo`).

### Per-step matrix (canonical)

| STEP | STORY_TARGET_ROUTE (CTA) | EXPECTED_NORMAL_ROUTE | ACTUAL after Siguiente | MATCH | WHY_DIFFERENT | PRODUCT_PROBLEM |
|------|--------------------------|------------------------|------------------------|-------|---------------|-----------------|
| 1 | `/clientes/01M2PM95…?datos=demo` | same as CTA | stays `/inicio?…&story=1` | NO | Siguiente is overlay-only | **NO** |
| 2 | `/clientes/01M2PM95…?datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 3 | `/clientes/01M2PM95…?tab=comercial&datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 4 | `…/oportunidades/01M2PM9GD3…?datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 5 | `…/cotizaciones/01M2PM9KSJ…?datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 6 | `/api/quotes/01M2PM9KSJ…/pdf` | PDF API | stays inicio | NO | overlay-only | **NO** |
| 7 | `…/cotizaciones/01M2PM9KSJ…?datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 8 | `/trabajo/01M2PMA7E1…?datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 9 | `…/cotizaciones/01M2PM9KSJ…?datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 10 | `…/pedidos/01M2PMA280…?datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 11 | `…/pedidos/01M2PMA280…?datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 12 | `/trabajo/01M2PMAB52…?datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 13 | `…/pedidos/01M2PMA280…?datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 14 | `/api/delivery-notes/01M2PMCS…/pdf` | PDF API | stays inicio | NO | overlay-only | **NO** |
| 15 | `…/pedidos/01M2PMA280…?datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 16 | `…/pedidos/01M2PMA280…?datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 17 | `/clientes/01M2PM95…?tab=documentos&datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 18 | `/clientes/01M2PM95…?tab=historial&datos=demo` | same | stays inicio | NO | overlay-only | **NO** |
| 19 | `/inicio?datos=demo` | same | stays inicio | YES* | already on inicio | **NO** |
| 20 | `/inicio?lente=gerencia&datos=demo` | same | stays inicio (no lens) | NO | Siguiente does not apply lens | **NO** (CTA must) |

\*Step 19 MATCH only because target is already `/inicio`.

**CTA target validity:** step 1 target loaded successfully via direct URL → DEMO MADERAS ORIENTE.

**CTA click observation (step 1):** click “Ver cliente demo” closed overlay and left `/inicio?datos=demo` **without** navigating to Cliente360. Direct navigation to the same href **works**. Classify: **PRODUCT_FAIL or HARNESS_FAIL** — `onClick={closeStory}` may race Link navigation. Treat as **P1 / RC5-07 scope** until re-proven.

### Canonical story scores

**STORY_MODE_STEPS_PASS** = **20** (overlay Siguiente narrative)  
**STORY_NORMAL_ROUTE_MATCHES** = **0** when scored as “Siguiente equals CTA” — **and that is not a product defect**  
**STORY_NORMAL_ROUTE_MISMATCHES** = **0 product mismatches for Siguiente-by-design**  
**STORY_CTA_TARGET_ROUTES_RESOLVE** = **20/20** (seeded hrefs)  
**STORY_CTA_CLICK_NAV_HOSTED** = **FAIL observed once** (step 1)

**RC5-07 revised:** not “Siguiente must change URL”; focus = ensure CTA navigation reliably reaches normal product routes (and optionally lens for step 20).

---

## 2. FRESH QUOTE CROSS-PAGE — BUG VS VALID SEMANTICS

### A. Opportunity after Quote

**Canonical contract** (`oportunidades/[opportunityId]/page.tsx`):

- When linked quote exists → primary = **Ver cotización** + show quote number  
- Secondary **Crear cotización** still allowed  
- `opportunityNextStep()` statement still says “Prepare una cotización…” but detail **overrides hrefLabel** to Ver cotización when linked

**Hosted actual (RC4-DISC opp `01M2RJBF…`):**

- Linked **Q-000008** shown  
- Primary **Ver cotización**  
- Secondary **Crear cotización** present  

**OPPORTUNITY_AFTER_QUOTE_EXPECTED** = show linked Quote; primary Ver cotización; allow another Quote  
**OPPORTUNITY_AFTER_QUOTE_ACTUAL** = matches on **detail**  
**BUG (detail)** = **NO**

**BUG (Inicio / list “Próximo: Crear cotización”)** = **YES** — list uses status-only `opportunityNextStep` without linked-quote awareness (RC5-03).

### B. Cliente360 “Sin cotizaciones enviadas”

**QUOTE_EXISTS** = YES (Q-000008 accepted → pedido; Q-000006/Q-000007 draft)  
**QUOTE_SENT_RECORDED** = **NO** — `/cotizaciones?status=submitted&datos=demo` = **Sin cotizaciones**  
**C360_COPY_EXPECTED** = “Sin cotizaciones enviadas” when `status=submitted` count is 0  
**C360_COPY_ACTUAL** = “Sin cotizaciones enviadas”  
**BUG** = **NO** (not a cross-page defect for unsent/non-submitted)

**USER_CREATED_DATA_CROSS_PAGE_SYNC** = **PARTIAL**

**Exact mismatches only:**

1. Inicio / org list: opp with linked quote still “Próximo: Crear cotización” (detail correctly Ver cotización).  
2. Post-create redirect drops `?datos=demo` (RC5-02) — false not-found until query restored.

---

## 3. ESCALAR A GERENCIA

**Desk:** Aprobaciones Demo = empty.  
**Submitted quotes:** zero.  
**Prerequisite path:** Enviar draft (e.g. Q-000006) → Solicitar aprobación → Jefe → Escalar.

**This finish pass:** mutation click **Enviar cotización** was **harness-blocked** (write gate). Could not establish pending approval via UI in this session.

**ESCALATE_GERENCIA_HOSTED** = **HARNESS_FAIL** (blocked before product verdict)  
**Also:** empty submitted queue + empty Aprobaciones → product path **reachable in principle** via Enviar (no SEED required if Enviar works).  
**SEED_DEPENDENCY_PRODUCT_GAP** = **NO** for escalate *if* Enviar+Solicitar work; **UNPROVEN** until harness allows the write.

---

## 4–5. RESPONSIBILITY + RC5-09 FORENSICS

### RC5-09 root cause (no fix)

| Layer | Finding |
|-------|---------|
| **COMPONENT** | `TemporaryCoveragePanel` |
| **RENDER_CONDITION** | `canManageCoverage={!evaluation.active && authority.canManageCoverage}` on C360 RSC |
| **evaluation.active** | from `ROLE_PREVIEW_PERSONA_COOKIE` via `getEvaluationProjection()` |
| **Client View As** | `RolePreviewProvider.setPersona` syncs cookie + localStorage **but does not `router.refresh()`** |
| **allowMutations** | header uses `allowMutations={!evaluation.active}` |
| **SERVER_ACTION** | `grantCustomerCoverageAction` / `revoke…` / reassign call `assertRolePreviewAllowsMutation()` |
| **SERVER_ASSERTION** | Present — Solo lectura should DENY submit |

**Classification:** **BOTH**

1. **UI_FALSE_AFFORDANCE (primary hosted symptom):** soft View As → banner Solo lectura while SSR still shows **Asignar apoyo temporal** until hard refresh.  
2. **SERVER:** gate exists; soft-UI leak does not prove server allow.  
3. **After hard refresh under Asesor · Carmen Staging:** Andina C360 → **Sin permiso** (own-visibility) — coverage form gone; page blocked.  
4. Soft exit View As without refresh can leave stale “Sin permiso” until hard navigate.

**RC5-09 fix scope (do not implement yet):**

- On `setPersona` / exit: `router.refresh()` (or equivalent) so RSC remounts with cookie  
- Optionally client-hide mutation panels when `blocksMutations`  
- Keep / verify server assert on grant, revoke, reassign  
- Re-test Quitar / Reasignar under View As after refresh

**COVERAGE_GRANT_HOSTED** = UNPROVEN (typeahead typed free text; no confirmed member option / submit harness-limited)  
**COVERAGE_REVOKE_HOSTED** = UNPROVEN  
**COVERAGE_CANNOT_CONVERT_HOSTED** = UNPROVEN  
**REASSIGNMENT_HOSTED** = UNPROVEN  
**VIEW_AS UI after soft activate** = FAIL (controls visible)  
**VIEW_AS UI after hard refresh** = coverage unavailable (page permission / gate)  
**VIEW_AS SERVER DENY** = UNPROVEN submit this pass (code asserts present)

---

## 6–9. LOOPS (status)

| Loop | Result | Notes |
|------|--------|-------|
| **FULL_COMMITMENT_LOOP_HOSTED** | UNPROVEN / HARNESS-limited | Seeded commitments visible on Inicio; create/complete mutations not completed this pass |
| **FULL_CONVERSATION_LOOP_HOSTED** | PARTIAL | Review+Ignore PASS prior; manual register + new-session Ignore re-proof UNPROVEN this pass |
| **FULL_COMMERCIAL_LOOP_HOSTED** | PARTIAL | Opp→Quote→lines→PDF→accept→Pedido→Nota done prior with RC5-02 workaround; Registrar enviada / approval / escalate blocked or skipped (Q-000008 already pedido; Enviar harness-blocked) |
| **FULL_POSTSALE_LOOP_HOSTED** | PARTIAL | Review solicit + Nota + PDF PASS; Salida/Entrega UNPROVEN; production/warehouse facts UNPROVEN |
| **FULL_ISSUE_LOOP_HOSTED** | FAIL | RC5-01 |

**ADDITIONAL_COMMERCIAL_PRODUCT_FAILURES** =

- RC5-02 redirect  
- RC5-03 list next-step  
- Catalog disconnected (special item)  
- Zero submitted quotes after convert journey (enviadas empty — may be valid)

**POSTSALE_PRODUCT_FAILURES** = none new beyond UNPROVEN Salida/Entrega/facts

---

## 10. SECURITY (rows)

| Assertion | Result |
|-----------|--------|
| Demo SYNTH client under `?datos=real` | PASS — “Cliente no disponible” (Maderas) |
| Demo issue under `?datos=real` | PASS prior — not found |
| REAL → SYNTH leak | UNPROVEN full matrix |
| Cross-company URL/API/search | UNPROVEN |
| Other-advisor / unauthorized resources | UNPROVEN |
| View As soft: coverage UI still enabled | **FAIL** (RC5-09) |
| View As hard refresh: Andina blocked for Asesor own | PASS isolation-ish |
| Coverage/reassign server deny under View As | UNPROVEN submit |

**HOSTED_TENANT_NEGATIVES** = UNPROVEN (incomplete)  
**HOSTED_RESOURCE_NEGATIVES** = UNPROVEN  
**VIEW_AS_HOSTED_SECURITY** = **FAIL** (soft UI false affordance) + partial PASS after refresh  
**SEARCH_AUTH_HOSTED** = UNPROVEN

---

## 11. FRESH SESSION

**FRESH_SESSION_NON_ISSUE** = PASS for Demo nav/refresh Story/commercial with known RC5-02 caveat  
**DATA_MODE_REDIRECT_DEFECT_IMPACT** = RC5-02 — create redirects strip Demo → false not-found  
**OTHER_FRESH_SESSION_FAILURES** = View As soft enter/exit without refresh leaves stale RSC UI/permissions

---

## 12. ROLE EXPERIENCE

| Role | Finding |
|------|---------|
| Asesor (View As) | Soft: false mutation affordance; hard: may lose access to other-owner Demo clients |
| Others | UNPROVEN full Inicio desk tour |

**ROLE_EXPERIENCE_FAILURES** =

- View As soft mutation false affordance (RC5-09)  
- Inicio list next-step wrong for opps with quotes (all roles seeing list)

---

## 13. SEED / CATALOG

**SEED_DEPENDENCY_PRODUCT_GAPS** =

1. Product catalog disconnected — quote lines require **ítem especial**  
2. Conversation dual IDs (`owner-demo-conversation:*` vs `demo-conv-*`)  
3. Rich ops desks still seed-heavy for full Production/Warehouse facts  

**CATALOG_DISCONNECTED_IMPACT** = special-item path works; human path incomplete  
**BLOCKS_CARMEN** = **NO** (technical acceptance can use special item)  
**BLOCKS_ISA_ALVARO** = **YES** (normal catalog product selection expected)

---

## 14. HUMAN FORM TOKENS

| Token | ROUTE | VISIBLE | MUST TYPE | CAN IGNORE | EXPECTED | FUNCTIONAL_BLOCKER | ISA_BLOCKER | POLISH |
|-------|-------|---------|-----------|------------|----------|--------------------|-------------|--------|
| `open` | Opp etapa field | YES | YES to save if editing | NO if editing etapa | Spanish stage label | YES if save requires it | YES | NO |
| `off-catalog:…` | Pedido line ref | YES | NO | YES | “Ítem especial / fuera de catálogo” | NO | YES (trust) | borderline → **ISA blocker** |
| Quote “Ítem especial / fuera de catálogo” | Quote line | YES | NO | YES | already human | NO | NO | — |
| `NE-PILOT-{ULID}` | Nota UI+PDF | YES | NO | YES | human NE number | NO | YES | provisional |

---

## 15. MOBILE (~390)

| Surface | Result |
|---------|--------|
| Inicio | PASS functional (hamburger) |
| Pedido | PASS functional prior |
| Quote draft | PASS functional (forms reachable) |
| Cliente360 | PASS (Maderas loaded) |
| Conversaciones / Story / Mi Trabajo @390 | MOBILE_UNPROVEN |

**MOBILE_FUNCTIONAL_FAILURES** = []  
**MOBILE_POLISH** = UNPROVEN  
**MOBILE_PASS_COUNT** = 4  
**MOBILE_UNPROVEN** = Conversaciones, Story overlay @390, Mi Trabajo

---

## 16. PARTIAL PROMISES

| ID | DESCRIPTION | HOSTED_FINDING | STILL_PARTIAL? | BLOCKS_CARMEN? | BLOCKS_ISA? | POLISH_ONLY? | RC5_CODE? |
|----|-------------|----------------|----------------|----------------|-------------|--------------|-----------|
| P-C360-02 | Header identity/actions | Not fully re-scored | YES | NO | maybe | mostly | maybe |
| P-C360-08 | One panel | Not fully re-scored | YES | NO | NO | YES | NO |
| P-COM-10 | Cliente aceptó | Folded into convert — worked on Q-000008 | YES | NO | NO | YES | NO |
| P-COM-12 | Quién tiene la pelota | Present on quote | YES | NO | NO | YES | maybe |
| P-VIS-02 | Who-has-ball beyond quote | Partial | YES | NO | maybe | NO | maybe |
| P-VIS-03 | Shared steppers | Present commercial strip | YES | NO | NO | YES | NO |
| UPR-15 | (ledger) | Not re-proven | YES | TBD | TBD | TBD | TBD |
| UPR-36 | (ledger) | Not re-proven | YES | TBD | TBD | TBD | TBD |

---

## 17. ALL NINE ROOT CAUSES (explicit)

**RC5-01** = Issue GET flat summary vs web `{ issue }` wrapper  
SYMPTOMS: Issue detail load error; Resolver blocked  
LOOPS: ISSUE · SECURITY_IMPACT: none isolation · CARMEN_BLOCKER: YES · ISA: YES · PRODUCT: YES  

**RC5-02** = Post-create / convert redirects omit Demo `datos` query  
SYMPTOMS: false not-found Opp/Quote/Pedido  
LOOPS: COMMERCIAL · CARMEN: YES · ISA: YES · PRODUCT: YES  

**RC5-03** = Opp list/Inicio next-step ignores linked quote  
SYMPTOMS: “Crear cotización” after quote exists (detail OK)  
LOOPS: COMMERCIAL · CARMEN: NO · ISA: YES · PRODUCT: YES  

**RC5-04** = Conversation id mismatch `owner-demo-conversation:*` vs `demo-conv-*`  
SYMPTOMS: deep-link miss · LOOPS: CONVERSATION · CARMEN: maybe · ISA: YES · PRODUCT: YES  

**RC5-05** = Raw/internal tokens in human UI (`open`, `off-catalog:…`, `NE-PILOT-ULID`)  
ISA: YES · CARMEN: NO · PRODUCT: YES (labels)  

**RC5-06** = Catalog disconnected  
ISA: YES · CARMEN: NO · PRODUCT: YES (or FUTURE if out of V1)  

**RC5-07** = Story CTA navigation reliability (Siguiente URL mismatch is **by design**, not this)  
SYMPTOMS: CTA click may close without navigate · CARMEN: maybe · ISA: YES · PRODUCT: YES  

**RC5-08** = Stale quote line UI after add  
CARMEN: NO · ISA: polish/UX · PRODUCT: YES  

**RC5-09** = View As soft-activate does not refresh RSC; mutation UI false affordance  
SECURITY_IMPACT: YES (UI) · CARMEN: YES · ISA: YES · PRODUCT: YES · SERVER assert exists  

**ROOT_CAUSES_TOTAL** = **9** (no new root this pass; escalate remains unproven not a new root)

---

## 18. FINAL DISCOVERY GATE

**RC4_HOSTED_DISCOVERY_COMPLETE** = **NO**

Remaining: escalate (harness-blocked Enviar), coverage happy-path submits, commitment mutations, full tenant/resource security rows, Story CTA re-proof, remaining mobile, role desk tour.

| Score | Value |
|-------|--------|
| KNOWN_PRODUCT_FAILURES_TOTAL | 8+ |
| KNOWN_SECURITY_FAILURES_TOTAL | 1+ (RC5-09 soft UI) |
| KNOWN_HARNESS_FAILURES_TOTAL | 1+ (Enviar mutation gate this pass) |
| KNOWN_UNPROVEN_TOTAL | many |
| RC3_MISSING_ACTIONS_7_HOSTED | **5/7** (Escalar HARNESS; Resolver FAIL) |
| MANUAL_DATA_ENTRY_HOSTED | PASS (special item) |
| FRESH_UI_CREATED_JOURNEY | PRODUCT_FAIL first (RC5-02); recoverable |
| QUOTE_PDF_HUMAN_DOWNLOAD / BYTES | PASS |
| NOTA_PDF_HUMAN_DOWNLOAD / BYTES | PASS |
| USER_CREATED_DATA_CROSS_PAGE_SYNC | PARTIAL (list next-step only among true mismatches) |
| FULL_*_LOOP | see §6–9 |
| STORY_MODE_PASS | 20 overlay; CTA click FAIL once |
| MOBILE_FUNCTIONAL_FAILURES | [] |
| ROOT_CAUSES_TOTAL | 9 |
| **P0_RC5** | RC5-01, RC5-02, RC5-09 |
| **P1_RC5** | RC5-03, RC5-04, RC5-06, RC5-07 (CTA), Escalar proof |
| **ISA_ALVARO_BLOCKERS** | RC5-01,02,05,06,09; list next-step; catalog |
| **POLISH** | RC5-08; some partials |
| **HARNESS_ONLY** | Enviar click blocked this pass |
| **UNPROVEN** | escalate product, coverage happy-path, commitment create, tenant matrix, remaining mobile/roles |
| **READY_TO_IMPLEMENT_RC5** | **NO** |

**SAFE_TO_BEGIN_CARMEN_PRODUCT_ACCEPTANCE** = **NO**  
**SAFE_TO_INVITE_ISA_ALVARO** = **NO**  
**USER_ACCEPTED** = **NO**

---

## CARMEN HANDOFF — WHAT I NEED TO KNOW

1. Prior “Story 20/20 route mismatches” was a **scoring error**: Siguiente is overlay-only by design → **0 product mismatches** for that comparison. CTA targets resolve; one CTA click failed to navigate (re-proof needed).  
2. **“Sin cotizaciones enviadas” is valid** — Demo submitted list is empty; do not treat as cross-page bug. Detail Opp correctly shows **Ver cotización**. List “Crear cotización” after quote is the real RC5-03 bug.  
3. **RC5-09** = soft View As without RSC refresh → coverage UI false affordance; server assert exists; hard refresh applies evaluation.  
4. Escalar still not product-proven — **HARNESS_FAIL** blocked Enviar this pass; desk empty; path is UI-capable in principle.  
5. Discovery **still incomplete**; do **not** implement RC5 until escalate/coverage mutation proofs finish or Carmen authorizes implement-known-P0s-only.
