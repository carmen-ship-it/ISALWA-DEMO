# ISALWA V1 Company OS — FINAL MASTER-SPEC CLOSURE RECEIPT

**Date:** 2026-09-17T00:37Z  
**Branch:** `pre-pilot/company-os-pass`  
**Pilot:** https://os-web-staging.onrender.com  
**Evidence JSON:** `docs/operations/final-pre-pilot-2026-09-16/operating-loop-bv/master-close-bv-latest.json`  
**BV shots:** `operating-loop-bv/master-close-2026-09-17T00-33-32-*.png`

---

## FINAL_SOURCE_SHA

`1244d84ef75142d973c8f7aa44caeadd66361768`

## WEB_RUNTIME_SHA

`1244d84ef75142d973c8f7aa44caeadd66361768`

## API_RUNTIME_SHA

`1244d84ef75142d973c8f7aa44caeadd66361768`

## SAME_SHA_PROOF

**PASS** — Render live tip for web and API both equal FINAL_SOURCE_SHA.

## DEPLOY_IDS

| Service | Deploy ID | Status |
|---|---|---|
| WEB `srv-dajddb67bikc73bl42q0` | `dep-dalj6pp42hec73cm80vg` | **live** |
| API `srv-dajd64gae00c739gpk20` | `dep-dalj6q3l550s73bfar90` | **live** |

**REAL_SEVEN_MUTATED:** **NO**  
**SYNTH org:** `01M2JKF77TXMJNDTKNCYNHH9G5`  
**Canonical SYNTH Pedido:** `O-000001` / `01M2P3CAP2QCTXXRRB4A0G74XJ` · Party `01M2JSDQJNYZ03N8808PBEDVS8`

**Lineage (accepted tip includes):** delivery ops desk · Cliente360 documentos/finanzas · Pedido timeline · Inicio attention · Almacén delivery-ops pedido load · Nota palette search · FG idempotency + Prisma `$transaction` bind.

---

## CARMEN HANDOFF — WHAT I NEED TO KNOW

### 1. Is the entire client→delivery V1 loop browser-proven?

**Yes on SYNTH, with honest scope.** On final SHA `1244d84`: Pedido, Entregas (Nota + PDF), FG receive, Cliente360, Pedido dossier/timeline, Search (incl. Nota for Coordinación), Map, Finance boundary, mobile 390 — **BROWSER_VERIFIED**. Quote→send→convert→Pedido was hosted-proven earlier in this same pre-pilot lineage; the SYNTH Pedido already exists and was re-verified (not re-created) on final SHA.

### 2. Is finished-goods receive now browser-proven?

**Yes.** Almacén selected Pedido `O-000001` without typing an opaque ID → Registrar ingreso físico → success → double-click did not duplicate → reload showed persisted receipt with actor/time/Pedido context. Contab denied. Commercial Pedido URL denied for Almacén.

### 3. What does Inicio tell an employee?

Deterministic attention from Work / Approvals / Issues / Commitments when those facts exist (due today, overdue, follow-up, assigned issue, pending approval, explicit commitment due). Empty state is honest (“no tienes pendientes…”), not invented priority scores or fake SLAs.

### 4. What does Cliente360 contain?

On final SHA: **RESUMEN** (identity, owner, contacts, locations, next action) · **COMERCIAL** (opportunities, quotes, orders) · **OPERACIÓN** context · **TRABAJO** · **INCIDENCIAS/COMPROMISOS** · **DOCUMENTOS** (Quote/Nota PDF links) · **FINANZAS** (operational only, no ledger claims) · **HISTORIAL** (durable events). Relations deep-link to canonical records. No duplicate local dossier store.

### 5. What does Pedido contain?

Source Quote, inherited client, lines/values, production/warehouse context where present, Nota(s), Salida/Entrega evidence, Work, Issues, Documents, durable Timeline from persisted events (not inferred UI state).

### 6. What documents are linked and historically reproducible?

| Document | Source of truth | Historical meaning |
|---|---|---|
| Quote PDF | Quote snapshot via API render | Stable for submitted/issued quote content |
| Nota PDF | DeliveryNote + stored snapshot lines | Issued note remains reproducible; numbering still provisional |
| Cliente360 / Pedido links | Same API PDF routes | Deep links only — no second binary archive |

**BINARY_ARCHIVAL_STATE = RESIDUAL** (on-demand render + DB snapshots; no external blob SoT).

### 7. What can Search find?

