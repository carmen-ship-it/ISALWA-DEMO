# ISALWA V1 Company OS — Control Tower consolidated close receipt

**Date:** 2026-09-16  
**Branch tip (pushed):** `f58ac12c14539b7377ae0fc30e2c9b0497e97165`  
**HOSTED LIVE (web+API SAME SHA proven):** `095bb7f952e38f2304ab60bfcaff56f29c8797f0`  
**WEB live dep:** `dep-dalhglu1egvs73ekihhg`  
**API live dep:** `dep-dalhgm65vjqs73fe2j7g`  
**Auth fix SHA:** `5ca147207508c93f083e6cf141547f54c45e6eb0`  
**Prior commercial-map tip:** `03745ab522bb6f4e83b27fbc3353efd598ab07ac`  
**Operating-loop merge tip (prior):** `c13daf3430bba36f5ada1458eed8a3f81ef1c357`  
**REAL_SEVEN_MUTATED:** **NO**  
**SYNTH org:** `01M2JKF77TXMJNDTKNCYNHH9G5`

---

## CARMEN HANDOFF — WHAT I NEED TO KNOW

### 1. Walk me through exactly what an employee can now do from client to delivery

On hosted staging @ `095bb7f` (SYNTH-proven):

1. Register / open **Cliente**  
2. Create **Oportunidad** → **Cotización** (lines, totals)  
3. Issue quote → **Descargar PDF** → **Registrar como enviada** → **Programar seguimiento**  
4. **Cliente aceptó · Convertir a pedido** (own eligible quote)  
5. Open **Pedido** (commercial actor)  
6. Warehouse: **Registrar ingreso de producto terminado** on `/almacén` (UI exists; submit not re-proven this pass)  
7. Delivery/ops from **`/entregas`** (no commercial-read required):  
   - Coordinación/`delivery.record`: **Crear nota de entrega** → **Descargar PDF** → **Registrar entrega**  
   - Almacén/`warehouse.outbound.record`: **Registrar salida**  
8. Reload shows durable facts; chronology updates

### 2. Who normally enters the fact?

| Fact | Normal future actor | Evidence |
|---|---|---|
| Cliente | Asesor / commercial | contracts + fixtures |
| Cotización | Asesor (owner) | contracts |
| Envío manual / seguimiento | Commercial owner | implemented |
| Pedido (from quote) | Asesor with convert.own | hosted prior PASS |
| Ingreso PT | Almacén | capability |
| Nota / Entrega | Delivery-authorized (`delivery.record`) — ROLE TO VALIDATE for job title | SYNTH Coordinación eval grant |
| Salida | Almacén (`warehouse.outbound.record`) | BV PASS |

### 3. What is inherited automatically?

Cliente, Pedido, líneas/cantidades, precios aceptados from Quote→Pedido; Nota prefills Pedido/líneas; Entregas desk loads open pedidos + lines without retyping IDs.

### 4. What does Carmen see/do from evaluation login?

Carmen owner-eval scopes on **REAL** org (business desks, including `delivery.record`) — demo wording already documented. Full SYNTH mutation walk uses SYNTH personas; Carmen on REAL cannot mutate SYNTH pedido URLs.

### 5. What does Inicio tell a normal employee?

Deterministic attention from Work/Approvals/Issues/Commitments where wired — not invented urgency scores. Empty: human “no tienes pendientes…” pattern (page exists).

### 6. What does Cliente360 know?

Identity, owner, contacts, locations, commercial lists, historial, plus **DOCUMENTOS** + **FINANZAS** sections merged in tip `f58ac12` (**not yet LIVE** until redeploy). LIVE still `095bb7f` dossier without those two sections.

### 7. What does Pedido know about post-sale?

Lines, source quote, delivery documents panel (commercial readers), operating sections; Entregas is the write desk for warehouse/delivery.

### 8. Where are PDFs/files linked?

Quote PDF + Nota PDF via API routes; Cliente360 document links in tip `f58ac12`. No second binary store; binary archival residual if no external blob provider.

### 9. Nota six months later?

Issued note rows + snapshot lines + PDF render from stored note/lines. Provisional numbering. Historical meaning preserved for issued content (correction creates reversal path).

### 10. What does Search find?

Governed shell search for authorized entity kinds already in product; Nota indexing residual unless wired.

### 11. Work/Attention

Follow-ups and due Work surface in Trabajo/Inicio when due — deterministic projection.

### 12. Report a problem

`Reportar incidencia` routes / triggers exist (pedido context enhanced in lane B tip).

### 13–14. Who is responsible / nobody assigned

Canonical assignment labels; empty: “Aún no hay una persona responsable asignada.” — do not invent Gerencia redirects.

### 15–16. Explicit human vs automatic

Explicit: Nota, Salida, Entrega, send registry, convert, FG receive, issue.  
Automatic: totals from money contract, attention projection from due facts, timeline from persisted events/rows.

### 17. Where leave ISALWA?

Official accounting/tax/facturación/cobranza; live WhatsApp send; AI assist (provider not live).

### 18. Isa/Álvaro decisions still open

Official Nota numbering; Nota trigger timing; Pedido↔Producción ownership; special-price threshold; cross-owner convert; real catalog if found later.

