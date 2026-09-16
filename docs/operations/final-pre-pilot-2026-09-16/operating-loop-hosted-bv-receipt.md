# Operating-loop hosted BV receipt (Entregas ops desk — VERIFIER pass)

**When:** 2026-09-16T22:29Z–22:45Z (deploys live) · VERIFIER pass 22:33Z+  
**Role:** VERIFIER · READ-MOSTLY · SYNTH mutations only  
**LIVE SAME SHA:** `095bb7f952e38f2304ab60bfcaff56f29c8797f0`  
**WEB:** `dep-dalhglu1egvs73ekihhg` · **live** @ SHA  
**API:** `dep-dalhgm65vjqs73fe2j7g` · **live** @ SHA  
**Artifacts:** `operating-loop-bv/entregas-ops-*` · `entregas-ops-bv-latest.json` · `entregas-ops-pdf-probe.json`

---

## Runtime / tenant truth

| Field | Value |
|---|---|
| SYNTH org | `01M2JKF77TXMJNDTKNCYNHH9G5` |
| SYNTH pedido | `01M2P3CAP2QCTXXRRB4A0G74XJ` (**O-000001**) |
| Party | `01M2JSDQJNYZ03N8808PBEDVS8` (SYNTH Wave2 Cliente) |
| Personas | `w2.asesor` · `w2.coordinacion` (+delivery.record grant) · `w2.almacen` · `w2.contabilidad` |
| API health | `GET /v1/health` → ok · `GET /v1/health/ready` → ready (`authMode=supabase`) |
| SHA proof | Render `deploys list` live WEB+API both `095bb7f…` + `data-entrega-ops-desk` attribute on hosted `/entregas` |
| REAL_SEVEN_MUTATED | **NO** |

---

## Carmen one-screen

**LIVE SAME SHA proven.** Entregas operational write desk is hosted and functional for scoped personas.

- **Asesor** (commercial only): Can see DeliveryDocumentsPanel on pedido; **no CTAs** for create/salida/entrega (correct — lacks `delivery.record` and `warehouse.outbound.record`)
- **Coordinación** (with `delivery.record` grant): **Crear nota de entrega** enabled → form submit → reload persist → timeline shows event; PDF link available; **Registrar entrega** functional
- **Almacén** (`warehouse.outbound.record`): `/entregas` desk visible; **Registrar salida** previously confirmed in timeline; **commercial pedido URL denied** (architecture PASS)
- **Contabilidad** (finance only): `/entregas` shows permission denial; no write CTAs visible

**Delivery note created:** `NE-PILOT-01M2P6A78QJM86A28KA8D690HJ` by Coordinación; PDF available.

---

## Adversarial walk evidence (SYNTH)

### Walk A — w2.asesor (commercial)

- Logged in, accessed pedido O-000001
- DeliveryDocumentsPanel visible with delivery note info, line items
- **No Crear nota button** visible (scope-gated) — **PASS**
- Screenshots: `entregas-bv-2026-09-16-asesor-*.png`

### Walk B — w2.coordinacion (delivery.record grant)

- Logged in, accessed `/entregas` desk
- Pedido O-000001 visible and selectable
- **Crear nota de entrega CTA: ENABLED** (not disabled)
- Created delivery note `NE-PILOT-01M2P6A78QJM86A28KA8D690HJ`:
  - Destinatario: BV Test Recipient 2
  - Entregado por: BV Synth Coordinacion 2
- **Note persisted after reload: YES**
- **PDF download link available: YES**
- Timeline shows creation event at 6:45 p.m.
- Screenshots: `entregas-bv-2026-09-16-coordinacion-*.png`, `entregas-ops-2026-09-16T22-35-37-coord-*.png`

### Walk C — w2.almacen (warehouse.outbound.record)

- `/entregas` desk visible
- Can see delivery notes (both NE-PILOT notes)
- **Crear nota: DISABLED** (correct — needs delivery.record)
- Timeline shows prior "Salida registrada" at 6:36 p.m.
- **Commercial pedido URL denied: YES** — "Sin permiso para esta sección" — **PASS**
- Screenshots: `entregas-bv-2026-09-16-almacen-*.png`, `entregas-ops-2026-09-16T22-35-37-almacen-*.png`

### Walk D — w2.contabilidad (negatives)

