# CT3_DEVIATIONS

**FINAL_CT3_SOURCE_SHA:** `bd8b070806a0f09e6be5d98cc644d92122e58662`  
**At:** 2026-09-17

| # | REQUESTED | ACTUAL | MATCH / DEVIATION | WHY | BLOCKS OWNER REVIEW |
|---|---|---|---|---|---|
| 1 | Navy ~`#12324A` | `--isalwa-kiln` `#18324b` | DEVIATION (semantic OK) | Established ISALWA navy token | NO |
| 2 | Soft teal token | Mixes / Story hex; `--isalwa-glaze-soft` empty on :root | DEVIATION | Soft teal via color-mix + literals | NO |
| 3 | DN PDF for commercial asesor | 403 without `delivery.record` | DEVIATION vs naive “any staff” | Scope isolation; proven via coordinacion | NO |
| 4 | Story Mode for any demo viewer | Gated to role-preview (people.admin / system+management) | DEVIATION | `canUseOwnerDemo` = `canUseRolePreview` | NO (eval path uses people-admin) |
| 5 | AI owner review live | AI_OWNER_REVIEW_READY=NO | DEVIATION / residual | Provider/hosted interactive unproven | NO for CT3_FINISHED if UI does not pretend live |
| 6 | Audit “desde conversación” hosted samples | Labels implemented+tested; seed may lack all four event rows | PARTIAL | Needs create-from-conversation or seed events | NO (source delivered; sample soft) |
| 7 | Long-list Ver todos at 6+ | Implemented (ScaledListReveal); demo volumes usually compact | MATCH (logic) / soft hosted | Threshold not always hit with 5 demos | NO |
| 8 | Docs pin commits after FINAL product SHA | FINAL points at product hotfix `bd8b070`; branch tip may include docs | MATCH (intended pin pattern) | Runtime = product SHA | NO |

No deviation hides REAL_SEVEN mutation (none). No fake Revenue. No false AI-live claim.
