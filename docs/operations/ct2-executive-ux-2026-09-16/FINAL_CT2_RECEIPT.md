# CONTROL TOWER 2 — FINAL RECEIPT

**Date:** 2026-09-17  
**Branch:** `ct2/exec-ux-intelligence` (pushed)

---

## SHA / DEPLOY PROOF

| Field | Value |
|---|---|
| **FINAL_CT2_SOURCE_SHA** | `4b85b115c3fe0cf009f605d65b043b5e2fb7c11b` |
| **WEB_RUNTIME_SHA** | `4b85b115c3fe0cf009f605d65b043b5e2fb7c11b` |
| **API_RUNTIME_SHA** | `4b85b115c3fe0cf009f605d65b043b5e2fb7c11b` |
| **SAME_SHA_PROOF** | **PASS** |
| **WEB_DEPLOY_ID** | `dep-dalk6du5vjqs73fmm0u0` (**live**) |
| **API_DEPLOY_ID** | `dep-dalk6e142hec73cp8l9g` (**live**) |
| **REAL_SEVEN_MUTATED** | **NO** |

### SHA reconciliation (closed)

| Prior tip | Role |
|---|---|
| `5462c3c` | UX-1 nav + role-preview salvage |
| `c34f23f` | docs-only atop 5462c3c |
| `328d0cb` | OrderPrep wire (web build failed InsightCard/map/due-soon types) |
| **`4b85b11`** | **FINAL** = OrderPrep + build fixes (only authorized deploy tip) |

API briefly lived at `328d0cb` during failed web build; both services now **same** at `4b85b11`.

API health: liveness + readiness **200** (DB / outbox / attention clock ok).

---

## NEW FEATURE MATRIX

Legend: Y = yes · partial · UNPROVEN · NO

| Feature | IMPL | TEST | INTEG | PUSH | DEPLOY | HOSTED | BV | RESIDUAL |
|---|---|---|---|---|---|---|---|---|
| Simplified navigation | Y | Y | Y | Y | Y | Y | **Y** (groups visible) | Compromisos `current` quirk on Inicio |
| Owner role preview | Y | Y | Y | Y | Y | Y | **UNPROVEN** (Synth lacks owner gate) | Need owner login walk |
| Inicio command center | Y | Y | Y | Y | Y | Y | **Y** | — |
| Management metrics | Y | Y | Y | Y | Y | Y | partial | Synth personal lens; org metrics need management scopes |
| Manager insights | Y | Y | Y | Y | Y | Y | partial | same |
| Cliente360 six-tab | Y | Y | Y | Y | Y | Y | **Y** | — |
| Context drawers/modals | Y | partial | Y | Y | Y | Y | partial | + Acciones seen; drawer forms light touch |
| Map intelligence | Y | Y | Y | Y | Y | Y | **Y** | No confirmed pins in SYNTH set |
| Map hover | Y | Y | Y | Y | Y | Y | UNPROVEN | 0 confirmed coords |
| Map click drawer | Y | Y | Y | Y | Y | Y | UNPROVEN | same |
| Quote-value layer | Y | Y | Y | Y | Y | Y | **Y** (Cotizaciones switcher) | Label is Cotizaciones not “Valor cotizado” in UI |
| Order-value layer | Y | Y | Y | Y | Y | Y | **Y** (Pedidos switcher) | — |
| Opportunity layer | Y | Y | Y | Y | Y | Y | **Y** | — |
| Attention layer | Y | Y | Y | Y | Y | Y | **Y** (disabled “Atención próx.”) | Slot present, disabled |
| Pending-location UX | Y | Y | Y | Y | Y | Y | **Y** | CTA to Cliente 360 |
| Notification bell | Y | Y | Y | Y | Y | Y | **Y** | Empty inbox for Synth |
| Due-soon / overdue | Y | Y | Y | Y | Y | Y | code Y / empty data | — |
| Cross-dept prep/review | Y | **Y (8)** | Y | Y | Y | Y | **UNPROVEN interactive** | Synth forbidden on Pedido detail; logout/credential BV gated by auto-review |
| Role quickstarts | Y | Y | Y | Y | Y | Y | **Y** (Mostrar recorrido) | — |
| Contextual training | Y | Y | Y | Y | Y | Y | **Y** (Finanzas tip) | — |
| Audit search/filters/labels | Y | Y | Y | Y | Y | Y | **UNPROVEN** (Synth blocked) | Owner/admin walk |
| Finance simplification | Y | Y | Y | Y | Y | Y | **Y** | — |
| Work simplification | Y | Y | Y | Y | Y | Y | partial | page not re-walked deep |
| AI hosted reactivation | Y | Y | Y | Y | Y | Y | **UNPROVEN** | Provider/env residual; do not claim PASS |

