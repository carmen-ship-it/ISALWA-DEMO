# RC1 → RC2 REQUIREMENT DELTA

**RC1 SHA:** `02688431b9290b818c8fb245d68c086379363b3f`  
**RC2 SHA:** `8a153a4db43fd82e29d6db6173b668236e763b94`

RC1 owner-review candidacy is **superseded** for Isa/Álvaro invitation. RC2 is the candidate tip once hosted BV passes.

## Code commits on RC2 tip (after RC1)

1. `9ebf82e` — View As on Inicio / Aprobaciones / Compromisos / Incidencias + command palette EvaluationProjection  
2. `8a153a4` — Grant/RevokeCustomerCoverage + Cliente360 Apoyo temporal UI; Resumen org graph; progress vocabulary (Nota de Entrega ≠ Preparación); RC1 evidence package preserved

## Requirement status moves (implementation)

| ID | RC1 | RC2 code | Hosted (RC2) |
|---|---|---|---|
| A04 View As four desks | PARTIAL | **FULL** | UNPROVEN (deploy blocked) |
| C02/C03 Inicio projection | PARTIAL | **FULL** | UNPROVEN |
| D02 Temporary coverage UI | PARTIAL (P0) | **FULL** | UNPROVEN |
| G01/K01 Progress vocabulary | PARTIAL | **FULL** | UNPROVEN |
| H01 Inicio↔Aprobaciones consistency | PARTIAL | **FULL** | UNPROVEN |
| L01 Search View As auth | PARTIAL | **FULL** | UNPROVEN |
| Cliente360 Resumen graph | residual | **FULL** (org visibility + totals) | UNPROVEN |
| F01 Full commercial loop | PARTIAL | unchanged (needs hosted) | UNPROVEN |
| D01 Reassignment hosted | YES impl / UNPROVEN hosted | unchanged | UNPROVEN |
| T01 AI | PARTIAL / NO | **NO** (by design) | NO |
| Real staff logins | not required | **NO** (by design) | — |

## Still PARTIAL (implementation or proof)

- C01 Asesor subject picker UX depth  
- F01 Interactive commercial+post-sale loop (hosted)  
- J01 URL fail-closed tab matrix  
- M01 Coverage×Asesor depth hosted  
- Q01 Unauthorized Asesor audit matrix hosted  
- S01 Mobile visual matrix  
- T01 AI owner-review ready = NO  

## Explicit non-goals (RC2)

- No Jarvis live advertising  
- No REAL employee accounts  
- No REAL Seven mutations  
- No architecture redesign / speculative features  
