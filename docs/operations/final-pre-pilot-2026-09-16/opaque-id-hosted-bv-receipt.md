# Opaque-ID hosted BV receipt

**Date:** 2026-09-16T19:11:18Z  
**Actor:** `carmen.staging@isalwa.demo` · READ-SAFE · no writes  
**Base:** `https://os-web-staging.onrender.com`

## Deploy

| Service | ID | Deploy | Status | Commit |
|---------|----|--------|--------|--------|
| os-web-staging | `srv-dajddb67bikc73bl42q0` | `dep-daleg6m5vjqs73f40ug0` | live | `e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed` |
| os-api-staging | `srv-dajd64gae00c739gpk20` | `dep-daleg6m5vjqs73f40u2g` | live | `e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed` |

**FINAL_RUNTIME_SHA:** `e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed`  
**WEB_API_SAME:** YES

## MAP

| Surface | Verdict | Evidence |
|---------|---------|----------|
| `/finanzas` | **PASS** | No Identificador/Etiqueta free-text; subject type select + party typeahead (`Buscar cliente (mín. 2 letras)`) |
| `/produccion` | **PASS** | Catalog search (`Buscar producto`); Enter on non-catalog id does not commit (`En uso` unchanged) |
| `/mensajes` | **PASS** | Party typeahead `#conversation-customer` + copy against hand-written id |

**BV verdict:** **PASS** (all three surfaces)

## Evidence paths

- JSON: `docs/operations/final-pre-pilot-2026-09-16/opaque-id-bv/opaque-id-bv.json`
- Shots: `opaque-id-bv/finanzas-1440.png`, `produccion-1440.png`, `mensajes-1440.png`
- Script: `opaque-id-bv/opaque-id-hosted-bv.mjs`

**STOP.**