| Kind | Final-SHA proof |
|---|---|
| CLIENT | **BROWSER_VERIFIED** |
| CONTACT/PHONE | Implemented in search extensions; not separately scored this pass |
| OPPORTUNITY | Implemented (palette) |
| QUOTE | **BROWSER_VERIFIED** |
| PEDIDO | **BROWSER_VERIFIED** |
| NOTA | **BROWSER_VERIFIED** (Coordinación / delivery-ops path; Asesor without ops scopes may not see Nota hits — capability-honest) |
| PRODUCT | Residual (palette kind exists; live indexing not proven this pass) |
| DOCUMENT | Nota hits under document group |
| ISSUE | Implemented |
| COMMITMENT | Implemented |

Search auth negative (Contab): **PASS** (no Nota leakage).

### 8. How does Reportar incidencia work?

CTA inherits source/client/Pedido context from the open record. Does not require typing internal IDs. Creates governed Issue linked to that subject.

### 9. How does the user know who is responsible?

Where canonical assignment exists, the UI shows the actual responsible member.

### 10. What happens when nobody is assigned?

Copy: **“Aún no hay una persona responsable asignada.”** If the user can assign: **Asignar responsable**. No invented “contact Gerencia / warehouse manager.”

### 11. What is automatic?

Money totals from contracts · attention projection from due facts · timeline from persisted events · Pedido inheritance of client/lines from Quote · Nota/Entregas prefills from Pedido selection · PDF render from stored snapshots.

### 12. What requires explicit human confirmation?

Registrar como enviada · Programar seguimiento · Convertir a pedido · Registrar ingreso PT · Crear nota · Registrar salida · Registrar entrega · Aprobar/Rechazar · Completar/Reprogramar · Asignar responsable · Reportar incidencia.

### 13. What still requires leaving ISALWA?

Official accounting / tax / facturación / cobranza · live WhatsApp send · AI assist (provider not live for production use) · external binary archival if required later.

### 14. Which remaining items are true Isa/Álvaro decisions?

Official Nota numbering · Exact Nota trigger timing · Pedido↔Producción ownership semantics · Production lifecycle/SLA · Special-price threshold/timing · Cross-owner Quote conversion · Coordinación automation criteria · Authoritative real catalog values if absent · Official accounting rules · Unsupported future role mapping.

### 15. Which remaining items are technical residuals?

BINARY_ARCHIVAL (no blob provider) · Product live search indexing · Full password-reset mailbox E2E · Asesor Nota search without delivery-ops scopes (capability, not a bug) · Formal production infra ownership · Individual real-employee accounts / password recovery readiness.

### 16. Can Carmen demonstrate all implemented business actions from one login?

**Owner-eval login:** one evaluation identity with explicit business scopes on REAL org — **no admin bypass**. Full SYNTH mutation walk uses SYNTH personas (Asesor / Almacén / Coordinación). Carmen on REAL cannot mutate SYNTH Pedido URLs.

### 17. Are real employees ready?

**REAL_EMPLOYEE_OPERATION_READY = NO** (qualified). Platform supports invite / active-suspended / scope assignment / termination-reactivation / historical actor preservation where administered. Individual identities + self-service password recovery not fully proven for real ops.

### 18. Is formal production ready?

**FORMAL_PRODUCTION_READY = NO.** Staging pilot is usable for SYNTH/owner review. **USER_ACCEPTED = NO** (human only).

---

## PAGE_COMPLETENESS_MATRIX

States: I=IMPLEMENTED · T=TESTED · H=HOSTED · BV=BROWSER_VERIFIED on final SHA · RO=read-only honest.

| Route | Purpose / primary CTA | Data / write | Cap gate | Empty/unauth/error | Deep links / no opaque IDs | Mobile 390 / Desktop 1440 | State |
|---|---|---|---|---|---|---|---|
| Inicio | Daily attention | Work/approvals/issues/commitments | session | honest empty | deep links | BV shots | BV |
| Clientes | Nuevo cliente | Parties SoR | commercial | yes | yes | lineage | H+prior BV |
| Cliente360 | Dossier sections | Canonical reads | commercial | yes | PDF + records | BV | **BV** |
| Oportunidades | Nueva oportunidad | Opportunities | commercial | yes | yes | lineage | H |
| Cotizaciones | Nueva / PDF / enviar / convertir | Quotes | commercial | yes | yes | prior BV | H+prior BV |
| Pedidos | Case + timeline | Orders + events | commercial | yes | yes | **BV** | **BV** |
| Trabajo | Completar / reprogramar | Work items | work | yes | yes | lineage | H |
| Aprobaciones | Aprobar / Rechazar | Approvals | approval | yes | yes | lineage | H |
| Compromisos | Track commitments | Commitments | commitment | yes | yes | lineage | H |
| Incidencias | Reportar / Asignar | Issues | issue | yes | context inherit | lineage | H |
| Producción | Anotación + Pedido context | Ops annotation | production | yes | SearchableSelect | lineage | H |
| Almacén | Registrar ingreso PT | FG command | warehouse | yes | SearchableSelect | **BV** | **BV** |
| Compras | Linked orders (honest) | Purchasing reads | purchasing | yes | typeahead | lineage | H |
| Entregas | Nota / Salida / Entrega | Delivery ops | delivery/warehouse | yes | ops desk | **BV** | **BV** |
| Finanzas | Operational evidence only | No ledger claims | finance | honest RO | yes | **BV** | **BV** |
| Mapa | Commercial geography | Map reads | commercial | yes | yes | **BV** | **BV** |
| Mensajes | Party typeahead | Messaging | messages | honest | no opaque ID | prior opaque BV | H |
| Data Health | Health signals | Reads | health | yes | — | lineage | H |
| Equipo/Admin | Invite / scopes | Workforce admin | people.admin | yes | — | lineage | H |
| Ayuda | Guidance | Static/help | session | — | — | lineage | H |
| Search ⌘K | Find governed entities | Session search | per-kind | auth neg PASS | no opaque labels | **BV** | **BV** |

