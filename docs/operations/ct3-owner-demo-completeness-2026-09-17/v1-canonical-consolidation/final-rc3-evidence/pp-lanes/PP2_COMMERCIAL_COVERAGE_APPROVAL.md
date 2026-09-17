# PP-2 — Commercial buttons + approval + ownership/coverage

**As of:** 2026-09-17  
**Scope:** Read-only inventory of user-visible CTAs for the commercial loop, approval, ownership reassignment, temporary coverage, and “quién tiene la pelota.”  
**Product code edited this pass:** none.  
**Deploy / hosted BV:** not claimed.  
**Tree:** DIRTY (RC3 View As / eval narrowing on Cliente360 + quote pages; coverage/approval CTA surfaces themselves are already at HEAD/`8a153a4` unless noted).

**LOCAL?** = local automated or unit proof exists for the command/predicate (not hosted PASS).  
**DIRTY RC3?** = only where the working tree currently changes that surface (or related evidence is uncommitted).

---

## Scoreboard (inventory)

| CTA | BUTTON EXISTS? | LOCAL? | DIRTY RC3? |
|---|---|---|---|
| Nueva oportunidad | YES | YES (CreateOpportunity suites) | NO (links stable; Cliente360 page dirty for View As only) |
| Crear cotización | YES | YES | NO |
| Quote lines (add/edit/remove) | YES | YES (AddQuoteLine / line-write denials) | NO |
| PDF (Ver / Descargar) | YES | PARTIAL (PDF UI tests; hosted PDF env-dependent) | NO |
| Registrar como enviada | YES | YES (RecordQuoteManualSend) | NO |
| Seguimiento | YES | YES (CreateWorkItem follow-up) | NO |
| Solicitar aprobación | YES | YES (RequestApproval + authority predicates) | NO |
| Aprobar / Rechazar | YES | YES (Approve/Reject work commands) | NO (post-approval continue cue at HEAD) |
| Escalación | **NO action button** | N/A (guidance lib only; panel unmounted) | NO |
| Aceptación (standalone) | **NO** | N/A — acceptance is CreateOrder side-effect | NO |
| Convertir a Pedido | YES | YES (CreateOrder / canConvertQuoteToOrder) | NO |
| Asignar / Quitar apoyo temporal | YES | YES (Grant/RevokeCustomerCoverage — see RC3_COVERAGE_*) | Mount at HEAD; **evidence docs dirty/untracked** |
| Reasignar responsable | YES (label: **Cambiar responsable**) | YES (ReassignCommercialAccountOwner) | NO |
| Quién tiene la pelota | Display card (+ optional approval link) | YES (view unit tests) | Quote page dirty for View As/auth wiring; card at HEAD |

---

## Per-CTA inventory

### 1. Nueva oportunidad

| Field | Value |
|---|---|
| **BUTTON EXISTS?** | YES |
| **WHERE?** | Cliente360 header primary link; Comercial tab section header + empty state; customer quick-view; command palette (`Nueva oportunidad` → pick customer). Form page: `/clientes/[partyId]/oportunidades/nueva` submit **Crear oportunidad**. |
| **WHO SEES IT?** | Any authenticated user who can open Cliente360 / palette. Link is not gated by `commercialAuthority` in UI. Command requires `member_active` + party visibility; fails at command if unauthorized. |
| **ENABLE/DISABLE** | Always shown as navigation when surface loads. Form submit blocked under role-preview mutation gate. |
| **COMMAND** | `CreateOpportunity` via `createOpportunityAction` |
| **LOCAL?** | YES — commercial command / tenant suites |
| **DIRTY RC3?** | NO for CTA itself. Cliente360 `page.tsx` dirty only for evaluation commercial-list narrowing. |

---

### 2. Crear cotización

| Field | Value |
|---|---|
| **BUTTON EXISTS?** | YES |
| **WHERE?** | Opportunity page primary / sticky bars (`Crear cotización` or `Ver cotización` when linked); RecordNextStep cue; command palette; form `/clientes/.../cotizaciones/nueva` submit **Crear cotización**. |
| **WHO SEES IT?** | Users who can open the opportunity. Create link shown when opportunity is open (even if a quote already exists → secondary). |
| **ENABLE/DISABLE** | Opportunity closed without quote → no create CTA. Command fails if party/opportunity not writable. |
| **COMMAND** | `CreateQuote` via `createQuoteAction` |
| **LOCAL?** | YES |
| **DIRTY RC3?** | NO |

---

### 3. Quote lines

