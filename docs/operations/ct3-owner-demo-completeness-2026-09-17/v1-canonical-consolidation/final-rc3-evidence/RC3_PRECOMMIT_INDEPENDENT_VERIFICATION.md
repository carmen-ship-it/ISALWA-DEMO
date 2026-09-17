# RC3 PRE-COMMIT INDEPENDENT VERIFICATION RECEIPT

**Date:** 2026-09-17 (re-verified same day against dirty tree)  
**Mode:** READ-ONLY verification of dirty RC3 worktree  
**LIVE tip:** `8f1ac76185af432bb244ea94b7ae6a647eaa0ebc`  
**Commit/push/deploy:** NOT performed

**Re-check notes:** View As gaps reconfirmed (commitments + postsale ungated). `next build` (os-web) PASS on dirty tree. `pnpm typecheck` (os-web) FAIL on 2 test files (`order-role-matrix.test.ts` unknown `actingAdvisorMemberId`; `document-links.test.ts` QuoteListResponse cast). Product mounts of retired walkthrough coaches = 0.

---

## 15. FINAL LOCAL PRODUCT GATE (verdict first)

```
PRODUCT_PROMISES_TOTAL = 118

MATCH_LOCAL = 74
LOCAL_ONLY_EXPECTED_TO_SHIP = 22
FUTURE_BY_DESIGN = 1
HIDDEN_UNTIL_READY = 0
REMOVED = 5
PARTIAL_LOCAL = 15
MISSING_MUST_FIX = 0   (V1 must-fix product CTAs from C1–C5/C7–C11)
  NOTE: residual View As mutation gaps exist outside the closed C-list inventory
  → counted under VIEW_AS_SECURITY_GAPS, not MISSING_MUST_FIX CTA rows

74+22+1+0+5+15 = 117 classified thematic equivalents;
Thematic ledger rows (81) + UPR archaeology (37) = 118 preserved.
UPR rows remain catalogued in PP8; none deleted.

MANUAL_ACTIONS_EXPECTED = 42
MANUAL_ACTIONS_REACHABLE_LOCAL = 41
MANUAL_ACTIONS_MISSING_LOCAL = 0   (for V1-promised; C6 OC = FUTURE not counted as missing)

LOOPS_WITH_DEAD_ENDS_LOCAL = 0

VIEW_AS_SECURITY_GAPS = 2
DEMO_CONTEXT_NAV_GAPS = 0
WALKTHROUGH_VIOLATIONS = 0

UNEXPECTED_CHANGE = 0
POSSIBLE_LANE_COLLISION = 0
UNRELATED_CHANGE = 0   (evidence docs + RC2 receipts intentional)

FULL_BUILD = PASS (next build / package tsc for contracts·work·database·api)
  NOTE: os-web `pnpm typecheck` FAIL on 2 *.test.ts files — fix before commit hygiene

READY_TO_COMMIT_RC3 = NO
```

### Blockers only

1. **VIEW_AS_SECURITY_GAPS = 2** — C9 required complete mutation blocking under View As; still ungated:
   - `apps/os-web/lib/commitments/persistence.ts` (`saveCommitmentAction` / `fulfillCommitmentAction`)
   - `apps/os-web/lib/postsale/actions.ts` (`createPostSaleExpectedWorkAction` / `receiveFinishedGoodsAction`)
2. **Ledger file stale** — `FINAL_V1_PRODUCT_PROMISE_LEDGER.md` still lists closed rows as MISSING/PARTIAL (P-ISS-03, P-OPS-11, P-CNV-*, P-VA-05/06, P-DEM-03). Must refresh before commit so the canonical ledger matches the tree.
3. **os-web typecheck FAIL** — `order-role-matrix.test.ts` + `document-links.test.ts` (tests only; `next build` still PASS).
4. **DIRTY_TREE** — expected; commit not authorized yet.

---

## 1. Ledger recount (118 preserved)

### Category math (thematic 81 + UPR 37)

| Bucket | Count | Notes |
|---|---|---|
| MATCH_LOCAL | 74 | Intended present locally (may also be LIVE) |
| LOCAL_ONLY_EXPECTED_TO_SHIP | 22 | RC3 auth/View As/tour deletion/C1–C11 not on LIVE tip |
| FUTURE_BY_DESIGN | 1 | **P-OPS-12** Compras OC write |
| HIDDEN_UNTIL_READY | 0 | none currently classified |
| REMOVED | 5 | GuidePanel, IntroCoach, MicroTourCoach, RoleQuickstart, ContextualMicroTip (+ Ayuda section recorridos) |
| PARTIAL_LOCAL | 15 | Visual polish, folded acceptance, quote-only ball, mobile UNPROVEN, ignore=sessionStorage, etc. |
| MISSING_MUST_FIX | 0 | No open V1 CTA from locked C list |

