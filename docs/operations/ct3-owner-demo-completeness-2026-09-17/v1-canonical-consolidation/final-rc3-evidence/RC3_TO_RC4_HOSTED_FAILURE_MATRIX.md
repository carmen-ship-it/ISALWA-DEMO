# RC3 → RC4 HOSTED FAILURE MATRIX

**Mode:** Root-cause + complete failure reconciliation (NO implementation)  
**Date:** 2026-09-17  
**RC3 frozen fail SHA:** `fe66f0353d83223033710ee535163080c72b8959`  
**Do not patch RC3. Do not deploy. Do not begin Carmen acceptance. Do not invite Isa/Álvaro.**

Historical PASS/FAIL values below are preserved from hosted BV evidence. New analysis classifies root causes and RC4 scope only.

---

## 1. PRESERVED RC3 FAILURE IDENTITY

```
RC3_SHA         = fe66f0353d83223033710ee535163080c72b8959
WEB_DEPLOY_ID   = dep-dam3jpoae00c73cvncqg
API_DEPLOY_ID   = dep-dam3jpe7bikc7386r090
WEB_RUNTIME_SHA = fe66f0353d83223033710ee535163080c72b8959
API_RUNTIME_SHA = fe66f0353d83223033710ee535163080c72b8959
SAME_SHA_PROOF  = YES
RC3_HOSTED_CODE_FROZEN = YES
```

**Evidence (do not rewrite):**
| Artifact | Path |
|---|---|
| Hosted BV receipt | `FINAL_RC3_HOSTED_BV_RECEIPT.md` |
| Base harness results | `hosted-bv-rc3/rc3-hosted-bv-results.json` (117 checks) |
| Supplement results | `hosted-bv-rc3/rc3-hosted-bv-supplement.json` |
| Diag | `hosted-bv-rc3/rc3-diag.json` |
| Console logs | `hosted-bv-rc3/rc3-hosted-bv-console.log`, `rc3-hosted-bv-supplement.log` |
| Screenshots | `hosted-bv-rc3/screens/*.png` |
| SYNTH mutation artifacts | Andina opp attempt `RC2-BV-*` / `RC3-BV-*` stamps (form reached; durable opp id not always captured) |
| Issue opened | `01M2PRV5H1JTARSF3APN57PP0Y` (resolve CTA absent) |

---

## 2. SEVEN MISSING HOSTED MANUAL ACTIONS (exact)

Receipt: `MANUAL_ACTIONS_V1_PROMISED=41`, `HOSTED_REACHABLE=34`, `HOSTED_MISSING=7`.

These seven are the V1-promised actions the hosted pass did **not** prove reachable/actionable:

### M1 — Resolver incidencia
| Field | Value |
|---|---|
| ACTION | Resolver incidencia |
| PROMISE_ID | P-ISS-03 |
| ROUTE | `/incidencias/[issueId]` (opened `01M2PRV5H1JTARSF3APN57PP0Y`) |
| EXPECTED CTA | `Resolver incidencia` (`ResolveIssueForm` / `ISSUE_COPY.resolveIssue`) |
| ACTUAL HOSTED RESULT | Form not in DOM (`resolve=0`) |
| VISIBLE? | NO |
| ENABLED? | n/a |
| CLICKABLE? | NO |
| COMMAND REACHED? | NO |
| PERSISTED? | NO |
| RELATED SURFACES UPDATED? | NO |
| HISTORY/AUDIT? | NO |
| ROOT_CAUSE | CTA gated by `canResolve = !terminal && (issue.manage OR actor==owner)`. Local tests only assert source contains `ResolveIssueForm`/`canResolve` (false positive for hosted). Hosted: either issue terminal, actor not owner, or `issue.manage` not present in live trusted context — **CTA never rendered** (class A + C + E). |
| SAME_ROOT_CAUSE_AS_P0? | YES = P0-3 |
| RC4_FIX_REQUIRED? | YES |