| Field | Value |
|---|---|
| **BUTTON EXISTS?** | YES (draft editor only) |
| **WHERE?** | Quote detail `#editar-cotizacion` → `QuoteEditor`: **Agregar a la cotización**, **Guardar línea**, **Eliminar línea**; also **Guardar cambios**, **Enviar cotización**, **Cancelar cotización**. Read-only line list above when not editing. |
| **WHO SEES IT?** | Anyone who can load the quote page; editor mounts only while `quote.status === 'draft'` (`quoteLinesAreEditable`). |
| **ENABLE/DISABLE** | Add submit disabled until product picker ready (`disabled={!addReady}`). Entire editor hidden after submit/cancel or non-draft. Server denies line writes without commercial write authority. |
| **COMMAND** | `AddQuoteLine` / `UpdateQuoteLine` / `RemoveQuoteLine` (+ `UpdateQuote`, `SubmitQuote`, `CancelQuote`) |
| **LOCAL?** | YES — `commercial-tenant-write` AddQuoteLine denials + web product-picker tests; see `RC3_COMMERCIAL_LOOP_PRECONDITIONS.md` |
| **DIRTY RC3?** | NO |

---

### 4. PDF

| Field | Value |
|---|---|
| **BUTTON EXISTS?** | YES when PDF-ready |
| **WHERE?** | `QuoteDetailActions` + `QuotePdfDownloadButton` / `QuoteDocumentoCard`: **Ver PDF**, **Descargar PDF**. Also Cliente360 documentos links. |
| **WHO SEES IT?** | Quote viewers; download uses session (`GET /api/quotes/:id/pdf`). |
| **ENABLE/DISABLE** | Shown only if `isQuotePdfReady` → status `submitted` \| `accepted` \| `cancelled`. Draft shows copy: PDF not ready. Buttons disable while fetch pending. |
| **COMMAND** | None (HTTP PDF generation, not a commercial command) |
| **LOCAL?** | PARTIAL — UI readiness tests; hosted PDF depends on env/service |
| **DIRTY RC3?** | NO |

---

### 5. Registrar como enviada

| Field | Value |
|---|---|
| **BUTTON EXISTS?** | YES |
| **WHERE?** | Quote header actions (`QuoteDetailActions`); Envío section (`QuoteEnvioSection` modal/form). |
| **WHO SEES IT?** | When `canRecordQuoteManualSend(status)` and no prior send record on timeline. |
| **ENABLE/DISABLE** | Enabled only for `submitted` and no existing send record. Hidden otherwise; history shown if already recorded. Does **not** send WhatsApp/email provider-side. |
| **COMMAND** | `RecordQuoteManualSend` via `recordQuoteManualSendAction` |
| **LOCAL?** | YES — `record-quote-manual-send.test.ts` + web `quote-manual-send.test.ts` |
| **DIRTY RC3?** | NO |

---

### 6. Seguimiento (Registrar / Programar)

| Field | Value |
|---|---|
| **BUTTON EXISTS?** | YES |
| **WHERE?** | Labels: **Registrar seguimiento** (canonical) / **Programar seguimiento** (Cliente360 menu + quote Acciones menu). Surfaces: Cliente360 header secondary + actions drawer; quote `#seguimiento` inside Envío (after send or when follow-up offered); command palette; map/quick-view links; Trabajo section on Cliente360. |
| **WHO SEES IT?** | Broad: Cliente360 always offers schedule/register. Quote Acciones menu item when `canRegisterQuoteFollowUp` → `submitted` only. Envío follow-up block when send recorded or `showFollowUp`. |
| **ENABLE/DISABLE** | Form requires next-action text + session identity. Completar/Cancelar on work item detail. Role-preview blocks mutations. |
| **COMMAND** | `CreateWorkItem` (register); `CompleteWork` / `CancelWorkItem` (close). Subject is party/commercial_account — not a quote subject. |
| **LOCAL?** | YES — follow-up / quote-follow-up web tests |
| **DIRTY RC3?** | NO |

---

### 7. Solicitar aprobación

| Field | Value |
|---|---|
| **BUTTON EXISTS?** | YES |
| **WHERE?** | Quote (and Pedido) **Aprobación** section → `CommercialApprovalPanel` submit **Solicitar aprobación** (+ approver typeahead). Section shown when quote `submitted` or approvals already exist. |
| **WHO SEES IT?** | Request form only if `authority.canRequestApproval === true` (API subject authority). |
| **ENABLE/DISABLE** | Eligible when quote `submitted` (order: `open`) **and** actor === subject owner (`canRequestCommercialSubjectApproval`). Hidden when `canRequest` false. |
| **COMMAND** | Work `RequestApproval` via `requestCommercialApprovalAction` |
| **LOCAL?** | YES — authority predicates + postsale contract local |
| **DIRTY RC3?** | NO |

