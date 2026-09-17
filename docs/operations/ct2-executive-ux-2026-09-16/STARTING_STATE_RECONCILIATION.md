# CONTROL TOWER 2 — STARTING STATE RECONCILIATION

**At:** 2026-09-17 (Control Tower 2 continuing; no restart / no re-audit)  
**Authority:** Carmen handoff correction + live Render inspect + git lineage

## Prior receipt Carmen supplied (intermediate, honored)

| Field | Value at that receipt |
|---|---|
| HOSTED LIVE SAME SHA | `095bb7f952e38f2304ab60bfcaff56f29c8797f0` |
| WEB DEPLOY | `dep-dalhglu1egvs73ekihhg` |
| API DEPLOY | `dep-dalhgm65vjqs73fe2j7g` |
| AUTH FIX | `5ca147207508c93f083e6cf141547f54c45e6eb0` |
| PUSHED SOURCE TIP | `f58ac12c14539b7377ae0fc30e2c9b0497e97165` (NOT assumed live merely because pushed) |
| REAL_SEVEN_MUTATED | NO |
| SYNTH ORG | `01M2JKF77TXMJNDTKNCYNHH9G5` |

**Distinction preserved:** `095bb7f` was LIVE/browser-proven then; `f58ac12` was PUSHED only in that receipt.

## Narrow reconciliation NOW (git + Render)

| Check | Result |
|---|---|
| CT2 branch | `ct2/exec-ux-intelligence` |
| CT2 HEAD (docs tip) | `5ef68da46dec30f917c32444e5ff25d960e66756` |
| Newest prior-CT source on lineage | `1244d84ef75142d973c8f7aa44caeadd66361768` |
| Ancestor of 1244d84? | YES: `095bb7f`, `f58ac12`, `f3aaf64`, `5ca1472` |
| Render WEB live | `1244d84` · `dep-dalj6pp42hec73cm80vg` · `srv-dajddb67bikc73bl42q0` |
| Render API live | `1244d84` · `dep-dalj6q3l550s73bfar90` · `srv-dajd64gae00c739gpk20` |
| Newest ops receipt | prior CT FINAL MASTER-SPEC closure @ `1244d84` + `master-close-bv-latest.json` |

## ADOPTED BASE (this pass)

| Field | Value |
|---|---|
| BASE_SOURCE_SHA | `1244d84ef75142d973c8f7aa44caeadd66361768` |
| BASE_WEB_RUNTIME_SHA | `1244d84ef75142d973c8f7aa44caeadd66361768` |
| BASE_API_RUNTIME_SHA | `1244d84ef75142d973c8f7aa44caeadd66361768` |
| BASE_SAME_SHA_PROOF | **YES** (Render live tip web+API equal BASE_SOURCE_SHA) |

Workers branch from BASE_SOURCE_SHA. CT2 integrator branch is docs tip atop that base.

## Carry / do not rebuild

Proven at `095bb7f` and carried in lineage (do not rebuild): Quote→Pedido own convert, Nota create/PDF, Salida, Entrega via `/entregas`, membership/capability auth, no dev bypass, no people.admin shortcut.

Later prior-CT evidence at `1244d84` also closed FG receive + Cliente360 documentos/finanzas + Nota search among others — **carry where code unchanged**; NEW CT2 UX features still require their own IMPLEMENTED→BROWSER_VERIFIED chain.

Do **not** invent PASS for: password mailbox E2E, AI hosted/browser (still this pass’s UX-8 job), future revenue layer, invented role titles/SLAs.

## Preserve architecture

Entregas write through `/entregas` (not broadening warehouse commercial Pedido access). Explicit human actions remain. Vista de evaluación = UI preview only.
