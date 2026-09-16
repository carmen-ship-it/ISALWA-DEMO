# Operating-loop hosted BV receipt

**When:** 2026-09-16T22:00Z (approx)  
**Role:** VERIFIER · READ-MOSTLY · SYNTH mutations only  
**Expected live SHA (Carmen/CT claim):** `8508b9ce84c9914ebf86f0b25e07e1f159ba122e`  
**WEB:** https://os-web-staging.onrender.com · `dep-dalgna2jnfac739h0otg` · `srv-dajddb67bikc73bl42q0`  
**API:** https://os-api-staging.onrender.com · `dep-dalgna942hec73ce8360` · `srv-dajd64gae00c739gpk20`  
**Migrations (claimed applied):** `20260920120000_os_delivery_documents_flexible` + `20260920120000_os_finished_goods_receipt_pedido_context`  
**Artifacts:** `docs/operations/final-pre-pilot-2026-09-16/operating-loop-bv/` · JSON `operating-loop-bv.json`  
**Runner:** `operating-loop-hosted-bv.mjs` (+ delivery focus probe)

---

## Runtime / tenant truth

| Field | Value |
|---|---|
| User-claimed SYNTH org | `01M2JKF77TXMJNDTKNCYNHH5G5` (**typo**) |
| **Fixture SYNTH org** | **`01M2JKF77TXMJNDTKNCYNHH9G5`** (used) |
| Party / quote fixtures | `01M2JSDQJNYZ03N8808PBEDVS8` / `01M2JSDZYR37MCHVXVHPR586G7` |
| SYNTH pedido created this BV | `01M2P3CAP2QCTXXRRB4A0G74XJ` (O-000001) |
| Personas | `w2.asesor@isalwa.demo` (commercial) · `w2.almacen@isalwa.demo` (warehouse) · `w2.contabilidad@isalwa.demo` (negative) |
| API liveness | `GET /v1/health` → 200 `os-api` |
| Render CLI SHA confirm | **BLOCKED** (`Forbidden` / unauthenticated CLI) |
| SHA surface proof | New copy live: quote manual-send disclaimer; Entregas “Sin número oficial”; pedido DeliveryDocumentsPanel provisional pills |
| REAL_SEVEN_MUTATED | **NO** |

---

## Carmen handoff (one screen)

Hosted build **does** serve quote manual-send UI and Entrega/DeliveryDocuments provisional copy. Asesor recorded a durable WhatsApp send (survived reload; not localStorage-only) and converted quote → pedido O-000001.  
**Almacén** sees postsale/allocation desk with “Ingreso ≠ asignación” honesty, but **cannot open** the commercial pedido URL (`Sin permiso para esta sección`).  
**Delivery mutations** (Crear nota / Salida / Entrega) render on the pedido panel for asesor but controls are **disabled** (`actorMemberId` / `canMutate` gate — Destinatario fields absent; buttons disabled). PDF path therefore unproven.  
No fiscal numbering observed. Contabilidad does not get warehouse write. Staging briefly returned **502** mid-walk (recovered).

---

## Adversarial walk evidence (SYNTH)

### Desktop 1440

1. **Asesor login** — SYNTH session (“CONECTADO COMO Synth”). Shot: `01-asesor-home-1440.png`
2. **Quote Q-000001** — Manual send UI: disclaimer + “Registrar como enviada” + WhatsApp. Shot: `02-quote-manual-send-1440.png`, `02b-quote-scrolled-1440.png`
3. **Manual send mutation** — Success flash “Cotización registrada como enviada por WhatsApp”; reload retained history; localStorage not the SoR. Shots: `03-quote-after-send-1440.png`, `04-quote-reload-1440.png`
4. **Convert** — `Cliente aceptó · Convertir a pedido` → landed `/pedidos/01M2P3CAP2QCTXXRRB4A0G74XJ?resultado=pedido`. Shot: `06-after-convert-1440.png` (earlier attempt hit transient 502)
5. **Pedido DeliveryDocumentsPanel** — Copy + pills (“Numeración provisional”, “No es factura”, “Almacén ≠ entrega al cliente”); empty nota state; chronology empty. Buttons **disabled**. Shots: `07-pedido-asesor-1440.png`, `30-pedido-delivery-panel-asesor-1440.png`, `38-pedido-panel-dom-1440.png`
6. **Almacén** — Desk open; postsale pedido context + allocation honesty; “Ir a Entregas”. Receive submit mutation **not** completed. Shots: `08-almacen-receive-1440.png`, `08b-almacen-scrolled-1440.png`
7. **Entregas** — Kicker ENTREGA; “Sin número oficial” / “Registro interno”; empty pedidos list honesty. Shot: `10-entregas-panel-1440.png`
8. **Almacén → pedido URL** — **PERMISSION DENIED** (“Sin permiso para esta sección”). Shot: `11-pedido-delivery-1440.png` / `37-almacen-pedido-denied-1440.png`
9. **Contabilidad → Almacén** — No warehouse write desk (negative). Shot: `16-contab-almacen-negative-1440.png`