**74+22+1+0+5+15 = 117 thematic-equivalent classifications across 81 ledger rows + UPR fold; UPR-37 inventory remains in PP8 (total product-promise inventory = 118).**

### Not MATCH_LOCAL (explicit)

**FUTURE_BY_DESIGN**
- **P-OPS-12** Compras OC authoring — Carmen locked; V1 = Solicitar revisión de Compras only; no invented OC schema.

**REMOVED (local deleted; LIVE still stale until ship)**
- P-TOUR-04 GuidePanel / Mostrar recorrido  
- P-TOUR-06 MicroTourCoach  
- P-TOUR-08 RoleQuickstartPanel  
- P-TOUR-09 ContextualMicroTipCoach  
- IntroCoach (folded into P-TOUR-05 REMOVED multi-step)

**LOCAL_ONLY (must ship in RC3)** — includes P-OPS-01 Pedido auth, P-C360-03/06/07, P-VA-04, P-COM-09 Escalate, P-ISS-03 Resolve, P-CNV-01/03, P-OPS-11 orderId, P-VA-05/06 nav/Acciones, P-DEM-03 demo nav, tour deletions vs LIVE.

**PARTIAL_LOCAL (non-blocking polish unless noted)**
- P-C360-02/08 header/layout polish  
- P-COM-10 acceptance folded into convert  
- P-COM-12 who-has-ball quote-heavy  
- P-VIS-02/03/04 visual  
- P-INI-03 zero-count honesty (improved by Pedido auth)  
- Conversation ignore = sessionStorage only (not server durable) — by design for V1 confirm/ignore UX  
- Finance mutate under View As is UI+gate inventory residual → **escalated to VIEW_AS gap #2 set**

**HIDDEN_UNTIL_READY:** none.

---

## 2. Manual actions

```
MANUAL_ACTIONS_EXPECTED = 42
MANUAL_ACTIONS_REACHABLE_LOCAL = 41
MANUAL_ACTIONS_MISSING_LOCAL = 0  (V1-promised)
```

C6 OC write excluded as FUTURE (not in the 0-missing denominator).

### Closure-changed actions

| ACTION | ROUTE | VISIBLE CTA | ROLE | COMMAND | PERSIST | EVENT | WORK | NEXT | TEST |
|---|---|---|---|---|---|---|---|---|---|
| Escalar a Gerencia | Quote / Aprobaciones | Escalar a Gerencia + Gerente typeahead | Current approver (Jefe) | `EscalateApproval` | same approval row, new approver | `approval.escalated` | Attention rebuild via projection | Pending on chosen Gerente | `commercial-approval.test.ts` |
| Resolver incidencia | `/incidencias/[id]` | Resolver incidencia | Owner or issue.manage | `ResolveIssue` | issue resolved + resolution | issue resolve events | linked work per domain | Cierre section updated | `lane-d-v1-close.test.ts` source |
| Confirm/Review | Conversaciones | Revisar / primary | Conversation actor | navigate → domain form | only after human domain submit | n/a on review alone | n/a | canonical create screens | `suggestion-routing.test.ts` |
| Ignore | Conversaciones | Ignorar | same | sessionStorage mark | no domain mutation | none | none | card hidden | `suggestion-routing.ts` |
| Registrar conversación | Conversaciones | Registrar | member | POST `/customer-conversations` | `OsCustomerConversation` | admission seal | none | list refresh | controller + actions |
| Pedido ops deep-link | Pedido → Prod/Almacén/Entregas | Abrir * | ops | nav `?orderId=` | n/a | n/a | context select | desk preselect | lane cards + pages |
| Apoyo temporal | Cliente360 | Asignar/Quitar | coverage authority | Grant/Revoke coverage | coverage row | coverage events | none | header helper | coverage tests |
| Reasignar responsable | Cliente360 | Reasignar | commercial admin path | ReassignCommercialAccountOwner | owner history | owner events | none | header owner | commercial authority tests |

---

## 3. C1 Escalate — no invented policy

**Proved:**
- Explicit CTA + required `newApproverMemberId` typeahead (no auto/random)
- Approver must be able to decide; new member active same org
- `escalationHistory` appended in `contextSnapshotJson`
- Event `approval.escalated`; audit emit; projection `approval.*` → hydrate + **rebuildAttention**
- No CreateOrder / order.created on escalate or decide

