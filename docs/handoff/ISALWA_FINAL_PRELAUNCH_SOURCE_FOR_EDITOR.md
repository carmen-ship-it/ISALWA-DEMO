# ISALWA — FINAL PRE-LAUNCH SOURCE FOR EDITOR

**Role:** Single factual source for Carmen → ChatGPT final drafting (welcome · user guide · owner/cost/security · technical handoff).  
**Supersedes for current-state drafting:** prior `ISALWA_HANDOFF_MASTER_SOURCE_FOR_EDITOR.md` and fragmented lane receipts’ *active* claims.  
**Not:** PDF · DOCX · USER-ACCEPT · Isa/Álvaro employee accounts · Wave C · new feature build.  
**Reconciled:** 2026-09-16 (Control Tower — final source reconciliation only)  
**Pilot URL:** https://os-web-staging.onrender.com  

**Proof vocabulary (do not collapse):**  
`PLANNED` → `IMPLEMENTED` → `TESTED` → `INTEGRATED` → `PUSHED` → `DEPLOYED` → `HOSTED` → `BROWSER-VERIFIED` → `USER-ACCEPTED`

---

# 1. FINAL RUNTIME (current hosted only)

| Field | Value |
|---|---|
| **FINAL_RUNTIME_SHA** | `2c931b48fc2ef7370972c75872de066c8bf5c34b` |
| **WEB_SHA** | `2c931b48fc2ef7370972c75872de066c8bf5c34b` |
| **API_SHA** | `2c931b48fc2ef7370972c75872de066c8bf5c34b` |
| **WEB_API_SAME** | **YES** |
| **WEB_DEPLOY_ID** | `dep-dalf9h142hec73c9nds0` · LIVE |
| **API_DEPLOY_ID** | `dep-dalf9h3l550s73b2v1ag` · LIVE |

**Included in this runtime tip:** Map porcelain fix · Almacén/Entregas/Compras pedido **read** wiring · Carmen owner-eval BUSINESS scopes (DB) · opaque-ID selectors on Finanzas/Producción/Mensajes · **owner-review UX honesty** (NO DATA / NOT AUTHORIZED / V1 FLOW TO VALIDATE) on Almacén/Compras/Entregas/Finanzas (HOSTED BROWSER-VERIFIED @1440).

Evidence spine (operations receipts, not alternate current SHAs):  
`owner-review-ux-honesty/` · `opaque-id-hosted-bv-receipt.md` · `opaque-id-mobile-bv-receipt.md` · `opaque-id-residual-adversarial-receipt.md` · `map-blank-fix-receipt.md` (ancestral map BV on `29b6f3f`, still in tip) · `loop-visual-close-receipt.md` · `carmen-owner-evaluation-access-receipt.md` · `ISALWA_V1_REAL_USER_OPERABILITY_MATRIX.md` · `visual-constitution-spot-receipt.md`

---

# 2. V1 POSITIONING (factual source wording — not marketing)

**Exact positioning for editor:**

> Esta Versión 1 permite recorrer y usar el núcleo de ISALWA y ver cómo se conecta la información entre clientes, oportunidades, cotizaciones, pedidos, trabajo, compromisos, incidencias y contexto operativo.
>
> Algunas áreas operativas —como Almacén, Compras y Entregas— ya muestran la estructura y el contexto del sistema, pero todavía queremos validar con ustedes el flujo real antes de formalizar ciertas operaciones de escritura.
>
> Eso es intencional: no queremos inventar cómo trabaja ISALWA antes de verlo con ustedes.

**Do not say:** “whole business loop fully operational” / “toda la operación ya está completa.”

---

# 3. OWNER-REVIEW LAYERS (separate claims)

## A. CORE / COMMERCIAL V1 USABLE

**CORE_COMMERCIAL_V1_USABLE = YES**

Usable under Carmen temporary evaluation login: Inicio · Clientes · Cliente360 · Oportunidades · Cotizaciones · Pedidos · Trabajo · Aprobaciones · Compromisos · Incidencias · Productos · Producción (annotation) · Finanzas operativas (selectors) · Mensajes (manual registry; WhatsApp **not** live) · Memoria / Qué cambió · Salud de datos · Mapa · Search/⌘K.

Enter-once commercial/work/issue spine: **PASS** (operability matrix).  
Canonical selectors Finanzas/Producción/Mensajes: **ZERO** opaque internal ID entry — HOSTED BV @1440 + @390 (ancestral on `e9a7a02`; tip `2c931b4`).

## B. OPERATIONAL DESKS VISIBLE / PARTIALLY PRODUCTIZED

Desks open and show structure + linked pedido **context** (read/empty honesty proven). Owner-review empty states distinguish **NO DATA** · **NOT AUTHORIZED** · **V1 FLOW TO VALIDATE** (HOSTED BV @1440 on `2c931b4`):

