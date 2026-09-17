# DEMO_PAGE_COVERAGE_RECONCILIATION

**Legend:** PROVEN = hosted row-level on correct org; PARTIAL = cue/HTTP or DB-only; EMPTY = owner-observed empty; NOT_TESTED = no row proof.

Actor columns: **PF8** = people-admin SYNTH · **CARMEN** = Staging S.R.L.

| ROUTE | DEMO ROUTE | PF8 | CARMEN | EXPECTED DEMO RECORDS | ACTUAL DB (SYNTH) | HOSTED RENDER (Carmen) | DEMO CONTEXT PRESERVED? | STATUS |
|---|---|---|---|---|---|---|---|---|
| Inicio | ?datos=demo | cue PASS | Story works | demo card | n/a | PARTIAL | drops on nav | PARTIAL |
| Clientes | ?datos=demo | cue PASS (no row assert) | **EMPTY** | 5 DEMO clients | 5 | **0** | query present | **BROKEN** (wrong org) |
| Oportunidades | ?datos=demo | cue | NOT_TESTED | demo opps | densify | ? | drops | NOT_TESTED |
| Cotizaciones | ?datos=demo | cue | NOT_TESTED | demo quotes | 6 | ? | drops | PARTIAL |
| Cotizaciones accepted | ?status=accepted | NOT in PF8 | **EMPTY** + real toggle | DEMO accepted | 3 DEMO + 1 non-DEMO | 0 (real scope) | **FAIL** | **EMPTY** |
| Pedidos | (via cliente) | deep link PASS | NOT_TESTED | O-000002… | 4 | ? | drops | PARTIAL |
| Mapa | ?datos=demo | cue | NOT_TESTED | demo parties | 5 | ? | drops | NOT_TESTED |
| Mi trabajo | /trabajo | cue only | **EMPTY** | open work | 11 open | 0 shown | **FAIL** | **EMPTY** |
| Conversaciones | ?datos=demo | cue | NOT_TESTED | 5 DEMO threads | fixtures | ? | drops | NOT_TESTED |
| Aprobaciones | /aprobaciones | NOT | Q-000015 smoke | demo approvals? | N/A densify | smoke pending | real org | **BROKEN** (wrong journey) |
| Incidencias | ?datos=demo | cue | NOT_TESTED | densify issues | seed | ? | drops | NOT_TESTED |
| Compromisos | ?datos=demo | cue | NOT_TESTED | densify | seed | ? | drops | NOT_TESTED |
| Producción | ?datos=demo | cue | role preview PRODUCCIÓN | demo orders | seed | ? | drops | NOT_TESTED |
| Almacén | ?datos=demo | cue | NOT_TESTED | FG citations | seed | ? | drops | NOT_TESTED |
| Compras | ?datos=demo | cue | NOT_TESTED | supply | seed | ? | drops | NOT_TESTED |
| Entregas | ?datos=demo | cue | NOT_TESTED | DN loop | seed | ? | drops | NOT_TESTED |
| Finanzas | ?datos=demo | cue | NOT_TESTED | filtered subjects | seed | ? | drops | NOT_TESTED |
| Auditoría | /inicio or /auditoria | weak | NOT_TESTED | events | densify residual | ? | drops | NOT_TESTED |
| Gerencia | lente=gerencia&datos=demo | cue | NOT_TESTED | demo metrics | filter | ? | drops | NOT_TESTED |

### Totals (owner-relevant honesty)

| STATUS | COUNT |
|---|---|
| PROVEN (row-level Carmen) | **0 / 18** |
| PARTIAL | ~8 |
| EMPTY / BROKEN (owner observed) | **4+** (Clientes, accepted, trabajo, approvals journey) |
| NOT_ACTUALLY_TESTED (row-level) | **majority** |

A page showing `DEMO · DATOS FICTICIOS` is **not** proof of populated Demo mode.