---

### 8. Aprobar / Rechazar

| Field | Value |
|---|---|
| **BUTTON EXISTS?** | YES |
| **WHERE?** | (a) Inline on quote/order approval history when `approval.canDecide`; (b) `/aprobaciones/[approvalRequestId]` decision form; (c) `/aprobaciones` / Trabajo pending cards — **Aprobar** / **Rechazar** are **links** to detail (not inline mutate). |
| **WHO SEES IT?** | Enabled for assigned approver (or `delegatedApproverFor` that member). Others see locked disabled buttons or “Solo el aprobador asignado…”. |
| **ENABLE/DISABLE** | Active when `status === pending` and `canDecide`. Reject requires reason. After success, buttons lock; quote approve may redirect to quote (still does **not** CreateOrder). |
| **COMMAND** | Work `Approve` / `Reject` via `decideCommercialApprovalAction` |
| **LOCAL?** | YES — postsale “approval ≠ pedido” local |
| **DIRTY RC3?** | NO for buttons. Post-approval **Convertir a Pedido** continue cue uses `postApprovalContinue` at HEAD on approval detail. |

---

### 9. Escalación

| Field | Value |
|---|---|
| **BUTTON EXISTS?** | **NO** — no “Escalar” / escalate mutation CTA |
| **WHERE?** | `EscalationGuidancePanel` + derive lib under `lib/escalation/` — **not mounted** on app pages (no imports outside escalation module/tests). Stage label copy includes “Escalado” for recorded awareness only. |
| **WHO SEES IT?** | N/A in product UI today |
| **ENABLE/DISABLE** | N/A — awareness-only design: `limits.reassignsOwner/changesApprover = false`; no command |
| **COMMAND** | None |
| **LOCAL?** | Lib unit tests only |
| **DIRTY RC3?** | NO |
| **Note** | Do not claim hosted Escalación action for BV. |

---

### 10. Aceptación (cliente aceptó)

| Field | Value |
|---|---|
| **BUTTON EXISTS?** | **NO standalone “Registrar aceptación”** |
| **WHERE?** | UX copy on convert: **Cliente aceptó · Convertir a Pedido**. Quote status `accepted` appears after order creation (projection), not via a separate AcceptQuote command. |
| **WHO SEES IT?** | Convert CTA only (see §11) |
| **ENABLE/DISABLE** | N/A as separate control |
| **COMMAND** | None dedicated — acceptance is implied by `CreateOrder` |
| **LOCAL?** | Convert suites cover status transition |
| **DIRTY RC3?** | NO |

---

### 11. Convertir a Pedido

| Field | Value |
|---|---|
| **BUTTON EXISTS?** | YES |
| **WHERE?** | Quote `#convertir-pedido` → `ConvertQuoteForm` (**Cliente aceptó · Convertir a Pedido**); sticky “Ir a convertir”; Acciones menu; post-approval continue link label **Convertir a Pedido** when eligible. |
| **WHO SEES IT?** | Only when `authority.canConvertToOrder === true`. |
| **ENABLE/DISABLE** | `canConvertQuoteToOrder`: quote `submitted` + (owner with `commercial.quote.convert.own` **or** `commercial.order.convert`). **Temporary coverage alone never enables.** Hidden when false. Confirm dialog before submit. |
| **COMMAND** | `CreateOrder` via `createOrderAction` |
| **LOCAL?** | YES — `commercial-authority` CreateOrder + RC3 commercial loop / coverage-cannot-convert |
| **DIRTY RC3?** | NO for CTA; quote page dirty for View As/order auth adjacent wiring |

---

### 12. Asignar / Quitar apoyo temporal

| Field | Value |
|---|---|
| **BUTTON EXISTS?** | YES |
| **WHERE?** | Cliente360 Resumen → `TemporaryCoveragePanel` (**Asignar apoyo temporal** / **Quitar apoyo temporal**). |
| **WHO SEES IT?** | Panel when commercial account + canonical owner exist. Manage CTAs when `canManageCoverage` (`commercial.account.reassign` via `canGrantCustomerCoverage`) **and** evaluation desk inactive. Active coverage visible read-only without manage. |
| **ENABLE/DISABLE** | Grant form when no active grant; revoke when grant present + can manage. Typeahead excludes canonical owner. Copy: coverage does **not** change owner and does **not** authorize convert. |
| **COMMAND** | `GrantCustomerCoverage` / `RevokeCustomerCoverage` |
| **LOCAL?** | YES — `RC3_COVERAGE_LOCAL_PROOF.md` (PASS); UI diagnosis `RC3_COVERAGE_UI_DIAGNOSIS.md` (harness, not product) |
| **DIRTY RC3?** | Panel + mount at HEAD (`8a153a4`). **Evidence markdown dirty/untracked.** Cliente360 page dirty for View As, not coverage rewrite. |