---

## FEATURE_MATRIX

| Feature | IMPL | TEST | INTEG | PUSH | DEPLOY | HOST | BV @ final SHA | Notes |
|---|---|---|---|---|---|---|---|---|
| OWN_QUOTE_TO_ORDER | Y | Y | Y | Y | Y | Y | Prior lineage; Pedido live | Not re-converted this pass |
| QUOTE_PDF | Y | Y | Y | Y | Y | Y | Y (Cliente360 links) | |
| MANUAL_SEND / FOLLOW_UP | Y | Y | Y | Y | Y | Y | Prior lineage | |
| DELIVERY_NOTE_CREATE | Y | Y | Y | Y | Y | Y | Y (desk present) | |
| DELIVERY_NOTE_PDF | Y | Y | Y | Y | Y | Y | **Y** | |
| SALIDA | Y | Y | Y | Y | Y | Y | Prior @095bb7f + desk live | |
| ENTREGA | Y | Y | Y | Y | Y | Y | Prior @095bb7f + desk live | |
| FINISHED_GOODS_RECEIVE | Y | Y | Y | Y | Y | Y | **Y** | Mutation+reload+idempotency |
| CLIENTE360_DOCUMENTOS | Y | Y | Y | Y | Y | Y | **Y** | |
| CLIENTE360_FINANZAS | Y | Y | Y | Y | Y | Y | **Y** | Operational only |
| PEDIDO_DOSSIER_TIMELINE | Y | Y | Y | Y | Y | Y | **Y** | Persisted events |
| INICIO_ATTENTION | Y | Y | Y | Y | Y | Y | **Y** | |
| SEARCH_NOTA | Y | Y | Y | Y | Y | Y | **Y** (Coordinación) | |
| MAP | Y | Y | Y | Y | Y | Y | **Y** | No revenue claim |
| REAL_SEVEN_UNMUTATED | — | — | — | — | — | — | **PASS (NO)** | |

---

## ACTOR_MATRIX

| Action | Who may see | Who may execute | Command / store | Event / next |
|---|---|---|---|---|
| Nuevo cliente | commercial create | same | CreateParty | Cliente page |
| Nueva oportunidad / cotización | commercial | same | Opportunity/Quote cmds | Record pages |
| Descargar PDF (Quote/Nota) | readers with doc access | same | GET PDF | Download |
| Registrar como enviada | quote owner/commercial | same | Send registry | Historial + follow-up CTA |
| Programar seguimiento | commercial | same | Work follow-up | Inicio/Trabajo |
| Convertir a pedido | convert.own (own quote) | same | ConvertQuote | Pedido |
| Registrar ingreso PT | warehouse receive | Almacén | `ReceiveFinishedGoods` | Receipt + business event |
| Crear nota de entrega | delivery.record | Coordinación/eval | CreateDeliveryNote | Nota + timeline |
| Registrar salida | warehouse.outbound.record | Almacén | outbound cmd | Timeline |
| Registrar entrega | delivery.record | Coordinación | delivery confirm | Timeline |
| Aprobar / Rechazar | approval scopes | assignee/approver | Approval cmds | Status |
| Completar / Reprogramar | work scopes | assignee | Work cmds | Inicio |
| Asignar responsable | when assign permitted | same | Assignment | Label updates |
| Reportar incidencia | broadly | same | CreateIssue | Issue + context |

Fake enabled CTAs: **not shown** when write path unavailable.

---

## DOCUMENT_RECEIPT