| Desk | Visible / read context | Write / persist |
|---|---|---|
| **Almacén** | **PASS** — pedido lines from commercial SoR; honest empty · V1 validate notice | Persisted allocation / finished-goods write = **FOUNDATION_GAP** (not a wiring defect · no fake Asignar) |
| **Compras** | **PASS** — linked-order context; process-local queue UI · V1 validate empty | DB-backed purchase SoR command/write = **FOUNDATION_GAP** |
| **Entregas** | **PASS** — linked pedidos + fulfillment reads when scoped · V1 validate notice | Delivery/exit write commands = **FOUNDATION_GAP** · no fake Registrar |

## C. FOUNDATION GAPS / BUSINESS DECISIONS (later)

| Item | Classification | Notes |
|---|---|---|
| **ALMACEN_STATE** | Read/context **PASS** · write persist **FOUNDATION_GAP** | Do not invent allocate/FG semantics |
| **COMPRAS_STATE** | Read/context **PASS** · SoR write **FOUNDATION_GAP** | Queue is process-local today |
| **ENTREGAS_STATE** | Read/context **PASS** · write commands **FOUNDATION_GAP** | Do not invent delivery/exit commands |
| **COORDINACION_STATE** | **BUSINESS_DECISION_REQUIRED** | Auto-matter / case-generation rule undefined — do not invent |

**Operability score (matrix):** **18 PASS · 3 FOUNDATION_GAP · 1 BUSINESS_DECISION_REQUIRED**

---

# 4. MAP

| Field | Value |
|---|---|
| **MAP_LIVE** | **YES** |
| **MAP_BROWSER_VERIFIED** | **YES** @1440 (ancestral fix still in tip) |
| **MAP_PROVIDER** | Mapbox Light |
| **CONFIRMED_MARKERS** | **2** |
| **ACTIVE_CUSTOMERS** | **7** |
| **INVENTED_COORDINATES** | **ZERO** |

Remaining data-quality (not basemap): 5/7 clients location link / provenance only — honest “solo enlace / coordenadas pendientes.”

---

# 5. AI

| Field | Value |
|---|---|
| **AI_LIVE** | **NO** |
| **AI_BROWSER_VERIFIED** | **NO** |

Omit AI as live from welcome / user guide. Does **not** block owner review of business SoR.

---

# 6. PASSWORD RESET

| Field | Value |
|---|---|
| **PASSWORD_RESET_UX** | **BROWSER-VERIFIED** (`/login` → recover entry) |
| **PASSWORD_RESET_FULL_E2E** | **NO / UNPROVEN** (mailbox · token complete · new login) |
| **SELF_SERVICE_WITHOUT_CARMEN** | **NO / UNPROVEN** |

Publish the login link only. Do **not** publish “recuperar sin Carmen” as proven.

---

# 7. CARMEN VERSION 1 OWNER-EVALUATION ACCESS

**Pilot decision:** Isa/Álvaro first review uses **Carmen’s broad owner-evaluation login**. Temporary evaluation access only — **not** future workforce identity. Individual users/passwords/role permissions come **later**, before real employee operation.

| Field | Value |
|---|---|
| **CARMEN_OWNER_EVALUATION_PROFILE** | **READY** |
| **OWNER_REVIEW_READY** | **YES** |
| **WHOLE_BUSINESS_LOOP_VISIBLE** | **YES** (nav + desks open under granted BUSINESS scopes) |
| **CORE_COMMERCIAL_V1_USABLE** | **YES** |
| **OPERATIONAL_WRITES_COMPLETE** | **NO** (Almacén / Compras / Entregas FOUNDATION_GAP) |
| **QA / Ver Como as normal product** | **NO** (internal only) |
| **system.admin / people.admin as business shortcut** | **NO** (`finance.operational.record` granted explicitly) |

**BUSINESS scopes granted** (additive over prior `people.admin`, `master_data.admin`, `qa.access`):  
`management.org.read`, `commercial.customer.create`, `commercial.team.read`, `commercial.org.read`, `commercial.quote.convert.own`, `commercial.order.convert`, `commercial.account.reassign`, `commercial.price.approve`, `finance.operational.record`, `production.operational.record`, `production.entry.member`, `production.review.member`, `warehouse.finished_goods.receive`, `warehouse.finished_goods.allocate`, `warehouse.outbound.record`, `purchasing.operational.record`, `operations.coordinator.record`, `coordination.decision.record`, `delivery.record`, `issue.manage`

**Attribution:** Shared review actions attribute to Carmen — prefer exploration; SYNTH/test-safe mutations; do not mutate protected real-seven customer truth to demo.

---

# 8. ENTER-ONCE / CANONICAL REFERENCE