### M2 — Review conversation suggestion
| Field | Value |
|---|---|
| ACTION | Review (Revisar) suggestion |
| PROMISE_ID | P-CNV-01 |
| ROUTE | `/conversaciones` |
| EXPECTED CTA | Revisar / Review on suggestion card |
| ACTUAL | `review=0` in session |
| VISIBLE? | NO |
| ENABLED? | n/a |
| CLICKABLE? | NO |
| COMMAND REACHED? | NO |
| PERSISTED? | n/a |
| RELATED / HISTORY? | NO |
| ROOT_CAUSE | No suggestion card with Review in the BV session (empty suggestion state **or** wiring not reached). Durable Review→submit path **UNPROVEN** hosted. |
| SAME_ROOT_CAUSE_AS_P0? | NO |
| RC4_FIX_REQUIRED? | YES — prove or fix reachability |

### M3 — Ignore conversation suggestion
| Field | Value |
|---|---|
| ACTION | Ignore (Ignorar) suggestion |
| PROMISE_ID | P-CNV-01 (Ignore durability) |
| ROUTE | `/conversaciones` |
| EXPECTED CTA | Ignorar |
| ACTUAL | `ignore=0` |
| VISIBLE? | NO |
| ENABLED? | n/a |
| CLICKABLE? | NO |
| COMMAND REACHED? | NO |
| PERSISTED? | **Fresh-session Ignore durability UNPROVEN** |
| ROOT_CAUSE | Same as M2 — no Ignore control in session. Cannot claim durable Ignore hosted. |
| SAME_ROOT_CAUSE_AS_P0? | NO |
| RC4_FIX_REQUIRED? | YES — hosted Ignore persistence still required |

### M4 — Solicitar revisión Producción
| Field | Value |
|---|---|
| ACTION | Solicitar revisión (Producción) |
| PROMISE_ID | P-OPS-02 |
| ROUTE | Pedido Maderas `…/pedidos/01M2PMA280KX4AAV7049YKNE07` · `OrderPrepCard` |
| EXPECTED CTA | Button label **`Solicitar revisión`** (dept title PRODUCCIÓN) |
| ACTUAL | Harness count `prod=0` using regex `/Solicitar revisión Producción\|Producción/i` |
| VISIBLE? | **UNPROVEN** — harness label mismatch (product label is exactly `Solicitar revisión`, not `Solicitar revisión Producción`) |
| ROOT_CAUSE | **Primarily TEST HARNESS DEFECT.** Product also requires production assignee (`canRecordProduction(scopes) ? actor : null`); if scopes missing → `noAssignee` copy, no button. |
| SAME_ROOT_CAUSE_AS_P0? | NO |
| RC4_FIX_REQUIRED? | Re-prove with correct selector; fix product only if noAssignee falsely blocks owner-eval |

### M5 — Solicitar revisión Almacén
| Field | Value |
|---|---|
| ACTION | Solicitar revisión (Almacén) |
| PROMISE_ID | P-OPS-02 |
| ROUTE | same Pedido `OrderPrepCard` |
| EXPECTED CTA | `Solicitar revisión` under ALMACÉN |
| ACTUAL | harness `alm=0` (same regex defect) |
| VISIBLE? | UNPROVEN (warehouse mayRequest=true even without assignee) |
| ROOT_CAUSE | TEST HARNESS DEFECT (selector); product likely shows button |
| SAME_ROOT_CAUSE_AS_P0? | NO |
| RC4_FIX_REQUIRED? | Re-prove; product fix only if still absent |

### M6 — Solicitar revisión Compras
| Field | Value |
|---|---|
| ACTION | Solicitar revisión (Compras) |
| PROMISE_ID | P-OPS-02 |
| ROUTE | same Pedido `OrderPrepCard` |
| EXPECTED CTA | `Solicitar revisión` under COMPRAS |
| ACTUAL | harness `com=0` |
| VISIBLE? | UNPROVEN |
| ROOT_CAUSE | TEST HARNESS DEFECT (selector) |
| SAME_ROOT_CAUSE_AS_P0? | NO |
| RC4_FIX_REQUIRED? | Re-prove |