---

## PLAIN LANGUAGE (Carmen)

1. **What looks different?** Grouped nav (Inicio→Más), Inicio as command center, Cliente360 six tabs, Map layers without Revenue, notification bell, Pedido “Preparación operativa”, cleaner Finanzas.
2. **Inicio shorter?** Yes — attention strip + Mi día + queues instead of stacked role dashboards (Synth personal lens).
3. **Asesor:** Personal queues, clients, map honesty, no inventing stock/revenue.
4. **Jefe/Gerencia:** Lenses + metrics in code; Synth session did not exercise org lens fully.
5. **Vista de evaluación:** Owner-only UI preview; banner + mutation block in code; **not BV’d** on Synth.
6. **Management metrics live in code:** quote→order rate, org/team counts, exception reading.
7. **Improvement patterns:** management insights panels (code); hosted with management scopes still residual.
8. **After Pedido created:** Pedido detail shows **Preparación operativa** (Producción / Almacén / Compras).
9–11. **Reviews:** Solicitar revisión → governed CreateWorkItem with markers; production needs production-scoped destination; warehouse/compras can create requester-owned coordination Work; idempotent open detection.
12–13. **Due soon / overdue:** existing Attention + notification projection (no urgency invention).
14. **Bell:** opens; empty for Synth; states reading ≠ complete Work.
15. **Training:** Quickstart / recorrido / micro tips.
16. **Cliente360:** six tabs, compact header, + Acciones, pending location copy.
17–20. **Map:** Clientes / Oportunidades / Cotizaciones / Pedidos; Ingresos disabled; pending-location CTA; no fabricated coords.
21. **Revenue?** No — “Ingresos próx.” disabled; commercial copy says not revenue.
22. **Audit:** implemented; Synth cannot open (expected).
23–24. **AI:** integrated path present; **hosted BV UNPROVEN**.
25. **Owner decisions:** production queue assignment model; AI provider go-live; accept Vista de evaluación scope.
26. **Residual eng:** Pedido prep interactive BV with commercial login; role-preview BV as owner; Audit BV as admin; AI provider proof; optional nav `current` quirk on Compromisos.

---

## READINESS

| Gate | Status |
|---|---|
| SAFE_FOR_CARMEN_FINAL_WALKTHROUGH | **YES** (staging `4b85b11`) |
| SAFE_FOR_ISA_ALVARO_OWNER_REVIEW | **YES** with residuals listed |
| REAL_EMPLOYEE_OPERATION_READY | **NO** (pilot/staging; AI/queue residuals) |
| AI_OWNER_REVIEW_READY | **NO** (hosted AI UNPROVEN) |
| FORMAL_PRODUCTION_READY | **NO** |
| USER_ACCEPTED | **NO** (not marked) |

---

## CARMEN HANDOFF — WHAT I NEED TO KNOW

**Deploy is live. SAME_SHA_PROOF PASS at `4b85b11`.**

Walk staging as **owner / asesor** (not only Synth) to finish:
1. Pedido **Preparación operativa** → Solicitar revisión → reload → duplicate protection  
2. Vista de evaluación  
3. Auditoría filters  
4. AI assist if provider env is live  

No Carmen product decision required to keep the tip. Residual BV items are session/scope — not missing integration.