| Field | Value |
|---|---|
| **OPAQUE_ID_TRANSCRIPTION** | **ZERO** on Finanzas · Producción · Mensajes (primary surfaces) |
| **CANONICAL_SELECTOR_PASS** | **YES** · HOSTED @1440 + @390 on `e9a7a02` |
| **CONTEXT_CARRY_FORWARD_PASS** | **PARTIAL** — Finanzas query prefill in code; interactive prefill walk **UNPROVEN** |
| **BACKEND_REFERENCE_AUTH_PASS** | **PARTIAL** — UI fail-closed re-spot PASS; true unscoped auth-negative **UNPROVEN** |
| **KNOWN_REFERENCE_WIRING_DEFECTS_REMAINING** | **ZERO** |

**Human rule (safe):** New fact = enter once. Existing ISALWA fact = carry forward or select canonical truth. Historical truth stays; new work adds forward.

Matrices (evidence, not alternate current runtimes):  
`ISALWA_CANONICAL_REFERENCE_INTEGRITY_MATRIX.md` · `ISALWA_ENTER_ONCE_LOOP_CLOSURE_MATRIX.md`

---

# 9. VISUAL + BV

| Field | Value |
|---|---|
| **VISUAL_CONSTITUTION_PRESERVED** | **YES** |
| **DESKTOP_BV** | **YES** @1440 — `/mapa` · `/almacen` · `/entregas` · `/compras` · `/finanzas` · `/produccion` · `/mensajes` |
| **MOBILE_BV** | **YES** @390 — `/finanzas` · `/produccion` · `/mensajes` (selectors); other routes **UNPROVEN** this close |

---

# 10. COST / OWNERSHIP / RECOVERY

| Field | Value |
|---|---|
| **CURRENT_VERIFIED_COSTS** | **UNKNOWN** — no invoice dollars in repo |
| **PLANNING_BANDS** | Staging+related ~USD **80–200**/mo excl. WhatsApp/AI/maps (**BAND ONLY**) |
| **CURRENT_OWNERSHIP** | Carmen-personal staging (Render web/API/Postgres · Supabase Auth) |
| **THIN_PILOT_EXCEPTION_END_DATE** | **2026-09-30** |
| **PRODUCTION_ENVIRONMENT** | **NOT EVIDENCED** |
| **DUAL_RECOVERY** | **NOT COMPLETE** |
| **BACKUP_POSTURE** | **PARTIAL** — R2 off-host not provisioned; prod PITR **NOT EVIDENCED** |

---

# 11. CURRENT GAPS (one list only)

### DOES NOT BLOCK OWNER REVIEW

- Full SYNTH interactive mutation / lineage walk on tip **UNPROVEN**
- Unscoped selector auth-negative **UNPROVEN**
- AI **not** live
- Password mailbox / token / new-login E2E **UNPROVEN** (UX link proven)
- Finanzas interactive prefill walk **UNPROVEN**
- Most non-selector desks not re-BV’d @390
- Quote → pedido convert interactive walkthrough **UNPROVEN** this close
- WhatsApp send **NOT LIVE** (Mensajes honesty copy)

### BLOCKS REAL EMPLOYEE OPERATION

- Isa/Álvaro **individual** accounts not created (intentional until after owner review)
- Password full self-service without Carmen **UNPROVEN** (if required for employee day-1)
- Almacén persisted allocation / FG write **FOUNDATION_GAP**
- Compras DB-backed SoR write **FOUNDATION_GAP**
- Entregas delivery/exit write commands **FOUNDATION_GAP**

### BLOCKS FORMAL PRODUCTION

- Company ownership / dual recovery incomplete
- Production environment / hostname **NOT EVIDENCED**
- Backup posture not production-grade
- Formal production readiness = **NO**

### BUSINESS DECISION REQUIRED

- Coordinación auto-matter / case-generation semantics (do not invent)
- Order ↔ Production auto-link policy (residual; Producción desk still usable for annotation)
- Whether pilot accepts admin-assisted password recovery vs requiring mailbox E2E before employee use

---

# 12. SAFE-TO-PUBLISH WORDING SEEDS (not polished)

**Access:**  
“Para esta primera revisión de Versión 1 van a entrar con un acceso único de evaluación para que puedan recorrer ISALWA y ver cómo se conecta la información. Este acceso compartido es solamente para esta etapa de revisión. Cuando terminemos de ajustar ISALWA con su feedback y empiece el uso operativo del equipo, cada persona tendrá su propio usuario, contraseña y permisos según su función.”

**V1 scope (use §2 positioning verbatim or lightly polish):** core commercial usable; Almacén/Compras/Entregas structure+context visible; write formalization waits on owner validation.