### M7 — Escalar a Gerencia
| Field | Value |
|---|---|
| ACTION | Escalar a Gerencia |
| PROMISE_ID | P-COM-09 |
| ROUTE | `/aprobaciones` or Quote decision surface |
| EXPECTED CTA | Escalar a Gerencia + Gerente typeahead |
| ACTUAL | `escalateControls=0`; empty pending desk; marked weak PASS in supplement |
| VISIBLE? | NO in BV session |
| ENABLED? | n/a |
| CLICKABLE? | NO |
| COMMAND REACHED? | NO |
| PERSISTED? | NO |
| ROOT_CAUSE | No pending approval owned by actor in DEMO session → CTA not exercised. **UNPROVEN hosted**, not proven product absence. Local EscalateApproval exists. |
| SAME_ROOT_CAUSE_AS_P0? | NO |
| RC4_FIX_REQUIRED? | YES — create disposable pending approval and prove escalate path (V1 commercial step) |

---

## 3. THREE HOSTED DEAD ENDS (exact)

Receipt: `LOOPS_WITH_DEAD_ENDS_HOSTED = 3`. These are **not** identical to the three P0s.

### D1 — ISSUE LOOP
| Field | Value |
|---|---|
| LOOP | Issue |
| START STATE | `/incidencias` → open `01M2PRV5H1JTARSF3APN57PP0Y` |
| USER ACTION | Seek Resolver incidencia |
| EXPECTED | Resolve form → submit → resolved + history + Work reconcile |
| ACTUAL | Detail loads; **no Resolve CTA** |
| WHY DEAD END | Cannot complete closure step |
| ROOT CAUSE | M1 / P0-3 (`canResolve` false or terminal) |
| AFFECTED PROMISES | P-ISS-03, issue journey |
| RC4 FIX | Prove issue.manage in live context; non-terminal issue; owner/manage path; hosted mutate |

### D2 — COMMERCIAL LOOP
| Field | Value |
|---|---|
| LOOP | Commercial |
| START STATE | Andina Cliente360 → Nueva oportunidad |
| USER ACTION | Create opportunity → Crear cotización |
| EXPECTED | Opportunity detail with Crear cotización CTA → quote |
| ACTUAL | `commercial_create_opportunity` PASS/PARTIAL; **`commercial_create_quote` PARTIAL — no new quote CTA after opp create**; later Andina seeded quote used for soft cues |
| WHY DEAD END | Fresh disposable commercial chain stops after opportunity |
| ROOT CAUSE | Post-create navigation/CTA not found (form/redirect/eligibility). Later steps blocked by this, not independently failed. |
| AFFECTED PROMISES | P-COM-01…P-COM-11 chain |
| RC4 FIX | Disposable SYNTH commercial path end-to-end with recorded IDs |

### D3 — AUDIT / FRESH-SESSION NAV
| Field | Value |
|---|---|
| LOOP | Fresh-session nav tour + Audit / Cross-page truth |
| START STATE | Authenticated Demo; navigate `/auditoria?datos=demo` |
| USER ACTION | Open Auditoría desk |
| EXPECTED | Product list or product-safe AccessDenied / empty |
| ACTUAL | **Application error** digest `3919104780` |
| WHY DEAD END | Page unusable; blocks audit evidence + fresh-session nav completeness |
| ROOT CAUSE | P0-2 — uncaught server exception on `/auditoria` |
| AFFECTED PROMISES | Audit surfaces, ERROR_STATE_QUALITY, FRESH_SESSION, CROSS_PAGE (audit leg) |
| RC4 FIX | Fix root exception; product-safe unauthorized; no generic swallow |

**Note:** View As coverage (P0-1) is a **security** failure, not one of the three loop dead ends.

---

## 4. P0-1 — VIEW AS COVERAGE / CLIENTE360 MUTATIONS

### Harness vs product (critical)

| Item | Value |
|---|---|
| Product cookie | `isalwa-os-role-preview-persona` (`ROLE_PREVIEW_PERSONA_COOKIE`) |
| BV harness set | `isalwa-role-preview-persona` (**wrong name**) |
| Diag | `viewas_banner` FAIL — evaluation never activated |

