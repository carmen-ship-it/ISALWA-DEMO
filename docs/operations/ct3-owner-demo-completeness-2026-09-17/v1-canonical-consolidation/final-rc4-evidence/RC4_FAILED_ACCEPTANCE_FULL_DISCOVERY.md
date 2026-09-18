# RC4 FAILED ACCEPTANCE — FULL DEFECT DISCOVERY (pre-RC5)

**RC4_SHA (frozen):** `9e1cfe3ee1f18e568b7f34254e5794cf49baa8b7`  
**Hosted:** os-web / os-api staging · SYNTH org `01M2JKF77TXMJNDTKNCYNHH9G5` · actor `carmen.staging@isalwa.demo`  
**Policy:** No RC4 patch · no app commit · no deploy · no Carmen acceptance · no Isa/Álvaro invite  
**Date:** 2026-09-17

---

## 1. ISSUE DETAIL — FORENSICS ONLY

See also `ISSUE_DETAIL_FORENSICS.md`.

| Field | Value |
|-------|--------|
| ISSUE_ID | `01M2PRV5H1JTARSF3APN57PP0Y` (also `01M2PRV4…`) |
| ISSUE_STATUS | open / in_progress (list) |
| ORG | SYNTH |
| ACTOR | Carmen Staging |
| VIEW_AS_STATE | OFF |
| DATA_MODE | Demo |
| PAGE_ROUTE | `/incidencias/{id}?datos=demo` |
| API_ROUTE | `GET /v1/issues/:issueId` |
| AUTH_DECISION | Not the failure (list visible; manage capability present) |
| STACK | Non-`OsApiError` → `Ocurrió un error al cargar la información.` |
| EXPECTED | Issue detail + resolve affordance |

**ISSUE_DETAIL_ROOT_CAUSE** = `API_GET_ISSUE_RETURNS_FLAT_SUMMARY_WHILE_WEB_EXPECTS_WRAPPED_ISSUE_DETAIL`  
**CLASSIFICATION** = `SERIALIZATION`  
**ISSUE_DETAIL_FIX_SCOPE** = Align GET `/v1/issues/:id` (or web adapter) to `{ issue: IssueDetail }` including journal/relations/version; keep auth NOT_FOUND semantics.

Under `?datos=real`, same SYNTH issue → **Incidencia no encontrada** (isolation OK; not a Demo leak).

---

## 2. RC3 MISSING ACTIONS 7/7

| Action | Hosted |
|--------|--------|
| Solicitar revisión Producción | PASS (prior + affordance on O-000005) |
| Solicitar revisión Almacén | PASS |
| Solicitar revisión Compras | PASS |
| Resolver incidencia | **PRODUCT_FAIL** (blocked by ISSUE_DETAIL_LOAD_ERROR) |
| Review conversation suggestion | **PASS** — VISIBLE/CLICKABLE; navigates to `/incidencias/reportar?…` (Ferretería); does not auto-create; suggestion remains until Ignore |
| Ignore conversation suggestion | **PASS** — Andina `demo-conv-constructora_andina`; buttons removed; **persists after hard refresh** |
| Escalar a Gerencia | **UNPROVEN / BLOCKED** — Aprobaciones desk empty (`Sin decisiones pendientes` / Aprobaciones 0); escalate UI lives on pending approval; Solicitar aprobación not completed in this pass |

**REVIEW_HOSTED** = PASS (navigate-only by design)  
**IGNORE_HOSTED** = PASS (durable + refresh)  
**ESCALATE_GERENCIA_HOSTED** = UNPROVEN (no pending approval established)

**RC3_MISSING_ACTIONS_7_HOSTED** = **5/7** (3 reviews + Review + Ignore); Resolver FAIL; Escalar UNPROVEN.

**Related conversation defect:** list deep-link `owner-demo-conversation:andina_whatsapp` does **not** select thread; working id is `demo-conv-constructora_andina`. Duplicate list rows (Otro vs WhatsApp) amplify confusion.

---

## 3. HUMAN MANUAL UI JOURNEY (disposable SYNTH)

Fresh records:

| Record | ID |
|--------|-----|
| Opportunity | `01M2RJBFW6ECM8XH5VY9ABMFJE` · RC4-DISC-obra-andina |
| Quote | `01M2RJF58S2VBYPDJJH47N9909` · **Q-000008** |
| Pedido | `01M2RJN40116FPFWCFC7JSY3N3` · **O-000005** |
| Nota | `01M2RJRGHD8MRNNCGZ6ZMQRFT0` · **NE-PILOT-…** |

