# Control Tower — Operability alignment receipt

**When:** 2026-09-16  
**Lane:** READ-ONLY Control Tower · align-check only  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Mode:** No product edits · no deploy · no matrix/final-source rewrites  

## Spine checked (strongest evidence)

| Spine fact | Verdict | Evidence |
|---|---|---|
| LIVE SHA `e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed` web+API SAME (Render LIVE) | **YES** | `opaque-id-bv/opaque-id-hosted-bv-receipt.md` · `opaque-id-hosted-bv-receipt.md` · deploys `dep-daleg6m5vjqs73f40ug0` / `dep-daleg6m5vjqs73f40u2g` |
| Map LIVE ancestral `29b6f3f` still in `e9a7a02` | **YES** | `map-blank-diag/map-blank-fix-receipt.md` · `git merge-base --is-ancestor 29b6f3f… e9a7a02…` → `ANCESTRAL_OK=YES` |
| Selectors PASS @1440 + @390 | **YES** | `opaque-id-bv/opaque-id-hosted-bv-receipt.md` · `opaque-id-bv/opaque-id-mobile-bv-receipt.md` (Finanzas/Producción/Mensajes) |
| `SAFE_FOR_ISA_ALVARO_OWNER_REVIEW` = YES | **YES** | `docs/handoff/ISALWA_FINAL_PRELAUNCH_SOURCE_FOR_EDITOR.md` §13 |
| Claimed score 18 PASS / 3 FOUNDATION_GAP / 1 BUSINESS_DECISION_REQUIRED | **YES** | `ISALWA_V1_REAL_USER_OPERABILITY_MATRIX.md` FINAL STATE counts · final source §6 |

Contradiction scan (`control-tower-contradiction-scan.md`): **0** CONTRADICTORY_EVIDENCE_UNRESOLVED — consistent with this align-check.

---

## 1. OPERABILITY_SCORE_CONFIRMED

**OPERABILITY_SCORE_CONFIRMED = YES** (18 PASS / 3 FOUNDATION_GAP / 1 BUSINESS_DECISION_REQUIRED)

| FINAL STATE | Count | Surfaces (matrix) | Evidence support |
|---|---:|---|---|
| **PASS** | **18** | Inicio · Clientes · Cliente360 · Oportunidades · Cotizaciones · Pedidos · Trabajo · Aprobaciones · Compromisos · Incidencias · Productos · Producción · Finanzas · Mensajes · Mapa · Search · Salud datos · Memoria/Qué cambió | Operability judgment + prior/code/ancestral BV; not all re-BV’d on tip (honest GAP/UNPROVEN) |
| **FOUNDATION_GAP** | **3** | Almacén · Compras · Entregas | Loop BV PASS for **read/empty** @`29b6f3f`; write persist GAP stated in loop receipt + final source §§6–8 |
| **BUSINESS_DECISION_REQUIRED** | **1** | Coordinación | Auto-matter / linked-case criteria undecided — final source §8 GAP |
| **Total** | **22** | | |

Score basis = matrix **FINAL STATE** column (not BV-column completeness). Matches final source §6.

---

## 2. MISALIGNED rows (file:claim vs evidence)

**Score-breaking MISALIGNED:** **NONE.**

**Presentation / understatement only** (do not change matrices this lane):

| # | File:claim | Evidence | Nature |
|---|---|---|---|
| 1 | `ISALWA_V1_REAL_USER_OPERABILITY_MATRIX.md` header L8 — Selectors “@1440” only | Tag table L39 + mobile receipt PASS @390; honesty L89 | Understates mobile selector PASS |
| 2 | Same matrix rows **Producción / Finanzas / Mensajes** — `MOBILE BV` = UNPROVEN | `opaque-id-mobile-bv-receipt.md` PASS @390 for those three selector surfaces | Row cells understate vs SELECTORS tag + honesty footer (footer reconciles) |
| 3 | Same matrix BV honesty L88 — selectors “@1440” only | L89 + mobile receipt @390 | Internal understatement (footer still correct on next row) |
| 4 | Final source §7 field `CANONICAL_SELECTOR_PASS` — “@1440” only | Same §7 V1-target line + mobile BV PASS @390 | Soft within-source understatement (Control Tower does **not** rewrite final source this lane) |

No overclaims found that inflate PASS / shrink FOUNDATION_GAP / invent BV.

**Note (not MISALIGNED):** Producción GAP cites Order↔Production = BUSINESS_DECISION_REQUIRED while FINAL STATE remains PASS; score’s single BD row is Coordinación only. Final source §7 lists Order↔Production under BUSINESS_DECISIONS_REQUIRED as residual policy — consistent with GAP honesty, not a score contradiction.

---

## 3. Residual UNPROVEN (honest)

| Residual | Why UNPROVEN |
|---|---|
| Full SYNTH interactive mutation / lineage walk on tip `e9a7a02` | Final source §§12–13 · matrix GAP notes |
| Hosted end-to-end quote → pedido convert | Pedidos row · final source §6 ORDER_LOOP |
| Interactive create walkthroughs (Clientes / Oportunidades / etc.) | Matrix DESKTOP BV UNPROVEN this close |
| Inicio · Cliente360 · Aprobaciones · Search (⌘K keypress) · Salud · Memoria interactive BV this close | Matrix DESKTOP BV UNPROVEN / prior SSR or PI-HOSTED only |
| Wave-B Trabajo / Compromisos / Incidencias BV on `29b6f3f`/`e9a7a02` | Explicitly not re-BV’d |
| Map / Almacén / Entregas / Compras re-BV on tip `e9a7a02` | Ancestral lock `29b6f3f` only (ancestry OK; tip not re-shot) |
| Mobile BV (~390) for non-selector routes (Mapa, ops desks, commercial) | Only Finanzas/Producción/Mensajes selectors mobile PASS |
| Finanzas interactive prefill (`?orderId`/`?partyId`/`?quoteId`) walk | Final source §7 CONTEXT_CARRY_FORWARD PARTIAL |
| Selector auth / adversarial tenant negatives | Final source §7 BACKEND_REFERENCE_AUTH / TENANT negatives |
| AI LIVE · password mailbox E2E · WhatsApp send | Final source §§3–4 · Mensajes GAP · §13 |
| Product live ⌘K search | Productos / Search GAP |
| REAL_EMPLOYEE_OPERATION_READY · FORMAL_PRODUCTION_READY · USER_ACCEPTED | Final source §13 = **NO** |

---

## 4. Lane constraints honored

- Product code: **not edited**
- Deploy: **not run**
- `ISALWA_FINAL_PRELAUNCH_SOURCE_FOR_EDITOR.md`: **not rewritten**
- Operability / enter-once / canonical-reference matrices: **not rewritten**
- This file only new write: `control-tower-operability-alignment-receipt.md`

## FINAL RETURN

```
OPERABILITY_SCORE_CONFIRMED = YES
SCORE = 18 PASS / 3 FOUNDATION_GAP / 1 BUSINESS_DECISION_REQUIRED
MISALIGNED_SCORE_BREAKING = NONE
MISALIGNED_PRESENTATION = 4 understatements (header/mobile cells/honesty L88 / final-source §7 @1440-only field)
SAFE_FOR_ISA_ALVARO_OWNER_REVIEW = YES (spine)
RESIDUAL_UNPROVEN = listed above (honest)
```

**STOP.**