**Implication:** Most hosted “View As” PASS/FAIL rows that relied on harness `setViewAs()` are **UNPROVEN** or **TEST HARNESS DEFECT**. Coverage button visible under “View As” often means **owner Carmen UI**, not a proven View As leak.

### Product trace (still required for RC4)

| Layer | Coverage grant/revoke | Reassign (`Cambiar responsable`) |
|---|---|---|
| COMPONENT | `TemporaryCoveragePanel` | `Cliente360ActionsMenu` → `ReassignOwnerForm` |
| UI GATE | `canManageCoverage = !evaluation.active && commercialAuthority.canManageCoverage` | `canReassignOwner = commercialAuthority.canReassignOwner` — **NOT** AND-gated with `!evaluation.active` |
| SERVER ACTION | `grantCustomerCoverageAction` / `revokeCustomerCoverageAction` | `reassignCommercialAccountOwnerAction` |
| SERVER GATE | `assertRolePreviewAllowsMutation` **YES** | **`assertRolePreviewAllowsMutation` MISSING** |

### Classification
| Finding | Class |
|---|---|
| Harness wrong cookie → false View As coverage FAIL | TEST HARNESS DEFECT / UNPROVEN product leak for Asignar |
| Coverage UI gated when evaluation.active true | Product OK (needs correct hosted re-prove) |
| Coverage server deny under View As | Product OK (grant/revoke gated) |
| Reassign UI not evaluation-gated | **PRODUCT SECURITY DEFECT** |
| Reassign server not View As gated | **PRODUCT SECURITY DEFECT (P0)** |
| Other Cliente360 mutations (edit party, follow-up, commitment, issue report, manual ops) | Must audit under real View As in RC4 |

**RC4-01** must fix Reassign UI+server gates and re-prove all Cliente360 header/actions mutations with **correct** cookie / real Ver como control.

---

## 5. P0-2 — `/auditoria` APPLICATION ERROR

| Field | Value |
|---|---|
| ROUTE | `/auditoria` (+ `?datos=demo`) |
| RAW OUTPUT | `Application error: a server-side exception has occurred… Digest: 3919104780` |
| REQUEST PATH | RSC `AuditoriaPage` → auth → scopes → `client.listAudit(...)` **uncaught** (line ~106) → filters / label resolvers |
| LIKELY THROW | Unhandled `OsApiError`/network from `listAudit` **or** downstream label resolve; not AccessDenied branch (owner has `commercial.org.read` / `management.org.read`) |
| VIEW_AS STATE | Owner eval (harness View As cookie ineffective) |
| DATA MODE | Demo cookie + datos=demo |
| AFFECTED ROLES | At least Owner Evaluation; Asesor View As exclusion path unproven because cookie wrong |
| AFFECTED ROUTES | `/auditoria` only proven; related audit drawers unknown |
| WHY LOCAL MISSED | No hosted/page integration test for Carmen SYNTH `/auditoria` success path; unit filters don’t load full page |

```
ROOT_CAUSE = Uncaught server exception during audit list/render (not intentional AccessDenied)
RC4_FIX = Fix backend/query/auth cause; keep unauthorized as product-safe UI; re-test Owner + View As personas
```

---

## 6. P0-3 — RESOLVER INCIDENCIA

| Hypothesis | Verdict |
|---|---|
| A. CTA never rendered | **YES** (DOM) |
| B. Wrong issue status (terminal) | POSSIBLE — not logged in BV |
| C. Capability mismatch | POSSIBLE — needs live `getTrustedAuthorization` scopes + owner id |
| D. Routing mismatch | NO — correct detail URL |
| E. Local test false positive | **YES** — `lane-d-v1-close.test.ts` source-string only |
| F. Deployed code path differs | NO — `ResolveIssueForm` is in fe66f03 tree |
| G. Other | Form below fold alone insufficient (role query finds buttons) |

