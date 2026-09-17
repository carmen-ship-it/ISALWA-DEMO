# CT3_HOSTED_BV

**Host:** https://os-web-staging.onrender.com  
**API:** https://os-api-staging.onrender.com  
**FINAL_CT3_SOURCE_SHA:** `bd8b070806a0f09e6be5d98cc644d92122e58662`  
**WEB_DEPLOY_ID:** `dep-dallhlbl550s73bmmh2g` · **API_DEPLOY_ID:** `dep-dallhlm1egvs73f1938g`  
**SAME_SHA_PROOF:** PASS  
**At:** 2026-09-17T03:21Z

## Actors

| Actor | Used for |
|---|---|
| `w2.asesor@isalwa.demo` | Cliente360 tabs, Quote PDF, Pedido, Conversaciones, map, management, mobile |
| `w2.coordinacion@isalwa.demo` | Delivery Note PDF (delivery.record) |
| `w2.people-admin@isalwa.demo` | Story Mode (canUseOwnerDemo / role-preview) |
| Synth (browser session) | Early list/demo presence; insufficient for Quote/Pedido detail |

## Results matrix

| Check | Result | Evidence |
|---|---|---|
| 5 DEMO clients listed | PASS | `/clientes` shows all five DEMO names |
| Cliente360 `?tab=` ×6 | PASS | resumen/comercial/operacion/trabajo/documentos/historial; refresh keeps `tab=` |
| Compromisos route | PASS | `/compromisos` page (not `/inicio`) |
| Quote page + PDF CTA | PASS | Q-000002; PDF CTA; HTTP 200 |
| DN PDF | PASS | `/api/delivery-notes/01M2PMCSNXH644P1C4F832BGKQ/pdf` → 200 application/pdf (coordinacion) |
| Pedido known-state | PASS | O-000002; Registrado / next-step copy |
| Conversaciones list + patterns | PASS | 5 DEMO threads; filters; Registrar conversación |
| Contexto ISALWA | PASS | Context sections on select (Andina / Hotel) |
| Story Mode | PASS | people-admin; Paso 1 de 20; Siguiente → Paso 2; Anterior/Salir present |
| Map | PASS | No `Revenue`; Clientes/Oportunidades/Valor |
| Management lens | PASS | `/inicio?lente=gerencia` commercial counts language |
| Ops surfaces | PASS/PARTIAL | produccion/entregas load; compras may deny without compras role (expected) |
| Mobile ~390 | PASS | no horizontal overflow Cliente360 + Conversaciones |
| AI interactive | UNPROVEN | AI_OWNER_REVIEW_READY=NO |

## Evidence files

- `/tmp/ct3-bv/results-asesor.json` (21 pass / 2 fail before residual — fails were DN as asesor + story as asesor)
- `/tmp/ct3-bv/results-residual.json` (7 pass / 0 fail — DN + Story)
- Browser: Cursor IDE browser on staging (Synth session + post-hotfix Cliente360)

## Negative / honesty

- Asesor DN PDF → 403 (expected without delivery.record).
- Asesor Story Mode card may be absent (expected without role-preview).
- Do not collapse UNPROVEN AI into PASS.