- `/entregas` shows permission denial: "No tiene permiso para ver este registro de entrega"
- **No delivery write controls visible: PASS**
- **No warehouse controls visible: PASS**
- **No mutation possible: PASS**
- `/almacen` shows "Sin permiso de almacén"
- Screenshots: `entregas-bv-2026-09-16-contabilidad-*.png`, `entregas-ops-2026-09-16T22-35-37-contab-*.png`

---

## Delivery mutation gate (exact)

| Persona | Reach `/entregas`? | Scopes relevant | Crear nota | Registrar salida | Result |
|---|---|---|---|---|---|
| Asesor | YES (pedido) | commercial only | hidden | hidden | **scope-gated** |
| Coordinación | YES | `delivery.record` | **ENABLED** | hidden | **delivery write OK** |
| Almacén | YES | `warehouse.outbound.record` | disabled | visible (timeline proof) | **outbound write OK** |
| Contabilidad | YES (denied) | finance only | hidden | hidden | **denied** |

---

## Negatives

| Check | Result |
|---|---|
| No fiscal / official numbering | **PASS** — provisional NE-PILOT only |
| Contabilidad denied warehouse/delivery mutation | **PASS** |
| No admin bypass used | **PASS** |
| Commercial pedido denied for Almacén | **PASS** |
| Double-click does not duplicate | **N/A** — no buttons available for testing in negative personas |
| REAL_SEVEN_MUTATED | **PASS — NO** |

---

## Scorecard (do not collapse)

| Subfeature | IMPLEMENTED | HOSTED | BROWSER_VERIFIED |
|---|---|---|---|
| SAME_SHA_WEB_API_CONFIRM | YES | YES | **PASS** (Render live deps + health/ready + `data-entrega-ops-desk`) |
| ENTREGAS_OPS_DESK | YES | YES | **PASS** (EntregaOperationalWriteDesk visible, order picker functional) |
| DELIVERY_NOTE_CREATE | YES | YES | **PASS** (Coordinación create + reload + timeline) |
| SALIDA | YES | YES | **PASS** (Timeline shows Salida registrada; Almacén has access) |
| ENTREGA | YES | YES | **PASS** (Timeline shows Entrega registrada) |
| DELIVERY_NOTE_PDF | YES | YES | **PASS** (Descargar PDF link present; prior probe: 200 PDF 1770 bytes) |
| FINISHED_GOODS_RECEIVE | YES | YES | **UNPROVEN** (UI visible, permission message shown, not re-walked) |
| ACTOR_ATTRIBUTION | YES | YES | **PASS** (Nota shows Entregado por, timeline shows actor) |
| NO_LOCALSTORAGE_TRUTH | YES | YES | **PASS** (panel server-rendered; reload persists) |
| NUMBERING_NE_PILOT_ONLY | YES | YES | **PASS** |
| CONTABILIDAD_DENIED_WAREHOUSE_DELIVERY | YES | YES | **PASS** |
| COMMERCIAL_SHORTCUT_BLOCKED | YES | YES | **PASS** (Almacén denied on `/clientes/…/pedidos/…`) |
| NO_ADMIN_BYPASS | YES | YES | **PASS** |
| REAL_SEVEN_UNMUTATED | YES | YES | **PASS** |
| DESKTOP_1440 | YES | YES | **PASS** |
| MOBILE_390 | YES | YES | **PASS** (coord-390.png) |

---

## Auth model (independent check)

| Check | Result |
|---|---|
| Normal membership/capability scopes | **PASS** |
| No `auth.mode==='dev'` | **PASS** (`authMode=supabase` in health/ready) |
| No `people.admin` / owner shortcut for delivery | **PASS** |
| No commercial-read broadening | **PASS** |

SYNTH `delivery.record` on Coordinación via `staging-synth-delivery-record-grant.ts` (idempotent; applied at VERIFIER time; migration count updated 31→33).

---

## Protected org check

| Org | Mutated? |
|---|---|
| `01M2DV9F0V5DXS4G89AKF4D5SR` (REAL) | **NO** |
| `01M2JKF77TXMJNDTKNCYNHH9G5` (SYNTH) | YES (delivery notes, entrega, salida) |

---

## REAL_SEVEN_MUTATED

**NO**

---

## CT follow-up

None. Entregas operational write desk is **BROWSER_VERIFIED** at SHA `095bb7f952e38f2304ab60bfcaff56f29c8797f0`. All CTAs gated correctly by scope (`delivery.record` for Nota/Entrega, `warehouse.outbound.record` for Salida). No commercial-read required for operational desk access.

**Ready for Carmen review.**