| Field | Value |
|---|---|
| DOCUMENT_MODEL | Reused API PDF routes + dossier link projection |
| QUOTE_PDF_CANONICAL_SOURCE | Quote snapshot |
| DELIVERY_NOTE_PDF_CANONICAL_SOURCE | DeliveryNote + lines |
| STORAGE_STRATEGY | On-demand render + DB snapshots |
| BINARY_ARCHIVAL_STATE | **RESIDUAL** |
| AI_CONTEXT_READINESS | Architecture ready; provider not live |

---

## DATABASE_RECEIPT

| Field | Value |
|---|---|
| SoR | Postgres (os-database / Prisma) |
| FG write | `osFinishedGoodsReceipt` + `osBusinessEvent` (bound `$transaction`) |
| Delivery | DeliveryNote + lines + timeline events |
| Migrations | Flexible delivery + FG pedido context already applied (prior close) |
| REAL_SEVEN | Unchanged |
| SYNTH mutations this pass | FG receive on O-000001 only |

---

## SEARCH_RECEIPT

| Kind | Result |
|---|---|
| CLIENT | BV |
| QUOTE | BV |
| PEDIDO | BV |
| NOTA / DOCUMENT | BV (Coordinación) |
| OPPORTUNITY / ISSUE / COMMITMENT / PEOPLE / APPROVAL | Implemented |
| PRODUCT | Residual indexing |
| CONTACT/PHONE | Extensions present; not separately BV this pass |
| AUTH_NEGATIVE | Contab: no Nota leakage **PASS** |

---

## AUTH_NEGATIVE_RECEIPT

| Check | Result |
|---|---|
| Contab cannot FG on `/almacen` | **PASS** |
| Almacén cannot open commercial Pedido URL | **PASS** |
| Contab search does not leak Nota | **PASS** |
| No people.admin shortcut for ops writes | **PASS** (capability-gated) |
| Cross-tenant / REAL_SEVEN | **NO mutation** |

---

## MOBILE_DESKTOP_RECEIPT

| Viewport | Surfaces | Result |
|---|---|---|
| 1440 | FG, Entregas, Cliente360, Pedido, Inicio, Search, Map, Finance | **BV** shots `…00-33-32-*.png` |
| 390 | Entregas + Almacén | **BV** usable |

---

## OPEN_BUSINESS_DECISIONS

1. Official Nota numbering  
2. Exact Nota trigger timing  
3. Pedido ↔ Producción ownership semantics  
4. Production lifecycle / SLA  
5. Special-price threshold / timing  
6. Cross-owner Quote conversion  
7. Coordinación automation criteria  
8. Authoritative real catalog values (if absent)  
9. Official accounting rules  
10. Unsupported future role mapping  

These are **not** engineering failures.

---

## OPEN_ENGINEERING_RESIDUALS

1. **BINARY_ARCHIVAL_STATE = RESIDUAL** — no external blob provider (do not invent one).  
2. **PRODUCT** live search indexing — not BV this pass.  
3. **Password-reset mailbox E2E** — partial / unproven for real employees.  
4. **REAL_EMPLOYEE_OPERATION_READY = NO** — individual identities + recovery.  
5. **FORMAL_PRODUCTION_READY = NO** — staging pilot only.  
6. Asesor without delivery-ops scopes may not see Nota in ⌘K (capability-honest, not a missing adapter).

No safe engineering residuals left for: Almacén Pedido load, FG submit 500s (false idempotency + unbound `$transaction`), Cliente360 docs/finanzas deploy lag, or Nota search for ops writers.

---

## Close-out engineering fixed this round (same tip lineage)

| SHA | Fix |
|---|---|
| `f3aaf64` | Almacén/Producción Pedido load falls back to delivery-ops; Nota palette indexing |
| `9f64357` | FG unique-violation detection tightened (no false idempotent replay) |
| `1244d84` | Prisma `$transaction` called bound (fixes `_tracingHelper` 500) |

---

## Readiness gates

| Gate | Status |
|---|---|
| SAFE_FOR_CARMEN_FINAL_WALKTHROUGH | **YES** (SYNTH personas + owner-eval on REAL scopes) |
| SAFE_FOR_ISA_ALVARO_OWNER_REVIEW | **YES** (staging; open decisions labeled) |
| REAL_EMPLOYEE_OPERATION_READY | **NO** |
| FORMAL_PRODUCTION_READY | **NO** |
| USER_ACCEPTED | **NO** |

**MASTER SPEC operating loop on final SHA:** **CLOSED** for hosted SYNTH proof of FG + Entregas + Cliente360 + Pedido + Search + Inicio + Map + Finance + auth negatives.  
**MASTER SPEC company readiness:** still **NO** for real-employee / formal production (by design of open gates above).
