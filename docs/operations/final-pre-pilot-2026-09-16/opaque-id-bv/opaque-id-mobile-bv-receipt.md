# Opaque-ID mobile hosted BV receipt (390×844)

**Date:** 2026-09-16T19:16:11Z  
**Actor:** `carmen.staging@isalwa.demo` · READ-SAFE · no writes  
**Base:** `https://os-web-staging.onrender.com`  
**Viewport:** 390×844  
**REAL_SEVEN_MUTATED:** NO  
**Deploy this run:** NO (runtime already live)

## Deploy (pre-existing live)

| Service | ID | Deploy | Status | Commit |
|---------|----|--------|--------|--------|
| os-web-staging | `srv-dajddb67bikc73bl42q0` | `dep-daleg6m5vjqs73f40ug0` | live | `e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed` |
| os-api-staging | `srv-dajd64gae00c739gpk20` | `dep-daleg6m5vjqs73f40u2g` | live | `e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed` |

**FINAL_RUNTIME_SHA:** `e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed`  
**WEB_API_SAME:** YES

## Preconditions

- Login OK → `/inicio`
- Welcome dismissed (`Explorar por mi cuenta` / Escape)
- RECORRIDO tour dismissed (`Omitir`) so primary form visible in shots

## MAP (390)

| Surface | Verdict | Evidence |
|---------|---------|----------|
| `/finanzas` | **PASS** | No Identificador/Etiqueta free-text; subject type → Cliente; party typeahead `Buscar cliente (mín. 2 letras)`; scrollWidth=390; tokens kiln `#18324b` / glaze `#287a78` |
| `/produccion` | **PASS** | No `Identificador de producto`; catalog search `Buscar producto`; Enter on non-catalog id does not commit (`En uso` 0→0); no H-overflow; navy/teal |
| `/mensajes` | **PASS** | Party typeahead `#conversation-customer` + copy «No escriba un identificador a mano»; no free-text party id; no H-overflow; navy/teal |

**BV verdict:** **PASS** (all three surfaces @ 390)

## Evidence paths

- Receipt: `docs/operations/final-pre-pilot-2026-09-16/opaque-id-bv/opaque-id-mobile-bv-receipt.md`
- JSON: `docs/operations/final-pre-pilot-2026-09-16/opaque-id-bv/opaque-id-mobile-bv.json`
- Shots: `opaque-id-bv/finanzas-390.png`, `produccion-390.png`, `mensajes-390.png`
- Script: `opaque-id-bv/opaque-id-mobile-bv.mjs`

**STOP.**
