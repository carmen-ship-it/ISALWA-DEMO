# CONTROL TOWER 3 — HANDOFF BASE

**At:** 2026-09-17  
**Branch:** `ct3/owner-demo-completeness`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo`

## Starting state (narrow)

| Field | Value |
|---|---|
| CT2_FINAL_PRODUCT_SHA | `4b85b115c3fe0cf009f605d65b043b5e2fb7c11b` |
| CT2_DOCS_ONLY_TIP | `3919c89` (receipt) / stray `1520bd1` CT3 docs on CT2 branch — **ignore for product** |
| CT3_BASE | `4b85b11` |
| WEB_RUNTIME | `4b85b11` · `dep-dalk6du5vjqs73fmm0u0` live |
| API_RUNTIME | `4b85b11` · `dep-dalk6e142hec73cp8l9g` live |
| SAME_SHA | YES |
| REAL_SEVEN_MUTATED | NO |
| SYNTH_ORG | `01M2JKF77TXMJNDTKNCYNHH9G5` |
| PROTECTED_REAL | `01M2DV9F0V5DXS4G89AKF4D5SR` |

## Rule

Do not rebuild CT2. Extend only for CT3 owner-demo completeness.  
Workers do not deploy. CT3 is sole integrator/deployer.