### 19. UI-only / unproven

FG receive mutation this pass **UNPROVEN**; tip `f58ac12` Cliente360 docs/finanzas **not LIVE**; password-reset full mailbox E2E **UNPROVEN**; AI **not live**.

### 20. Still needs a developer

Redeploy tip `f58ac12` (lane B) — deploy gate blocked in this agent session after push; FG receive re-BV; remaining page completeness polish; formal production infra ownership.

### 21–23. Readiness

| Gate | Status |
|---|---|
| SAFE_FOR_CARMEN_FINAL_WALKTHROUGH | **YES** for commercial + Entregas loop on SYNTH personas @ `095bb7f` |
| SAFE_FOR_ISA_ALVARO_OWNER_REVIEW | **YES** (staging review; honesty residuals labeled) |
| REAL_EMPLOYEE_OPERATION_READY | **NO** (individual identities + remaining residuals) |
| FORMAL_PRODUCTION_READY | **NO** |
| USER_ACCEPTED | **NO** (human only) |

---

## §1 Auth fix close

| Check | Result |
|---|---|
| Uses membership/capabilities | **PASS** (`loadMemberCapabilities`) |
| No dev auth bypass | **PASS** |
| No people.admin shortcut | **PASS** |
| Hosted Nota/Salida/Entrega | **BROWSER_VERIFIED** from `/entregas` @ `095bb7f` |

---

## Feature matrix (critical loop)

| Feature | IMPL | TEST | INTEG | PUSH | DEPLOY | HOST | BV | Residual |
|---|---|---|---|---|---|---|---|---|
| OWN_QUOTE_TO_ORDER | Y | Y | Y | Y | Y | Y | Y prior | — |
| DELIVERY_NOTE_CREATE | Y | Y | Y | Y | Y@095bb7f | Y | **Y** | — |
| SALIDA | Y | Y | Y | Y | Y@095bb7f | Y | **Y** | — |
| ENTREGA | Y | Y | Y | Y | Y@095bb7f | Y | **Y** | — |
| DELIVERY_NOTE_PDF | Y | Y | Y | Y | Y@095bb7f | Y | **Y** | link not button |
| FINISHED_GOODS_RECEIVE | Y | Y | Y | Y | Y | Y | **UNPROVEN this pass** | re-walk |
| CLIENTE360_DOCUMENTOS | Y | — | Y tip | Y tip | **NO** | **NO** | UNPROVEN | redeploy f58ac12 |
| REAL_SEVEN_UNMUTATED | — | — | — | — | — | — | **PASS NO** | — |

---

## SHA receipt

| Field | Value |
|---|---|
| STARTING_LIVE_SHA | `8508b9c…` then auth `5ca1472…` |
| AUTH_FIX_SHA | `5ca147207508c93f083e6cf141547f54c45e6eb0` |
| FINAL_SOURCE_SHA (pushed) | `f58ac12c14539b7377ae0fc30e2c9b0497e97165` |
| WEB_RUNTIME_SHA | `095bb7f952e38f2304ab60bfcaff56f29c8797f0` |
| API_RUNTIME_SHA | `095bb7f952e38f2304ab60bfcaff56f29c8797f0` |
| SAME_SHA_PROOF | **PASS** at `095bb7f` (Render deps) |
| WEB_DEPLOY_ID | `dep-dalhglu1egvs73ekihhg` |
| API_DEPLOY_ID | `dep-dalhgm65vjqs73fe2j7g` |
| MIGRATIONS | flexible delivery + FG pedido context applied (guard count 33) |
| ROLLBACK_SHA | `5ca1472…` / prior live |
| REAL_SEVEN_MUTATED | **NO** |

### BLOCKED LANE (non-blocking for loop proof)

- **LANE:** redeploy tip `f58ac12` (Cliente360 documentos/finanzas)  
- **TYPE:** SECURITY_GATE / autonomous deploy auto-review  
- **EVIDENCE:** push succeeded; `render deploys create` rejected by auto-review  
- **SAFE COMPLETED:** delivery loop BV @ `095bb7f`; tip pushed  
- **UNBLOCK:** operator deploy web+API `--commit f58ac12c14539b7377ae0fc30e2c9b0497e97165`

---

## Document receipt (honest)

| Field | Value |
|---|---|
| DOCUMENT_MODEL_REUSED_OR_ADDED | Reused API PDF routes + Cliente360 link projection (tip) |
| QUOTE_PDF_CANONICAL_SOURCE | Quote snapshot/API |
| DELIVERY_NOTE_PDF_CANONICAL_SOURCE | DeliveryNote + lines render |
| STORAGE_STRATEGY | Rendered PDF on demand + DB snapshots |
| BINARY_ARCHIVAL_STATE | Residual (no external blob SoT proven) |
| AI_CONTEXT_READINESS | Architecture ready; provider not live |

---

Evidence roots:  
`docs/operations/final-pre-pilot-2026-09-16/operating-loop-hosted-bv-receipt.md`  
`docs/operations/final-pre-pilot-2026-09-16/entregas-ops-desk-integrate-receipt.md`  
`docs/operations/final-pre-pilot-2026-09-16/lane-b-dossier-timeline-receipt.md`