| Step | Result |
|------|--------|
| Cliente → Nueva oportunidad → save | PASS (create) |
| Open created Opportunity | **PRODUCT_FAIL** without `?datos=demo` (“No se encontró…”); PASS with `?datos=demo` |
| Crear cotización → notes → save | PASS (create); same redirect defect |
| Add line (ítem especial) qty/desc/price | PASS (persist after reload; brief stale empty + “desactualizada” after add) |
| Enviar cotización | PASS |
| Quote PDF download | PASS (see §5) |
| Registrar como enviada | UNPROVEN (CTA present; not completed) |
| Solicitar aprobación / Escalar | UNPROVEN |
| Cliente aceptó · Convertir a Pedido | PASS (create); redirect drops `datos=demo` → false not-found |
| Solicitar revisión Prod/Almacén/Compras | PASS (buttons present on O-000005) |
| Crear Nota de Entrega | PASS |
| Nota PDF | PASS (see §6) |
| Salida / Entrega | UNPROVEN (Salida enabled after Nota; Entrega disabled until Salida) |

**MANUAL_DATA_ENTRY_HOSTED** = PASS (with Demo mode + special line; catalog disconnected)  
**FRESH_UI_CREATED_JOURNEY** = PARTIAL → treat as **PRODUCT_FAIL** on first hard UX: post-mutation redirect drops Demo mode  
**FRESH_JOURNEY_FIRST_FAILURE** = `POST_CREATE_REDIRECT_DROPS_DATOS_DEMO` (Opportunity open after create)

---

## 4. HUMAN FORM USABILITY

**HUMAN_FORM_USABILITY_BLOCKERS** =

1. Opportunity **Etapa** field shows raw `open` (not Spanish human stage).  
2. Quote line shows raw `off-catalog:fuera-de-catalogo`.  
3. Nota code shown as `NE-PILOT-{ULID}` in UI + PDF (“provisional”).  
4. Product catalog: “El catálogo todavía no está conectado” — forces special-item path.  
5. Create-quote form is notes-only (lines after create) — OK if guided, but easy to miss.  
6. Post-add-line UI briefly shows “Línea agregada” + “no tiene líneas” + stale banner.

---

## 5–6. PDF HUMAN DOWNLOAD

**QUOTE_PDF_HUMAN_DOWNLOAD** = PASS (`GET /api/quotes/01M2RJF58S2VBYPDJJH47N9909/pdf`, session)  
**QUOTE_PDF_BYTES_VALID** = PASS (`%PDF-1.7`, 1956 bytes)  
**QUOTE_PDF_CONTENT_CORRECT** = PASS (Q-000008, DEMO CONSTRUCTORA ANDINA, Inodoro…, qty 20, Bs. 420 / 8.400)  
Evidence: `q000008-fresh.pdf`

**NOTA_PDF_HUMAN_DOWNLOAD** = PASS  
**NOTA_PDF_BYTES_VALID** = PASS (`%PDF-1.7`, 1808 bytes)  
**NOTA_PDF_CONTENT_CORRECT** = PASS (ANDINA, O-000005, Marco…, Inodoro, 20, NE-PILOT…)  
Evidence: `ne-fresh.pdf`

---

## 7. SIX LOOPS

**COMMERCIAL_FAILURES** =

- POST_CREATE_REDIRECT_DROPS_DATOS_DEMO (opp/quote/pedido)  
- Opportunity next-step still “Crear cotización” after Q-000008 accepted + O-000005 exists (C360 + Inicio)  
- Catalog disconnected (special-item only)

**RESPONSIBILITY_FAILURES** = UNPROVEN (grant/revoke/reassign not completed this pass)  
**POSTSALE_FAILURES** = UNPROVEN beyond Nota create (Salida/Entrega not finished)  
**ISSUE_FAILURES** = ISSUE_DETAIL_LOAD_ERROR; Resolver blocked  
**COMMITMENT_FAILURES** = UNPROVEN  
**CONVERSATION_FAILURES** =

- Deep-link / list id mismatch (`owner-demo-conversation:*` vs `demo-conv-*`)  
- Escalar path not reached

