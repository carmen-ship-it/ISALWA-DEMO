# Operating-loop hosted BV receipt (Entregas ops desk close)

**When:** 2026-09-16T22:35Z–22:37Z  
**Role:** CONTROL TOWER VERIFIER · SYNTH mutations only  
**LIVE SAME SHA:** `095bb7f952e38f2304ab60bfcaff56f29c8797f0`  
**WEB:** `dep-dalhglu1egvs73ekihhg` · **live**  
**API:** `dep-dalhgm65vjqs73fe2j7g` · **live**  
**Artifacts:** `operating-loop-bv/entregas-ops-*` · runner `entregas-ops-hosted-bv.mjs` · PDF probe `entregas-ops-pdf-probe.json`

---

## Carmen one-screen

Operating loop mutations that were blocked behind commercial-read are now **browser-proven from `/entregas`**.

- Coordinación (SYNTH + `delivery.record`): **Crear nota** → reload persist → **Registrar entrega** → reload persist  
- Almacén (`warehouse.outbound.record`): **Registrar salida** from `/entregas`; commercial pedido URL still **denied** (architecture PASS)  
- Contabilidad: no Entregas write desk  
- Nota PDF link returns `application/pdf` 200 (1770 bytes)  
- SAME SHA web+API **PASS** · REAL_SEVEN_MUTATED **NO**

---

## Scorecard (do not collapse)

| Subfeature | HOSTED | BROWSER_VERIFIED | Evidence |
|---|---|---|---|
| SAME_SHA | yes | **PASS** | Render live deps @ `095bb7f…` |
| ENTREGAS_OPS_DESK | yes | **PASS** | `data-entrega-ops-desk` + order picker |
| DELIVERY_NOTE_CREATE | yes | **PASS** | Coordinación create + reload |
| SALIDA | yes | **PASS** | Almacén on `/entregas` |
| ENTREGA | yes | **PASS** | Coordinación + reload |
| DELIVERY_NOTE_PDF | yes | **PASS** | GET `/api/delivery-notes/…/pdf` → 200 PDF |
| NO_COMMERCIAL_SHORTCUT | yes | **PASS** | Almacén denied on `/clientes/…/pedidos/…` |
| CONTAB_DENIED | yes | **PASS** | No write CTAs on `/entregas` |
| FINISHED_GOODS_RECEIVE | prior UI | **UNPROVEN this pass** | Not re-walked in this runner |
| Quote→Pedido | prior | prior PASS @ `8508b9c`/`5ca1472` | Reused SYNTH O-000001 |

---

## Persona matrix

| Persona | Result |
|---|---|
| `w2.coordinacion` | Nota + Entrega from `/entregas` · no Salida CTA (correct) |
| `w2.almacen` | Salida from `/entregas` · no Crear nota CTA (correct) · commercial pedido denied |
| `w2.contabilidad` | No ops desk / no mutate CTAs |

---

## Auth model (independent check)

| Check | Result |
|---|---|
| Normal membership/capability scopes | **PASS** |
| No `auth.mode==='dev'` | **PASS** |
| No `people.admin` / owner shortcut for delivery | **PASS** |
| No commercial-read broadening | **PASS** |

SYNTH `delivery.record` on Coordinación via staging grant script (idempotent; already present at BV time).

---

## REAL_SEVEN_MUTATED

**NO**
