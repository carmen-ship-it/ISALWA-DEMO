# Operating-loop hosted BV — parked

**When:** 2026-09-16T21:50Z  
**LIVE SHA:** `8508b9ce84c9914ebf86f0b25e07e1f159ba122e` (web+API SAME)  
**REAL_SEVEN_MUTATED:** NO

## Scorecard

| Subfeature | Code | Hosted | Browser |
|---|---|---|---|
| Manual quote send UI/command | IMPLEMENTED | HOSTED | UNPROVEN |
| FG receive + Pedido context | IMPLEMENTED | HOSTED + migrated | UNPROVEN |
| Nota → Salida → Entrega + PDF | IMPLEMENTED | HOSTED + migrated | UNPROVEN |
| Inicio / event work offers | IMPLEMENTED | HOSTED | UNPROVEN |
| Health / ready | — | PASS | N/A |

## Blocker

- **BLOCKED LANE:** interactive login for SYNTH BV  
- **TYPE:** AUTH_BLOCKED  
- **EVIDENCE:** automated Contraseña fill denied; `/login` loads  
- **UNBLOCK:** manual Entrar as `w2.asesor@isalwa.demo` / `w2.almacen@isalwa.demo` (or Carmen eval), then resume adversarial walk  

Negatives held by constitution/tests until browser proof: NE-PILOT only, no admin bypass, no REAL_SEVEN writes in this round.
