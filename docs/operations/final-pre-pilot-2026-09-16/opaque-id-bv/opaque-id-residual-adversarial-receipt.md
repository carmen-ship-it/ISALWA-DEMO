# Opaque-ID residual adversarial BV receipt

**When:** 2026-09-16T19:24:55.254Z  
**Actor:** `carmen.staging@isalwa.demo` (READ-SAFE)  
**Pilot:** https://os-web-staging.onrender.com  
**Harness:** `opaque-id-residual-adversarial-bv.mjs`  
**Evidence JSON:** `opaque-id-residual-adversarial-bv.json`  
**Shots:** `residual-finanzas-1440.png` · `residual-produccion-1440.png` · `residual-mensajes-1440.png`

## Runtime (re-listed this turn)

| Field | Value |
|---|---|
| **FINAL_RUNTIME_SHA** | `e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed` |
| **WEB_API_SAME** | YES |
| WEB `os-web-staging` | live `dep-daleg6m5vjqs73f40ug0` @ `e9a7a02…` |
| API `os-api-staging` | live `dep-daleg6m5vjqs73f40u2g` @ `e9a7a02…` |
| Deploy action this turn | **none** (read-only re-list + hosted open) |

## Checks

| Check | Verdict | Evidence |
|---|---|---|
| LIVE SHA still `e9a7a02` (Render deploy list) | **PASS** | `opaque-id-residual-adversarial-bv.json` → `deployList.web/api` live deps + commit id |
| Selector UI fail-closed shape after welcome dismiss | **PASS** | Hosted open as carmen.staging; selectors/typeahead present; no Identificador free-text |
| Selector auth-negative (true unscoped deny) | **UNPROVEN** | Needs a different unscoped user; not invented this lane |
| `/finanzas` @1440 re-spot | **PASS** | `residual-finanzas-1440.png` · `#finance-subject-type` · party typeahead · honest empty orders · no Identificador/Etiqueta |
| `/produccion` @1440 re-spot | **PASS** | `residual-produccion-1440.png` · catalog search · Enter does not commit raw id · no Identificador de producto |
| `/mensajes` @1440 re-spot | **PASS** | `residual-mensajes-1440.png` · `#conversation-customer` typeahead · copy forbids hand-typed id |

## Surface notes (hosted, actually opened)

- **Finanzas:** welcome dismissed · `TIPO DE SUJETO` select · party SearchableSelect placeholder `Buscar cliente (mín. 2 letras)` · order subject = honest empty (`No hay pedidos abiertos…`) when on pedido.
- **Producción:** `Buscar producto` / catalog select · raw Enter on non-catalog id did not commit `En uso`.
- **Mensajes:** party typeahead · helper “No escriba un identificador a mano.”

## Mutations

**REAL_SEVEN_MUTATED:** NO  
No mailbox / AI / provider writes. No product UI edits. No deploy.

## STOP
