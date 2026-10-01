# Opaque-ID hosted BV receipt

**When:** 2026-09-16T19:14:23.964Z  
**Actor:** carmen.staging@isalwa.demo (READ-SAFE)  
**Harness:** `docs/operations/final-pre-pilot-2026-09-16/opaque-id-bv/opaque-id-hosted-bv.mjs`  
**Evidence:** `opaque-id-bv.json` + `finanzas-1440.png` · `produccion-1440.png` · `mensajes-1440.png`

## Runtime

| Field | Value |
|---|---|
| **FINAL_RUNTIME_SHA** | `e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed` |
| **WEB_API_SAME** | YES |
| WEB `os-web-staging` (`srv-dajddb67bikc73bl42q0`) | live `dep-daleg6m5vjqs73f40ug0` @ `e9a7a02…` |
| API `os-api-staging` (`srv-dajd64gae00c739gpk20`) | live `dep-daleg6m5vjqs73f40u2g` @ `e9a7a02…` |
| Deploy action this turn | none (already live on preferred SHA; prior `29b6f3f` deactivated) |

## Map

| Surface | Verdict | Notes |
|---|---|---|
| `/finanzas` | **PASS** | No Identificador/Etiqueta free text · `#finance-subject-type` present · order = honest empty (`No hay pedidos abiertos…`) · party switch mounts `#finance-subject-party` · welcome/tour dismissed |
| `/produccion` | **PASS** | Catalog search · Enter does not commit raw id · no Identificador de producto · welcome/tour dismissed |
| `/mensajes` | **PASS** | Party typeahead · no free-text party id · welcome/tour dismissed |

**Overall:** PASS (3/3)

## Contamination fix

Prior run false-FAIL’d Finanzas when empty orders hid SearchableSelect, and welcome/RECORRIDO contaminated shots. Harness now: dismiss Explorar/Omitir/Escape until gone; Finanzas PASS on Select **or** honest empty + party typeahead proof.

## Mutations

**REAL_SEVEN_MUTATED:** NO

## STOP