**Map:**  
“El mapa está en vivo. Solo se trazan clientes con coordenadas confirmadas (2 de 7 hoy). No inventamos ubicaciones.”

**AI:**  
“La asistencia de inteligencia artificial no está en vivo hoy.”

**Password:**  
“En el ingreso hay un enlace para pedir recuperación de contraseña. Todavía no afirmamos que el correo complete el cambio sin ayuda de Carmen.”

**Enter-once:**  
“Los datos se registran una vez y aparecen donde corresponden. El historial se conserva; el trabajo nuevo se agrega sin borrar lo anterior.”

---

# 13. EDITOR CLAIM TABLE

| CLAIM | CURRENT STATE | SAFE TO PUBLISH | NOTES |
|---|---|---|---|
| Version 1 staging pilot usable (core) | **YES** · HOSTED `2c931b4` | YES | Not formal production |
| Owner review via temporary Carmen login | **YES** | YES if labeled temporary | Not future IdP model |
| Whole ops write loop finished | **NO** | NO | FOUNDATION_GAPs disclosed |
| Enter once / no opaque ID retype (Fin/Prod/Msg) | **YES** · BV @1440+@390 | YES | |
| Map live | **YES** | YES | 2/7 · no invented coords |
| AI live | **NO** | NO as live | |
| Password recovery full E2E | **NO** | Link YES · E2E NO | |
| Individual employee accounts ready | **NO** | NO as done | After owner review |
| Formal production ready | **NO** | NO | |

---

# 14. FINAL CLAIMS (exactly once)

| Field | Value |
|---|---|
| **FINAL_RUNTIME_SHA** | `2c931b48fc2ef7370972c75872de066c8bf5c34b` |
| **CORE_COMMERCIAL_V1_USABLE** | **YES** |
| **OWNER_REVIEW_READY** | **YES** |
| **ALMACEN_STATE** | Read/context **PASS** · write persist **FOUNDATION_GAP** · owner-review honesty **PASS** @1440 |
| **COMPRAS_STATE** | Read/context **PASS** · DB SoR write **FOUNDATION_GAP** · owner-review honesty **PASS** @1440 |
| **ENTREGAS_STATE** | Read/context **PASS** · write commands **FOUNDATION_GAP** · owner-review honesty **PASS** @1440 |
| **COORDINACION_STATE** | **BUSINESS_DECISION_REQUIRED** |
| **OPAQUE_ID_TRANSCRIPTION** | **ZERO** (Finanzas · Producción · Mensajes) |
| **DESKTOP_BV** | **YES** |
| **MOBILE_BV** | **YES** (selectors @390) · other routes UNPROVEN |
| **AI_LIVE** | **NO** |
| **PASSWORD_RESET_FULL_E2E** | **NO / UNPROVEN** |
| **SAFE_FOR_ISA_ALVARO_OWNER_REVIEW** | **YES** — temporary Carmen evaluation login · gaps disclosed · AI omitted · password E2E not overstated · ops writes not claimed finished · owner-review empty states honest |
| **REAL_EMPLOYEE_OPERATION_READY** | **NO** |
| **FORMAL_PRODUCTION_READY** | **NO** |
| **USER_ACCEPTED** | **NO** |
| **FINAL_SOURCE_INTERNAL_CONTRADICTIONS** | **ZERO** |
| **READY_FOR_CHATGPT_FINAL_DRAFT** | **YES** |

---

# SUPERSEDED / HISTORICAL EVIDENCE

Do not use as current user-facing truth. Prior runtimes and mid-close claims live only here.

| Topic | Old claim | Superseded by |
|---|---|---|
| FINAL_RUNTIME_SHA mid-close | `23e50b0` · `1472796` · `c30f1e7` · `29b6f3f` · `e9a7a02` as “current LIVE” | **`2c931b4` WEB=API LIVE** |
| Map blank FAIL / EXTERNAL_CREDENTIAL_GATE | blank porcelain / credential wait | Map LIVE (ancestral `29b6f3f` fix in tip) |
| Password “missing on login” | early defect | UX **BROWSER-VERIFIED**; full E2E still UNPROVEN |
| Almacén `pedidos: []` as foundation lie | pre-read wiring | pedido **read** wiring PASS; write still FOUNDATION_GAP |
| Opaque-ID free-text / “hosted BV pending” / mobile “in flight” | open defect / pending | **FIXED + HOSTED PASS** @1440 + @390 |
| Editor “Finanzas/Producción still friction” | mid-close seed | Selector friction **closed** on those desks |
| Isa/Álvaro day-1 individual invites | prior handoff drafts | Temporary **shared Carmen evaluation login** |
| SAFE_FOR_ISA_ALVARO = NO (mid-close receipts) | serial/map CT receipts | **YES** with disclosed gaps |

**STOP.**