**Best reconciliation:** Hosted CTA absent because `canResolve` false for that issue/actor combination; local “DONE” was implementation+source test, not hosted reachability.

---

## 7. COMMERCIAL LOOP — STEP MATRIX

| Step | Status | Notes |
|---|---|---|
| Cliente | PASS | Andina / nav |
| Opportunity (Nueva) | PASS / PARTIAL | CTA exists; create attempted |
| Quote create | **FAIL / first hard stop** | `commercial_create_quote` PARTIAL — no CTA after opp |
| lines | BLOCKED_BY_quote_create | |
| PDF (quote page) | FAIL soft / Documentos PASS | Quote page control FAIL; Documentos PDF bytes PASS |
| Registrar enviada | PARTIAL | not shown (already sent / ineligible on seeded) |
| follow-up | UNPROVEN | |
| approval | UNPROVEN | empty desk |
| escalation | UNPROVEN | M7 |
| Gerencia decision | BLOCKED_BY_escalation | |
| acceptance | PARTIAL by design (folded) | P-COM-10 |
| Convertir Pedido | UNPROVEN on disposable | convert cue on seeded |
| Pedido | PASS deep URL Maderas | index list FAIL separately |

```
COMMERCIAL_FIRST_FAILURE = Crear cotización CTA after opportunity create
```
Missing manual actions in this loop: **M7 Escalar** (later); quote-create is the first failure (not one of the named 7 missing CTA inventory, but blocks the loop).

---

## 8. RESPONSIBILITY LOOP

| Step | Status |
|---|---|
| current owner | PASS (UI) |
| temporary coverage grant | UNPROVEN / PARTIAL (typeahead not interactable; mutation skipped) |
| helper access | UNPROVEN |
| owner unchanged | UNPROVEN (needs grant) |
| coverage cannot convert | UNPROVEN hosted (local tests exist) |
| revoke | UNPROVEN |
| history | UNPROVEN |
| permanent reassignment | UNPROVEN (intentionally skipped on shared seed) |
| new owner | UNPROVEN |
| prior owner preserved | UNPROVEN |

```
RESPONSIBILITY_FIRST_FAILURE = coverage grant mutation not completed (UI typeahead / BV skip)
```
Not a proven product deny — **UNPROVEN**, plus Reassign View As server gap is separate security P0.

---

## 9. POST-SALE LOOP

| Step | Status |
|---|---|
| Pedido open | PASS (deep URL) |
| Production review request | UNPROVEN (harness selector) |
| Production Work / context / update | UNPROVEN |
| Warehouse review / fact | UNPROVEN |
| Nota create | PASS affordance |
| Nota PDF | PARTIAL — affordance yes; isolated hosted byte proof not captured this pass |
| Salida | PASS affordance |
| Entrega | PASS affordance |
| Documents | PASS (quote PDF via Documentos) |
| History | PASS Cliente360 historial |
| Audit | **FAIL** (D3) |
| Cliente360 / progress | PASS vocabulary |

```
POSTSALE_FIRST_FAILURE = Audit leg FAIL (/auditoria); review-request buttons UNPROVEN not proven FAIL
NOTA_PDF PARTIAL = no dedicated hosted GET of nota PDF bytes this BV (unlike Quote Documentos 200 application/pdf)
```

---

## 10. COMMITMENT LOOP

| Step | Status |
|---|---|
| Create | UNPROVEN (desk loads; create CTA count 0 in supplement — may be different label) |
| responsible / due | UNPROVEN |
| Inicio/attention | UNPROVEN |
| complete | UNPROVEN |
| history | UNPROVEN |

```
COMMITMENT_FIRST_FAILURE = loop not fully exercised → UNPROVEN (not proven product failure)
```
View As commitment gates exist locally; hosted View As mutation re-prove blocked by wrong cookie.

---

## 11. CONVERSATION LOOP