### Mobile 390

- Quote next-step / send vocabulary + convert CTA: `20-quote-390.png`
- Almacén reachable: `21-almacen-390.png`
- Entregas provisional / no official number: `22-entregas-390.png`

---

## Permission gaps (honest)

| Persona | Surface | Result |
|---|---|---|
| Asesor | Quote send + convert + pedido delivery **panel read** | OK |
| Asesor | Delivery **mutations** (nota/salida/entrega) | UI present, **controls disabled** (no Destinatario fields → `actorMemberId`/`canMutate` false) |
| Almacén | `/almacen` desk | OK (allocation/postsale) |
| Almacén | `/clientes/…/pedidos/…` | **DENIED** |
| Contabilidad | Warehouse write | Denied / no receive controls |

---

## Negatives

| Check | Result |
|---|---|
| No fiscal / official numbering | **PASS** — NE-PILOT / provisional / “Sin número oficial” only; no CUFD/SIN/correlativo oficial |
| No admin bypass used | **PASS** — role personas only; no owner/admin mutation path |
| REAL_SEVEN_MUTATED | **PASS — NO** |
| Staging stability | Transient **502** observed; later recovered |

---

## Scorecard (do not collapse)

States are separate. Highest honest claim listed.

| Subfeature | IMPLEMENTED | HOSTED | BROWSER-VERIFIED |
|---|---|---|---|
| QUOTE_MANUAL_SEND_UI | YES | YES | **PASS** |
| QUOTE_MANUAL_SEND_DURABLE_EVENT | YES | YES | **PASS** (flash + reload; not localStorage SoR) |
| OWN_QUOTE_TO_ORDER_CONVERT | YES | YES | **PASS** (O-000001 created) |
| FINISHED_GOODS_RECEIVE_UI | YES | YES | **UNPROVEN** (desk/honesty copy; receive submit not proven) |
| FINISHED_GOODS_PEDIDO_CONTEXT_NOT_ALLOCATE | YES | YES | **PASS** (copy “Ingreso ≠ asignación” / not stock-delivery); **mutation UNPROVEN** |
| DELIVERY_DOCUMENTS_PANEL | YES | YES | **PASS** (pedido panel + Entregas honesty) |
| NOTA_DE_ENTREGA_CREATE | YES | YES | **UNPROVEN** (button disabled; no NE-PILOT row created) |
| SALIDA | YES | PARTIAL | **UNPROVEN** (control disabled) |
| ENTREGA | YES | PARTIAL | **UNPROVEN** (control disabled) |
| DELIVERY_NOTE_PDF | YES | PARTIAL | **UNPROVEN** (no issued nota → no PDF) |
| NUMBERING_NE_PILOT_ONLY / no fiscal | YES | YES | **PASS** |
| NO_ADMIN_BYPASS | YES | YES | **PASS** |
| REAL_SEVEN_UNMUTATED | YES | YES | **PASS** |
| DESKTOP_1440 | YES | YES | **PASS** (surfaces) · mutations partial |
| MOBILE_390 | YES | YES | **PASS** (quote + entregas honesty) |
| SAME_SHA_WEB_API_CONFIRM | claimed | LIVE deps named | **UNPROVEN** via Render API (CLI Forbidden); surface-correlated only |

---

## CT follow-up

**Root cause of disabled controls:** `actorMemberId` / actions only populated when `auth.mode === 'dev'` — staging Supabase always null → `canMutate=false`.  
**Fix landed in tree:** `loadMemberCapabilities()` on pedido page + delivery server actions; `canMutate` gated by `canRecordDelivery` / `canRecordWarehouseOutbound`.  
**Almacén denied on `/clientes/…/pedidos/…`:** intentional commercial read gate — not a defect for warehouse desk.  
**Next:** redeploy web, re-BV Nota path with a persona that has `delivery.record` (and can open the pedido, or mutate from `/entregas`).