**LOOPS_WITH_PRODUCT_DEAD_ENDS_HOSTED** =

- ISSUE (detail load)  
- COMMERCIAL (Demo redirect not-found after create — dead end for normal human without URL surgery)

---

## 8. RESPONSIBILITY

**COVERAGE_GRANT_HOSTED** = UNPROVEN (full grant→verify→revoke not completed; form present under Carmen evaluation)  
**COVERAGE_REVOKE_HOSTED** = UNPROVEN  
**COVERAGE_CANNOT_CONVERT_HOSTED** = UNPROVEN  
**REASSIGNMENT_HOSTED** = UNPROVEN  

**VIEW_AS_RESPONSIBILITY_MUTATIONS_DENIED** = **PRODUCT_FAIL / SECURITY**

Evidence (Demo C360 Andina, View As **Asesor · Carmen Staging**):

- Banner: `Vista de evaluación · Asesor · … · Solo lectura · Las acciones están deshabilitadas`
- Still present and **enabled**: `Asignar apoyo temporal` (`disabled:false`, `pointerEvents:auto`), helper combobox, note textarea
- `TemporaryCoveragePanel` has **no View As / read-only gate** — only `canManageCoverage` (still true for Carmen’s real capabilities)
- Expected: Asignar / Quitar apoyo / Reasignar **unavailable** under View As

---

## 9. SECURITY (partial)

| Check | Result |
|-------|--------|
| Demo → REAL SYNTH issue URL | PASS isolation (“no encontrada”); no Demo banner |
| REAL → Demo | UNPROVEN this pass |
| Cross-company URL/API/search | UNPROVEN |
| Other-advisor / unauthorized resource matrix | UNPROVEN |
| View As: coverage controls still enabled | **PRODUCT_FAIL** (false affordance; see §8) |
| View As mutation deny (other desks) | UNPROVEN |

**KNOWN_SECURITY_FAILURES (rows):**

1. VIEW_AS_COVERAGE_CONTROLS_STILL_ENABLED — Asesor preview leaves grant UI interactive despite Solo lectura banner.

---

## 10. FRESH SESSION

**FRESH_SESSION_NON_ISSUE** = PASS for Demo navigate / refresh / Story / commercial journey (Issue detail remains the known Demo failure)  
**DEMO_CONTEXT_PERSISTENCE_HOSTED** = PARTIAL — cookie/banner often holds, but **mutation redirects strip `?datos=demo`** → false not-found  
**VIEW_AS_STATE_BEHAVIOR_HOSTED** = UNPROVEN  
**DATA_MODE_PRECEDENCE_HOSTED** = PARTIAL (`?datos=real` overrides; Demo query loss on redirect is the defect)

If the only fresh-session failure were Issue detail: **NO** — redirect Demo-loss is independent and broader.

---

## 11. STORY MODE

**STORY_MODE_STEPS_TOTAL** = 20  
**STORY_MODE_STEPS_PASS** = 20 (Siguiente advances Paso 1→20 overlay titles)  
**STORY_MODE_PRODUCT_FAILURES** = 0 proven content failures in overlay  
**STORY_MODE_HARNESS_FAILURES** = 0  
**STORY_NORMAL_ROUTE_MISMATCHES** = **20/20** — URL stayed `/inicio?datos=demo&story=1` for every Siguiente; page content did not navigate to step targets (CTA links exist, e.g. step 20 `Ver gerencia` → `/inicio?lente=gerencia&datos=demo`)

---

## 12. CROSS-PAGE USER-CREATED DATA

**USER_CREATED_DATA_CROSS_PAGE_SYNC** = PARTIAL  

**CROSS_PAGE_MISMATCHES** =

1. Opp `RC4-DISC-obra-andina` still “Próximo: Crear cotización” on Inicio + C360 after Q-000008 + O-000005.  
2. Fresh create redirects without Demo query → detail “not found” until query restored.  
3. PASS: Opp/Quote/Pedido appear on C360 comercial with `datos=demo`; Q-000008 + O-000005 linked.

---

## 13. SEED DEPENDENCY GAPS

**SEED_DEPENDENCY_PRODUCT_GAPS** =

1. Product **catalog** not connected — special item required for quote lines.  
2. Conversation fixtures / dual id schemes — not user-created; deep links fragile.  
3. Approval/escalate desk empty without prior Solicitar aprobación (user *can* solicit if approver picker populated — not proven).  
4. Production/Warehouse/Purchasing review work items still largely seed-driven for rich desks (Solicitar revisión exists on fresh pedido).