| Step | Status |
|---|---|
| manual register | PASS (CTA) |
| DB persistence | UNPROVEN (CTA only) |
| Conversations refresh | UNPROVEN |
| Cliente360 visibility | UNPROVEN |
| suggestion shown | UNPROVEN / absent |
| Review | FAIL/missing (M2) |
| no mutation on Review alone | UNPROVEN |
| explicit submit | UNPROVEN |
| Ignore | FAIL/missing (M3) |
| refresh persistence | UNPROVEN |
| new-session persistence | **UNPROVEN** (required; not proven) |
| provenance | UNPROVEN |

```
CONVERSATION_FIRST_FAILURE = no Review/Ignore controls in session (suggestion path)
```

---

## 12. FRESH SESSION FAIL — EXACT

```
FRESH_SESSION_FAILURE = /auditoria Application error during normal Demo nav tour
```

Not login, not demo cookie, not View As persistence, not Back/Forward (those PASS).  
**Same root as D3 / P0-2.** Real user-facing defect → RC4 blocker.

---

## 13. SECURITY FAILURES — DECOMPRESSED

| TEST | ACTOR | VIEW_AS | DATA_MODE | RESOURCE | EXPECTED | ACTUAL | UI LEAK? | API LEAK? | MUTATION? | READ? | EXISTENCE LEAK? | ROOT_CAUSE | CLASS | RC4? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| datos_reales_no_synth | Carmen | off | `?datos=real` + sticky demo cookie | /clientes | no SYNTH | SYNTH visible, cookie stayed demo | mode UX | n/a | no | yes SYNTH | no | `resolveDemoDataMode` ignores `datos=real` (only special-cases `demo`) | **PRODUCT** | YES P0/P1 |
| datos_real after forced cookie=real | Carmen | off | real | /clientes | no SYNTH | PASS | — | — | — | — | — | proves query alone insufficient | PRODUCT | YES |
| neg_viewas_mutation_blocked_coverage | Carmen | harness wrong cookie | demo | Andina coverage | no Asignar | Asignar enabled | apparent | untested | UI submit present | — | — | harness never activated evaluation | **HARNESS / UNPROVEN** | Re-prove |
| viewas_coverage (product code) | — | true | — | coverage | hidden | gated by `!evaluation.active` | no if active | server denies grant/revoke | — | — | — | code OK | re-prove | YES |
| Reassign under View As | Carmen | true (product) | demo | Cambiar responsable | deny UI+server | UI not eval-gated; **server missing mutation gate** | YES | possible | YES risk | — | — | missing `assertRolePreviewAllowsMutation` on reassign | **PRODUCT P0** | YES |
| neg_cross_company_direct_url | Carmen | off | demo | foreign party | DENY | PASS | — | — | — | — | — | OK | — | — |
| neg_unauthorized_convert_cta | Carmen | produccion* | demo | quote | no convert | PASS (0) | — | — | — | — | — | *cookie wrong → may be coincidental | UNPROVEN depth | re-prove |
| neg_produccion_quote_direct | Carmen | produccion* | demo | quote | AccessDenied/exclusion | PARTIAL | soft | — | — | — | — | harness / projection | UNPROVEN | re-prove |
| neg_asesor_audit_desk | Carmen | asesor* | demo | /auditoria | exclusion banner | PARTIAL + page may error | — | — | — | — | — | auditoria crash + cookie | PRODUCT+HARNESS | YES |
| search_owner_maderas | Carmen | off | demo | search | hit | PASS | — | — | — | — | — | OK | — | — |

\*View As cookie wrong → treat as UNPROVEN for projection claims.

---

## 14. CROSS-PAGE SINGLE TRUTH PARTIAL

| Surface | Status vs Maderas |
|---|---|
| Cliente360 Resumen/Comercial | PASS counts/links |
| Pedidos **index** | **FAIL** — seeded order not listed |
| Pedido deep URL | PASS |
| Work / Prod / Almacén deep-link | PASS orderId context |
| Documents | PASS |
| History | PASS |
| Audit | **FAIL** crash |
| Search | PASS |
| Gerencia | PASS lens load |

```
CROSS_PAGE_MISMATCHES =
  1. Pedidos index missing Maderas O-000002 while deep URL works
  2. /auditoria unusable (blocks audit reconciliation)
```
Not solely auditoria — **two** mismatches.

