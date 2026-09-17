# STORY_MODE_20_STEP_RECONCILIATION

**Source:** `apps/os-web/lib/demo/story-mode-steps.ts` + `seeded-ids.json`  
**EXPECTED_ACTOR:** people-admin / role-preview (`canUseOwnerDemo`)  
**EXPECTED_DATA_SCOPE:** Demo (forced on open) · records are SYNTH IDs

| STEP | TITLE | ROUTE (hrefFor) | QUERY_PARAMS | TARGET_EXISTS (SYNTH) | DEMO PARAM ON HREF | NORMAL LIST CAN REACH |
|---|---|---|---|---|---|---|
| 1 | Llega una conversación | `/clientes/{maderas}` | none | YES | **NO** | YES if SYNTH+demo list |
| 2 | ISALWA identifica contexto | Cliente360 | none | YES | NO | YES |
| 3 | Oportunidad sugerida | `?tab=comercial` | tab | YES | NO | YES |
| 4 | Oportunidad creada | opp deep link | none | if seeded opp | NO | PARTIAL |
| 5 | Cotización creada | quote deep link | none | Q-000002 YES | NO | YES on SYNTH |
| 6 | PDF generado | `/api/quotes/{id}/pdf` | n/a | YES | N/A | YES |
| 7 | Envío registrado | quote | none | YES | NO | YES |
| 8 | Seguimiento programado | `/trabajo/{id}` or cliente | none | PARTIAL | NO | assignee-dependent |
| 9 | Cliente acepta | quote | none | accepted YES | NO | YES |
| 10 | Pedido creado | order deep link | none | O-000002 YES | NO | YES on SYNTH |
| 11–16 | Ops / DN / salida / entrega | order or DN PDF API | none | seeded | NO | PARTIAL |
| 17 | Documentos | `?tab=documentos` | tab | YES | NO | YES |
| 18 | Historial | `?tab=historial` | tab | YES | NO | YES |
| 19 | Auditoría | `/inicio` | **none / no datos** | n/a | **NO** | n/a |
| 20 | Gerencia | `/inicio?lente=gerencia` | lente only | n/a | **NO** | n/a |

## Critical answer

**IS STORY MODE DEEP-LINKING DIRECTLY TO RECORD IDS WHILE NORMAL LIST/NAVIGATION FAILS?**

**YES — for Carmen on REAL Staging org:** Story Mode CTAs embed SYNTH party/quote/order IDs from build-time `seeded-ids.json`, while `/clientes?datos=demo` lists DEMO names only inside the **session org**. On REAL Staging that list is empty; deep links target another org’s IDs (cross-tenant fail or confusing empty).

**PARTIAL — for SYNTH people-admin:** Deep links and demo list can both work; Story hrefs still omit `datos=demo` (cookie-dependent).

**STORY_MODE_NORMAL_NAV_PARITY = FAIL** for owner Carmen path; **PARTIAL** for SYNTH PF-8 actor.