---

## 14. ERROR / EMPTY / LOADING

**ERROR_STATE_FAILURES** =

- Issue detail generic load error (SERIALIZATION)  
- False “No se encontró” after create when `datos=demo` dropped  

**EMPTY_STATE_FAILURES** =

- Brief quote “no tiene líneas” after successful add (stale)  

**LOADING_STATE_FAILURES** =

- “Esta información puede estar desactualizada” after line add without showing lines until hard reload  

---

## 15–16. ROLE / MOBILE

**ROLE_EXPERIENCE_FAILURES** =

- View As Asesor: coverage mutations still available (false affordance)  
- Full per-desk Inicio tour otherwise UNPROVEN  

**MOBILE (~390px)**

| Surface | Class |
|---------|--------|
| Pedido O-000005 | NONE functional observed — `Abrir menú`, review CTAs, Nota/PDF links reachable |
| Inicio Demo | NONE functional observed — hamburger + attention cards present |
| Cliente360 / Quote / Conversaciones / Story / Mi Trabajo | MOBILE_UNPROVEN |

**MOBILE_FUNCTIONAL_FAILURES** = [] (none found on sampled pages)  
**MOBILE_POLISH** = UNPROVEN (visual polish not scored)  
**MOBILE_UNPROVEN** = Cliente360, Quote, Conversaciones, Story Mode, Mi Trabajo at 390px
---

## 17. PARTIAL PROMISES

| ID | HOSTED_FINDING | STILL_PARTIAL? | BECAME_PRODUCT_FAIL? | BLOCKS_CARMEN? | BLOCKS_ISA_ALVARO? | POLISH_ONLY? |
|----|----------------|----------------|----------------------|----------------|--------------------|--------------|
| P-C360-02 | Not re-proven | YES | NO | TBD | TBD | TBD |
| P-C360-08 | Not re-proven | YES | NO | TBD | TBD | TBD |
| P-COM-10 | Catalog gap + special item | YES | related | maybe | yes | no |
| P-COM-12 | PDF fresh PASS | reduce | NO | no | no | maybe |
| P-VIS-02 | Story overlay only | YES | route mismatch | maybe | yes | no |
| P-VIS-03 | Not re-proven | YES | NO | TBD | TBD | TBD |
| UPR-15 | Not re-proven | YES | NO | TBD | TBD | TBD |
| UPR-36 | Not re-proven | YES | NO | TBD | TBD | TBD |

Do not promote silently.

---

## 18–19. ROOT CAUSES → RC5 CLASSIFICATION

**ROOT_CAUSES_TOTAL** =

1. **RC5-01** Issue GET response shape ≠ web `IssueDetailResponse` → ISSUE detail + Resolver + error quality  
2. **RC5-02** Post-mutation / create redirects omit Demo data-mode query → false not-found on Opp/Quote/Pedido (and likely other creates)  
3. **RC5-03** Opportunity next-step / C360 commercial copy not updated after quote/pedido (still “Crear cotización”; “Sin cotizaciones enviadas”)  
4. **RC5-04** Conversation selection id mismatch (`owner-demo-conversation:*` vs `demo-conv-*`)  
5. **RC5-05** Human-facing raw internal tokens (`open`, `off-catalog:…`, `NE-PILOT-ULID`)  
6. **RC5-06** Catalog not connected for normal quote line path  
7. **RC5-07** Story Mode Siguiente does not navigate host route to step targets (overlay-only)  
8. **RC5-08** Stale client refresh after quote line add  
9. **RC5-09** View As read-only does not disable coverage (and likely other) mutation UIs — capability still from real Carmen session  

**P0_RC5** =

- RC5-01 ISSUE_DETAIL_SERIALIZATION  
- RC5-02 POST_CREATE_REDIRECT_DROPS_DATOS_DEMO  
- RC5-09 VIEW_AS_MUTATION_CONTROLS_NOT_DISABLED  

**P1_RC5** =

- RC5-03 stale commercial next-step / status copy  
- RC5-04 conversation deep-link / list id  
- RC5-06 catalog gap (Isa path)  
- Complete Escalar hosted proof + Resolver after RC5-01  
- Approver typeahead on pedido: typed “Ger” — no options expanded (may block Escalar path / SEED or config gap)