---

## 15. ERROR STATE FAILURES

| ROUTE | TRIGGER | RAW | EXPECTED | PRODUCT DEFECT? | PRESENTATION? |
|---|---|---|---|---|---|
| `/auditoria` | navigate Demo | Application error digest 3919104780 | list / empty / AccessDenied | YES (backend/uncaught) | YES (raw Next error) |

---

## 16. STORY MODE PARTIAL

| STEP | ROUTE | EXPECTED | ACTUAL | BLOCKED_BY_PRODUCT? | BV_ENV? | DATA? | RC4? |
|---|---|---|---|---|---|---|---|
| Entry | /inicio | Ver recorrido completo | PASS count=2 | no | no | no | — |
| Open | /inicio | Story chrome / paso | PASS opened; steps=n/a | unclear | selector | no | re-prove |
| Advance 1..n | story CTAs | Siguiente advances | advanced=0 | possible copy mismatch | YES likely | no | re-prove first |
| Full matrix | all steps | normal routes + demo | UNPROVEN | — | YES | — | YES before invite |

`STORY_NORMAL_ROUTE_MISMATCHES=0` preserved — no fake-route proof of failure.

---

## 17. MOBILE MATRIX (~390)

| Page | INTERACTION | OVERFLOW | NAV | TABS | CTA | FORM | DIALOG | PROGRESS | RESPONSIBILITY | VIEW AS |
|---|---|---|---|---|---|---|---|---|---|---|
| Inicio | PASS load | YES overflow | menu present | n/a | — | — | — | — | — | UNPROVEN |
| Cliente360 | PASS | UNPROVEN | — | UNPROVEN | — | — | — | — | UNPROVEN | UNPROVEN |
| Quote | UNPROVEN | — | — | — | — | — | — | — | — | — |
| Pedido | PASS load | UNPROVEN | — | — | — | — | — | PASS vocab | — | — |
| Mi Trabajo | UNPROVEN | — | — | — | — | — | — | — | — | — |
| Conversaciones | PASS load | UNPROVEN | — | — | — | — | — | — | — | — |
| Story Mode | PARTIAL | — | — | — | advance fail | — | — | — | — | — |

```
MOBILE_FUNCTIONAL_FAILURES = none proven beyond overflow (POLISH) + Story advance UNPROVEN
```

---

## 18. EIGHT PARTIAL PROMISES

| ID | WHAT REMAINS | HOSTED | BLOCKS CARMEN? | BLOCKS ISA/ALVARO? | RC4? | KEEP PARTIAL? |
|---|---|---|---|---|---|---|
| P-C360-02 | header polish | not upgraded | NO | YES | POLISH | YES |
| P-C360-08 | layout density | not upgraded | NO | YES | POLISH | YES |
| P-COM-10 | acceptance folded | by design | NO | NO | no | YES |
| P-COM-12 | ball quote-only | unchanged | NO | YES | POLISH | YES |
| P-VIS-02 | ball beyond quote | unchanged | NO | YES | POLISH | YES |
| P-VIS-03 | steppers polish | vocab OK | NO | YES | POLISH | YES |
| UPR-15 | color deltas | not remeasured | NO | YES | POLISH | YES |
| UPR-36 | próximo paso strip | unproven | NO | YES | POLISH | YES |

```
PARTIAL_PROMISES_BLOCKING_CARMEN = []
PARTIAL_PROMISES_BLOCKING_ISA_ALVARO = [P-C360-02, P-C360-08, P-COM-12, P-VIS-02, P-VIS-03, UPR-15, UPR-36]
PARTIAL_PROMISES_POLISH_ONLY = same as above (+ P-COM-10 keep folded)
```

---

## 19. FIVE-LAYER → ROOT-CAUSE MAP

### RC4-01 — View As mutation integrity (Cliente360)
→ Reassign UI+server gates; full header/actions audit; correct hosted View As proof  
→ SECURITY, PRODUCT

