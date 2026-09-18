# RC4 FINAL HOSTED DISCOVERY CLOSURE

**RC4_SHA (frozen):** `9e1cfe3ee1f18e568b7f34254e5794cf49baa8b7`  
**Policy:** No patch · no commit · no deploy · no RC5 implementation  
**Date:** 2026-09-18

**RC4_HOSTED_DISCOVERY_COMPLETE = NO**

This pass closed the catalog classification, re-proved human tokens, and got a product verdict through **Solicitar aprobación**. It did **not** finish Escalar submit, responsibility happy path, the remaining loops, the security matrix, eight role experiences, or the last three mobile surfaces. The staging browser session was logged out to reach the assigned Jefe; password entry into the login form was refused by the safety check. That is an **AUTH_BLOCKED** gate for every remaining mutation that needs a signed-in actor. Do not treat the unfinished rows as product failures.

---

## 1. Catalog

**MANUAL_QUOTE_LINE_WITHOUT_CATALOG = PASS**

Hosted on disposable Q-000009 (`01M2T64PHN72A5FZFGH0GE6GRC`), Demo, Carmen Staging:

- Control: **Ítem especial / fuera de catálogo**
- Fields typed by the user path: Nombre, Cantidad, Precio cotizado
- Saved line label: **Ítem especial / fuera de catálogo** + **Inodoro RC4 close**
- Total **Bs. 1.200,00** after reload
- No `off-catalog:`, UUID, ULID, or internal product key was typed
- Catalog copy on the form: “El catálogo todavía no está conectado. Puede agregar un ítem especial.”

**CATALOG_INTEGRATION_REQUIRED_FOR_V1 = NO**

No approved V1 requirement in this pass cites an authoritative price-list integration. Special-item entry is the evidenced V1 path. **RC5-06 is not an RC5 implementation item.**

Harness notes (not product): quantity landed as 12 because “2” was typed onto the default “1”; notes field shows the literal `undefined` from a failed fill before create.

## 2. Raw human tokens

| TOKEN | ROUTE | VISIBLE_TO_NORMAL_USER | USER_MUST_TYPE | USER_MUST_UNDERSTAND | CAN_COMPLETE_FLOW_WITHOUT_TOUCHING_TOKEN | EXPECTED_HUMAN_COPY | CARMEN_BLOCKER | ISA_ALVARO_BLOCKER | RC5_FIX_REQUIRED |
|---|---|---|---|---|---|---|---|---|---|
| `open` | `/inicio` opportunity rows (Demo) | YES | NO on the list | YES — the row reads `open` next to the client | YES for opening the row | Abierta | YES (readable internal enum) | YES | YES — RC5-05 |
| `open` | Opportunity etapa (prior hosted, editable) | YES | YES if they edit etapa | YES | NO if the field is required and shows `open` | Abierta | YES | YES | YES — RC5-05 |
| `off-catalog:…` | Quote line on Q-000009 | NO — line shows “Ítem especial / fuera de catálogo” | NO | NO | YES | Ítem especial / fuera de catálogo | NO on this quote | NO on this quote | Pedido-line raw token remains RC5-05 from prior hosted Pedido proof |
| `NE-PILOT-{ULID}` | Nota from prior fresh journey | YES as the document code | NO | YES if they must read it as a business reference | YES to download | Nota / business reference | YES | YES | YES — RC5-05 |

## 3. Escalar a Gerencia

Carmen-owned Q-000009:

- Line persisted after reload
- **Enviar cotización** → status **Cotización presentada** (not the Q-000006 “No tiene permiso” case)
- **Solicitar aprobación** → **Pendiente de aprobación de Synth Jefe**, requested by Carmen Staging
- No Pedido created
- Approval detail: “Solo el aprobador asignado puede decidir. Usted puede revisar el contexto.”
- **Escalar a Gerencia is not on the requester page.** It is on the assigned approver’s decision form.

**ESCALAR_GERENCIA_HOSTED = UNPROVEN** (not PRODUCT_FAIL)

The request half is hosted PASS. The escalate submit was not reached. Switching to `w2.jefe@isalwa.demo` required a password in the login form; that entry was blocked. Do not add an Escalar root until a Jefe session can submit.

Approval detail URL dropped `?datos=demo` (`/aprobaciones/01M2T6DMFXD3Y21B03EDFFW8ZD`) while the Demo banner was still up. Same family as **RC5-02**.

## 4–12. Not closed this pass

Still **UNPROVEN** because the signed-in session ended:

- Coverage grant / revoke / coverage-only convert / reassignment
- RC5-09 server direct attempt (code gate exists: `assertRolePreviewAllowsMutation`; soft UI staleness already observed)
- Commitment loop
- Conversation register / Ignore fresh session / Review navigate-only (Review and Ignore remain PASS from the prior pass)
- Production update, warehouse fact, Salida, Entrega
- Remaining security rows
- Eight View As Inicio experiences
- Story CTA clicks other than step 1
- Mobile Conversaciones, Story, Mi Trabajo

**RC5-04**

- **REAL_PRODUCT_DEEP_LINK_FAILURE = NO** for the normal Conversaciones list. UI fixtures use `demo-conv-${clientKey}` (`demo-fixtures.ts`).
- **DEMO_FIXTURE_ONLY_MISMATCH = YES.** `seeded-ids.json` and owner-demo seed use `owner-demo-conversation:*`.
- **HARNESS_ONLY = YES** for the deep link that used the seed id.
- Do not ship an RC5 product fix for this id mismatch.

**RC5-09 fix shape (evidence so far, not a new implementation):** **CLIENT_HIDE_PLUS_REFRESH** plus the existing **SERVER_GATE**. Soft activate leaves mutation buttons enabled until a hard refresh. Server assert is in `mutation-gate.ts`. Direct submit under View As was **not** re-executed this pass.

**STORY_CTA_NAVIGATION_HOSTED = PRODUCT_FAIL** for step 1 only (prior reproduction: CTA href correct, click left `/inicio?datos=demo`). **RC5-07.** Other steps not re-clicked. Siguiente/Anterior remain overlay-only by design, not a defect.

## 13. Partials

**UPR_15_DESCRIPTION** = Exact color / token conformance with documented deviations (navy kiln `#18324b` vs requested `#12324A`; soft teal via mix). Source: `PP8_PROMISE_ARCHAEOLOGY.md`, `FINAL_V1_PRODUCT_PROMISE_LEDGER` via RC3 receipt.

**UPR_36_DESCRIPTION** = Reusable shell próximo-paso strip / next-step density on ops desks without inventing business actions.

| ID | STILL_PARTIAL | CARMEN_BLOCKER | ISA_ALVARO_BLOCKER | POLISH_ONLY | RC5_CODE_REQUIRED |
|---|---|---|---|---|---|
| P-C360-02 | YES — header identity/status/owner/helper/next action | NO | NO | YES | NO |
| P-C360-08 | YES — one panel at a time | NO | NO | YES | NO |
| P-COM-10 | YES — aceptación folded into Convertir | NO | NO | YES | NO |
| P-COM-12 | YES — quién tiene la pelota mainly on Quote | NO | NO | YES | NO |
| P-VIS-02 | YES — who-has-the-ball beyond quote | NO | NO | YES | NO |
| P-VIS-03 | YES — shared progress steppers | NO | NO | YES | NO |
| UPR-15 | YES — color deltas not remeasured | NO | NO | YES | NO |
| UPR-36 | YES — próximo paso density | NO | NO | YES | NO |

## 14. Root reclassification

| Root | Disposition |
|---|---|
| RC5-01 Issue API/web serialization | **KEEP P0** |
| RC5-02 Demo context lost on redirects | **KEEP P0** (reproduced on Q-000009 create and on the approval detail URL) |
| RC5-03 list next-step not linked-quote-aware | **KEEP P1** (Inicio still shows `open` + “Próximo: Crear cotización” for RC4-DISC-obra-andina) |
| RC5-04 Conversation ID mismatch | **REMOVE from RC5 product scope.** Fixture/harness only. |
| RC5-05 raw human tokens | **KEEP P1** |
| RC5-06 catalog disconnected | **FUTURE_BY_DESIGN / NOT_EVIDENCED.** Not RC5. |
| RC5-07 Story CTA navigation | **KEEP P1** |
| RC5-08 stale quote line UI | **KEEP P1** (line add and Enviar both showed stale RSC until reload) |
| RC5-09 soft View As does not refresh RSC | **KEEP P0.** Fix = CLIENT_HIDE_PLUS_REFRESH + existing server gate. |

No new roots from this pass.

## 15. Gate

See the Carmen handoff in the chat. **READY_TO_IMPLEMENT_RC5 = NO.**

## 16. 2026-09-18 closeout addendum

Carmen session recovered with the existing local login script. No secret printed. No credential reset.

New hosted evidence:

- Story CTA steps 1, 5, 10, 17 navigated to the exact href and closed the overlay. Step 20 href `/inicio?lente=gerencia&datos=demo` landed on `/inicio?datos=demo`. Direct open of that lens URL keeps `lente=gerencia`. **RC5-07 stays**, narrowed to CTA query loss on the Gerencia step, not a general Siguiente bug and not a failed step-1 click.
- Pedido O-000005 line reference shows `off-catalog:fuera-de-catalogo`. Nota code on that page is `NE-PILOT-01M2RJRGHD8MRNNCGZ6ZMQRFT0`. Inicio still shows `open`.
- SYNTH client under `datos=real`: “No se encontró este cliente”. Demo name not shown.
- Soft View As (Producción) left **Asignar apoyo temporal** visible and enabled. After reload the button was gone. The attempt did not leave **Apoyo activo**. No denial sentence was captured. **NEW_SECURITY_P0 = NO.**
- Jefe escalate submit not run. Reading the governed Jefe secret was refused this pass.

**RC4_HOSTED_DISCOVERY_COMPLETE = NO.** **READY_TO_IMPLEMENT_RC5 = NO.**

## 17. 2026-09-18 nota decision and continuation

**BUSINESS_DECISION_REQUIRED_NOTA_REFERENCE = CLOSED.** Display composition only, future RC5-05. No new Nota series. No patch.

Hosted on disposable SYNTH, Carmen Staging, `?datos=demo`:

- Coverage grant to Synth Asesor persisted. Canonical owner stayed Synth FixtureSeed. Revoke removed **Apoyo activo** after reload. Owner still Synth FixtureSeed.
- Historial shows Carmen Staging activity at the grant and revoke times. The lines read **Actividad registrada** because those event types are not in the Spanish label map. Not a new root.
- Commitment “RC4 closeout confirmar despacho Andina” is on the desk and **Cumplido** by Carmen Staging.
- Real client COMERCIAL ALVAREZ opened with `datos=demo` shows “No se encontró este cliente”. The name is not shown. SYNTH under `datos=real` remains the same phrase.
- Eight View As Inicio homes (Asesor · Synth Asesor, Jefe comercial, Gerencia, Producción, Almacén, Compras, Finanzas, Entregas) load with **Solo lectura** and `datos=demo`.
- Mobile Story **Siguiente** reaches Paso 2. Mobile Mi trabajo opens a work item. Conversaciones at 390px still overflows; the row click did not complete.
- Cliente360 tab links omit `datos=demo` (`clienteSectionHref`). Same family as RC5-02, not a new root.
- Soft View As still leaves **Asignar apoyo temporal** enabled. The attempt did not leave **Apoyo activo**. The server sentence was not on the page.
- No credential was created or reset.

## 18. 2026-09-18 forensic closure

Search for Andina, O-000005, and a nonsense term each returned HTTP 200 and left “Buscando…” in about 5–6 seconds. The earlier stuck reading was a 1.2s snapshot. Reassignment changed Andina’s canonical owner from Synth FixtureSeed to Synth Almacen; Historial shows “Responsable comercial cambiado.” Manual register never submitted. At 390px every Conversaciones row button measured 0×0, so the row did not open. View As coverage attempt did not leave Apoyo activo. RC5-08 stays: quote actions call `revalidatePath` and `router.refresh()`, and the hosted page still stayed stale until a full reload.

## 19. 2026-09-18 six assertions

Desktop hosted UI, Carmen Staging, `?datos=demo`. No patch.

- Manual conversation: customer DEMO CONSTRUCTORA ANDINA, summary “RC4 registro manual Andina”, submit enabled, POST 200, “Quedó el registro de la empresa.” Row still present after refresh and after leaving to Inicio and returning. Cliente360 Historial did not show “Conversación registrada”. The conversation desk is the surface that lists the row. Not a new root.
- View As Producción, soft, no reload: helper Synth Asesor, **Asignar apoyo temporal** posted to the Andina customer URL, HTTP 200, response text “solo lectura. Vuelva a su vista para realizar cambio”. After reload, still no **Apoyo activo**. Server denied. RC5-09 stays UI hide/refresh only. Not a security bypass.
- Production: line “Inodoro obra nueva RC4-DISC · 20” on O-000005, annotation “RC4 secado Andina”, expected date set. Trabajo shows “Producción · próxima acción: O-000005 · Inodoro obra nueva RC4-DISC · DEMO CONSTRUCTORA ANDINA”.
- Warehouse: same line, quantity 1, POST 200 to `/almacen`, “Ingreso físico registrado.” A fresh Pedido load still lists ingreso under not registered. Cliente360 Historial has no ingreso line. **RC5-11.**
- Salida already on the Pedido as “Salida de almacén registrada.” Not clicked again.
- Entrega: Recibido por “RC4 recibido Andina”, button enabled, one click. After reload the Pedido says “Entrega al cliente registrada” and the same name is still on the page. Cliente360 Historial did not show that line. No new root.

**RC4_HOSTED_DISCOVERY_COMPLETE = YES.** **READY_TO_IMPLEMENT_RC5 = YES.** Implementation is not authorized. Carmen acceptance and the Isa/Álvaro invite stay NO.