**Files:** `work-commands.ts`, `work-command-service.ts`, `prisma-work-store.ts`, `commercial-approval-panel.tsx`, `commercial/actions.ts`, `commercial-approval.test.ts`, `work-projection-consumer.ts` (`startsWith('approval.')` + `rebuildAttention`)

---

## 4. C2 Issue loop

Report → Assign → Attention → **Resolver incidencia** → resolution string + version → status resolved; history/journal preserved; no DeleteIssue.

**Files:** `issue/actions.ts`, `resolve-issue-form.tsx`, `incidencias/[issueId]/page.tsx`, `lane-d-v1-close.test.ts`

---

## 5. C3/C4 Conversations

Manual: admit → POST create → prisma row → workspace refresh.  
Suggestion: Review navigates only; Ignore session-marks; Record-sent writes company-entered note; **no WhatsApp provider**.

**Files:** controller POST, `conversations/actions.ts`, panels, `suggestion-routing.ts` + tests, controller tests.

---

## 6. C5 Ops navigation

All three Pedido lane cards append `?orderId=`. Producción/Almacén desks `initialOrderId`. Entregas already did. Compras has no lane card; path is **Solicitar revisión de Compras** (Work), not OC deep-link — correct for FUTURE OC.

---

## 7. View As one system

| Persona | NAV | CLIENTES | Acciones ⌘K | Mutations (known gated) |
|---|---|---|---|---|
| Asesor | commercial+map+conv; no aprobaciones/ops desks | own slice | suppressed | commercial/work/issue gated |
| Jefe | commercial+aprobaciones | team | suppressed | gated |
| Gerencia | broad desks | org | suppressed | gated |
| Producción/Almacén/Compras/Entregas/Finanzas | ops desk; commercial nav hidden | **EvaluationDeskExcluded** | suppressed | finance UI blocked; **postsale/commitments NOT gated** ← gaps |

```
VIEW_AS_SECURITY_GAPS = 2
```

---

## 8. Demo persistence

Sidebar + brand append `?datos=demo` when `dataMode==='demo'`; cookie `isalwa-demo-data-mode` backs SSR. Effective SYNTH survives nav even if some in-page links omit query.

```
DEMO_CONTEXT_NAV_GAPS = 0
```

---

## 9. Walkthrough remnants

| Match | Class |
|---|---|
| Deleted component files (git D) | ACTIVE_VALID removal |
| `guide.test.ts` absence assertions | TEST/HISTORY_ONLY |
| `journeys.ts` JOURNEYS archive + tests | TEST/HISTORY_ONLY (no product mount) |
| `GUIDE_CHROME.title` 'Recorrido del piloto' string | ACTIVE_VALID unused constant (not launched) |
| Evidence/PP1 docs mentioning old coaches | TEST/HISTORY_ONLY |
| Product mounts of IntroCoach/MicroTour/GuidePanel | **none** |

```
WALKTHROUGH_VIOLATIONS = 0
```

---

## 10. Six loops — LOOPS_WITH_DEAD_ENDS_LOCAL = 0

Commercial includes Escalación; Responsibility coverage/reassign; Post-sale orderId; Issue resolve; Commitment create/fulfill; Conversation register+confirm/ignore. Backend-only gaps for C6 OC only (FUTURE).

---

## 11. Cross-page single-truth

RC3 org visibility + View As commercialQuery/suppressNegotiation: intentional differences by persona. Owner-eval Maderas Pedido ALLOW local. No unexplained silent drop for same-authority surfaces after Pedido auth fix.

---

## 12. Change manifest (summary)

Groups match git dirty set: AUTH/query, COMMERCIAL/approval, ISSUES, CONVERSATIONS, OPERATIONS, VIEW AS, SEARCH, DEMO, TOURS, TESTS, EVIDENCE.  
No unexpected collision files beyond intended shared boundaries (`app-nav` = C7+C11). Evidence untracked folder intentional.

---

## 13–14. Tests & build

**BUILD (dirty re-run):** contracts/work/database/api/web = **PASS**

**UNIT (post-integration):**
- `packages/os-work` commercial-approval (incl. escalate) **PASS**
- `apps/os-web` `command-palette.test.ts` via `pnpm exec tsx` **PASS** (24)
- guide.test **PASS** when run under os-web tsx paths
- Raw `node --import tsx` from repo root **fails path aliases** — use package cwd/`pnpm exec tsx`

**Protecting tests present for C1–C5/C7–C11;** View As residual gaps lack new tests until gated.

---

## READY_TO_COMMIT_RC3 = NO

Fix blockers 1–2 (mutation gates + ledger refresh), re-run View As source grep for `assertRolePreviewAllowsMutation` coverage, then Carmen may authorize commit.
