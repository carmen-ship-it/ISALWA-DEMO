# CROSS_PAGE_RECORD_GRAPH

## DEMO MADERAS ORIENTE (SYNTH)

| EDGE | SOURCE | ACTION | TARGET | DEMO_CONTEXT_PRESERVED? | VISIBLE_TO_CARMEN (REAL org)? | HOSTED_PROVEN |
|---|---|---|---|---|---|---|
| Cliente list → 360 | party | open | Cliente360 | if demo mode | **NO** (not in list) | PF-8 deep link YES |
| 360 → Quote | Q-000002 | open | quote detail | cookie/query | NO unless deep link | PF-8 YES |
| Quote → PDF | CTA/API | GET pdf | PDF bytes | n/a | if can open quote | PF-8 HTTP YES |
| Quote → Approval | request/decide | approval | approval req | drops datos | Carmen used **different** quote Q-000015 | smoke YES / demo N/A |
| Approval → Pedido | — | **none** | — | n/a | n/a | architecture NO |
| Quote → Convert | Cliente aceptó | create order | O-000002 | drops | NO on Carmen path | seed exists; convert CTA not PF-8 clicked |
| Order → ops/DN/PDF | deep links | | DN/PDF | drops | NO | PF-8 DN HTTP YES |
| → Trabajo/Conversaciones/Docs/Historial/Audit | various | | | drops | NO | PARTIAL |

**MISSING for owner:** org switch / seeded data in Carmen’s org; approval→quote continue CTA; sidebar `datos` preservation.

## Other four DEMO clients (lighter)

| Client | INTENDED_SCENARIO | ACTUAL_RECORDS (SYNTH) | HOSTED_PROVEN | BROKEN_FOR_CARMEN |
|---|---|---|---|---|
| ANDINA | conversation → opportunity | party+densify | cue only | yes (wrong org) |
| PROYECTOS | quote acceptance convo | Q-DEMO-001 submitted | cue | yes |
| HOTEL | delivery certainty | Q-000004 accepted | cue | yes |
| FERRETERÍA | issue path | Q-000005 accepted | cue | yes |