**POLISH** =

- RC5-05 raw ids / provisional NE label  
- RC5-07 story route mismatch (if CTAs suffice — Carmen decide)  
- RC5-08 stale line list  

**HARNESS_ONLY** =

- Smart-mode blocks full Playwright; browser MCP used  

**UNPROVEN** =

- Escalar Gerencia end-to-end (approver search inconclusive)  
- Coverage grant/revoke/reassign happy-path mutations  
- Full security tenant/resource matrix beyond View As coverage + Demo/REAL issue isolation  
- Mobile remaining surfaces  
- Per-role Inicio experience beyond Asesor View As sample  
- Salida/Entrega on fresh O-000005  
- Fresh-session full matrix  

---

## 20. STOP / SCORECARD

**RC4_HOSTED_DISCOVERY_COMPLETE** = **NO** (full security matrix / coverage happy-path / escalate / remaining mobile incomplete)

**KNOWN_PRODUCT_FAILURES_TOTAL** = **8+** (issue serialization; datos redirect; opp next-step; conv id; catalog; stale line UX; View As coverage still enabled; C360 status copy drift)  
**KNOWN_SECURITY_FAILURES_TOTAL** = **1** confirmed row (View As coverage still enabled); rest UNPROVEN  
**KNOWN_HARNESS_FAILURES_TOTAL** = **1** class (smart-mode / harness blocked earlier)  
**KNOWN_UNPROVEN_TOTAL** = **many** (see §8–9, 15–16)
**MANUAL_ACTIONS_V1_HOSTED_REACHABLE** = Review, Ignore, Solicitar revisión×3, commercial create/send/convert, Nota+PDF, Quote PDF  
**MANUAL_ACTIONS_V1_HOSTED_MISSING** = Resolver incidencia, Escalar a Gerencia (proven)

**RC3_MISSING_ACTIONS_7_HOSTED** = **5/7**

**MANUAL_DATA_ENTRY_HOSTED** = PASS (with caveats)  
**FRESH_UI_CREATED_JOURNEY** = PRODUCT_FAIL first (redirect Demo loss); recoverable with `?datos=demo` through Nota  

**QUOTE_PDF_HUMAN_DOWNLOAD** = PASS  
**NOTA_PDF_HUMAN_DOWNLOAD** = PASS  

**USER_CREATED_DATA_CROSS_PAGE_SYNC** = PARTIAL  
**SEED_DEPENDENCY_PRODUCT_GAPS** = see §13  
**HUMAN_FORM_USABILITY_BLOCKERS** = see §4  

**ROOT_CAUSES_TOTAL** = 9  

**READY_TO_IMPLEMENT_RC5** = **NO** — discovery incomplete on escalate/security remainder; **do not implement** until Carmen scopes RC5 from P0 list (RC5-01 + RC5-02 + RC5-09 minimum)
**SAFE_TO_BEGIN_CARMEN_PRODUCT_ACCEPTANCE** = **NO**  
**SAFE_TO_INVITE_ISA_ALVARO** = **NO**  
**USER_ACCEPTED** = **NO**

---

## CARMEN HANDOFF — WHAT I NEED TO KNOW

1. **RC4 remains failed** on ISSUE_DETAIL; do not accept or invite.  
2. **Second systemic P0:** create/convert redirects drop `?datos=demo` → false “not found”.  
3. **Third P0 (security UX):** View As Solo lectura still leaves **Asignar apoyo temporal** enabled (`TemporaryCoveragePanel` ignores View As).  
4. Fresh disposable journey reaches Quote PDF + Pedido + Nota PDF once Demo query is forced.  
5. Review/Ignore hosted PASS; Resolver FAIL; Escalar UNPROVEN (approver typeahead inconclusive).  
6. Story Mode: 20/20 overlay PASS; 20/20 host-route mismatches.  
7. Discovery **not complete** — escalate, coverage happy-path, tenant matrix, remaining mobile still open.  
8. Prefer **one RC5** shipping at least **RC5-01 + RC5-02 + RC5-09**.  

Full receipt: `final-rc4-evidence/RC4_FAILED_ACCEPTANCE_FULL_DISCOVERY.md`  
Forensics: `final-rc4-evidence/ISSUE_DETAIL_FORENSICS.md`

**Do not implement until Carmen scopes RC5 from this list.**