### RC4-02 — `/auditoria` uncaught exception
→ FRESH_SESSION, ERROR_STATE, CROSS_PAGE audit leg, SECURITY audit exclusion  
→ SECURITY, EXPERIENCE, JOURNEY

### RC4-03 — Resolver incidencia hosted reachability
→ ISSUE dead end, PRODUCT manual action M1  
→ PRODUCT, JOURNEY, CONTRACT (issue closure)

### RC4-04 — `?datos=real` ignored when demo cookie sticky
→ TENANT_NEGATIVES  
→ SECURITY / DEMO honesty

### RC4-05 — Disposable commercial loop (quote after opp)
→ COMMERCIAL dead end D2  
→ JOURNEY, PRODUCT, CONTRACT

### RC4-06 — Conversation Review/Ignore hosted proof (incl. fresh-session Ignore)
→ CONVERSATION PARTIAL; M2/M3  
→ PRODUCT, JOURNEY

### RC4-07 — Pedidos index missing seeded Maderas order
→ CROSS_PAGE mismatch  
→ PRODUCT / DEMO graph

### RC4-08 — BV harness View As cookie + OrderPrep selectors
→ False security/postsale signals  
→ UNPROVEN cleanup (test infra)

### RC4-09 — Escalar a Gerencia hosted with disposable pending approval
→ M7; commercial later steps  
→ JOURNEY

### RC4-10 — Responsibility mutation hosted (grant/revoke/reassign on disposable)
→ RESPONSIBILITY UNPROVEN  
→ JOURNEY

---

## 20–21. RC4 CLASSIFICATION

### P0_RC4
1. **RC4-02** `/auditoria` Application error  
2. **RC4-03** Resolver incidencia not reachable hosted  
3. **RC4-01** View As **Reasignar** missing server (+ UI) mutation gate; full Cliente360 mutation audit under real View As  
4. **RC4-04** `datos=real` does not override sticky demo cookie (tenant mode honesty)  
5. **RC4-05** Commercial disposable loop first failure (Crear cotización after opp)

### P1_RC4
1. **RC4-06** Conversation Review/Ignore + durable Ignore fresh-session proof  
2. **RC4-07** Pedidos index vs deep URL mismatch  
3. **RC4-09** Escalar a Gerencia hosted proof  
4. **RC4-10** Responsibility grant/revoke hosted mutation on disposable SYNTH  
5. Story Mode full step matrix re-prove  
6. Nota PDF isolated byte proof  
7. OrderPrep “Solicitar revisión” re-prove with correct selectors  

### POLISH
- P-C360-02/08, P-COM-12, P-VIS-02/03, UPR-15/36  
- Mobile overflow  

### FUTURE_BY_DESIGN
- P-OPS-12 Compras OC authoring  
- UPR-12 live WhatsApp  

### UNPROVEN
- Most harness View As projection claims (wrong cookie)  
- Coverage UI leak under true View As (code suggests gated)  
- Commitment full loop  
- Post-sale review buttons (selector)  
- Ignore durable across sessions  

```
ROOT_CAUSES_TOTAL = 10 (RC4-01…RC4-10)
READY_TO_IMPLEMENT_RC4 = YES
```

Implementation may start against this matrix; do not skip P0 list; do not hot-patch RC3 SHA.

---

## CARMEN HANDOFF — WHAT I NEED TO KNOW

1. RC3 stay frozen at `fe66f03` as fail evidence.  
2. The three reported P0s are **not** the full RC4 scope — commercial dead end + `datos=real` sticky demo + Reassign View As **server** hole are additional P0s.  
3. View As coverage “leak” in the receipt is largely **invalidated by wrong BV cookie**; still must re-prove with `isalwa-os-role-preview-persona` / real Ver como.  
4. Reassign is the real View As mutation hole found in code review (`assertRolePreviewAllowsMutation` missing).  
5. Fresh-session FAIL = only `/auditoria` crash.  
6. Do not invite Isa/Álvaro; do not start Carmen acceptance until RC4 hosted re-BV after P0 closure.