---

### 13. Reasignar responsable

| Field | Value |
|---|---|
| **BUTTON EXISTS?** | YES — visible label **Cambiar responsable** (not the word “Reasignar” on the button) |
| **WHERE?** | Cliente360 Acciones menu → drawer `ReassignOwnerForm`; also inline under `CommercialOwnerLine` when `owner.canReassign`. Audit/workforce copy may say “Reasignar responsable de cliente.” |
| **WHO SEES IT?** | `commercialAuthority.canReassignOwner` → `canReassignCommercialAccountOwner` (`commercial.account.reassign`). Same scope family as coverage manage. |
| **ENABLE/DISABLE** | Requires checkbox **Confirmo el cambio de responsable**. Role-preview blocks mutation. |
| **COMMAND** | `ReassignCommercialAccountOwner` via `reassignCommercialAccountOwnerAction` |
| **LOCAL?** | YES — authority + customer-self-service UI tests |
| **DIRTY RC3?** | NO |

---

### 14. Quién tiene la pelota

| Field | Value |
|---|---|
| **BUTTON EXISTS?** | **Display card**, not a mutate button. Optional link to pending approval request when waiting on approval. |
| **WHERE?** | Quote detail (and similar responsibility surfaces) → `WhoHasTheBallCard` title **Quién tiene la pelota**. |
| **WHO SEES IT?** | Quote page viewers (when page loads successfully). |
| **ENABLE/DISABLE** | Always renders supplied lines; does not invent owners/helpers. Quote page currently passes `temporarySupport: null` (coverage line not wired on quote yet). Waiting/next-safe from pending approval + next-step. |
| **COMMAND** | None |
| **LOCAL?** | YES — `who-has-the-ball.test.ts` |
| **DIRTY RC3?** | Card + view at HEAD. Quote `page.tsx` dirty for evaluation/auth adjacent changes; ball wiring already present at HEAD. |

---

## Cross-cutting gates

| Gate | Behavior |
|---|---|
| Role preview / evaluation desk | Mutations blocked (`assertRolePreviewAllowsMutation`). Coverage manage forced off when `evaluation.active`. |
| View As (dirty RC3) | Cliente360 commercial lists / ops negotiation suppress; does not invent convert or coverage authority. |
| Cargo / title | Never grants convert, reassign, coverage, or approve. |
| Coverage vs convert | Explicit: coverage ≠ `CreateOrder` (local PASS). |

---

## Evidence pointers

| Topic | Doc / code |
|---|---|
| Commercial loop local | `../RC3_COMMERCIAL_LOOP_PRECONDITIONS.md` |
| Coverage local + UI | `../RC3_COVERAGE_LOCAL_PROOF.md`, `../RC3_COVERAGE_UI_DIAGNOSIS.md` |
| Approval ≠ Pedido | `../RC3_POSTSALE_CONTRACT_LOCAL.md` |
| Authority predicates | `packages/os-contracts/src/commercial-authority.ts` |
| Party authority flags | `apps/os-api/src/parties.controller.ts` (`canReassignOwner`, `canManageCoverage`) |
| Quote subject authority | `packages/os-query/src/commercial/commercial-query-service.ts` |
| Web actions | `apps/os-web/lib/commercial/actions.ts` |

---

## Explicit non-claims

- Hosted BV PASS for any CTA above: **UNPROVEN** until post-cut deploy.
- Escalación action button: **does not exist**.
- Standalone aceptación command/button: **does not exist**.
- Coverage on quote “Quién tiene la pelota” temporary-support line: **not wired** (`temporarySupport: null`).
- REAL seven mutated: **NO**.

---

## Verdict

Commercial / approval / ownership / coverage **manual action CTAs exist and are authority-gated** for the inventory list, except Escalación (guidance-only, unmounted) and standalone Aceptación (folded into Convert). Local command/predicate proof is largely PASS via existing RC3 docs; **DIRTY_TREE** remains for View As page wiring and uncommitted coverage evidence — not for inventing these buttons.
