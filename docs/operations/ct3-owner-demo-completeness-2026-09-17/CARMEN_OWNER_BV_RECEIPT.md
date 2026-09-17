# Carmen owner BV receipt (post SYNTH scope correction)

**At:** 2026-09-17T12:29Z  
**Actor:** `carmen.staging@isalwa.demo`  
**Runtime SHA:** `8e24b7f73971cb538377371d4670897930bcd250` (web+API same-SHA)  
**SYNTH member:** `0f3da8a7-6d31-4e36-8f45-41331e6f5731` (20 business scopes)

## Result

```
CARMEN_OWNER_BV = PASS
pass = 21
fail = 0
ADMIN_BYPASS_USED = NO
USER_ACCEPTED = NO
REAL_SEVEN_MUTATED = NO
```

## Key proofs

| Check | Result |
|---|---|
| Login as Carmen | PASS |
| Demo → SYNTH clientes (nameHits=6) | PASS |
| Durable Conversaciones | PASS |
| Cliente360 DEMO ANDINA | PASS |
| `/administracion` fail-closed | PASS |
| No system.admin Controles | PASS |
| No qa.access Ver-como | PASS |
| Role preview does not change auth | PASS |

## Mutations

| ACTION | REQUIRED_BUSINESS_CAPABILITY | ACTUAL_CAPABILITY_USED | ADMIN_BYPASS_USED |
|---|---|---|---|
| NO_MUTATION_EXECUTED | n/a | read-only navigation | **NO** |
| OPEN_DEMO_CLIENTE360_READ | commercial.org.read | commercial.org.read | **NO** |

Raw: `/tmp/ct3-bv/carmen-owner-bv-results.json`
