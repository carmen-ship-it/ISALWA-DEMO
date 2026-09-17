# POST-FINISH FORENSIC — FREEZE / EVIDENCE PRESERVATION

**At:** 2026-09-17T04:28Z (forensic start)  
**Mode:** READ-ONLY — no product behavior changes.

## Frozen pins

| Field | Value |
|---|---|
| BASE_CT3_FINISH_SHA | `f2740d12b405807c5f7b7c9602b91dcf59331a3b` |
| FINAL_CT3_POST_DEMO_SHA | `e5f6d3aaabf95c49d5358caee5dba9058d97197f` |
| BRANCH | `ct3/owner-demo-completeness` |
| BRANCH_TIP (docs after addendum) | `14b66dec6887eb166889bfc141637cce339900ed` |
| WEB_RUNTIME_SHA | `e5f6d3aaabf95c49d5358caee5dba9058d97197f` |
| API_RUNTIME_SHA | `e5f6d3aaabf95c49d5358caee5dba9058d97197f` |
| SAME_SHA_PROOF | PASS |
| WEB_DEPLOY_ID | `dep-dalmg1p42hec73d09g60` |
| API_DEPLOY_ID | `dep-dalmg261egvs73f493qg` |
| HOST | https://os-web-staging.onrender.com |
| API | https://os-api-staging.onrender.com |
| SYNTH_ORG_ID | `01M2JKF77TXMJNDTKNCYNHH9G5` (`w2-roles-acceptance-v1` / ISALWA Wave2 Synthetic Roles) |
| REAL_STAGING_ORG_ID | `01M2DV9F0V5DXS4G89AKF4D5SR` (`isalwa-stg-01M2DV9F` / ISALWA Staging S.R.L.) |
| SYNTH_SEED_TIMESTAMP | `2026-09-17T04:09:03.115Z` |
| REAL_SEVEN_MUTATED | **NO** (seed receipt) |
| CURRENT_HOSTED_BUILD | LIVE pin above (not BRANCH_TIP docs-only commits) |

## PF-8 original verification actor

| Field | Value |
|---|---|
| Primary actor | `w2.people-admin@isalwa.demo` |
| Secondary (DN PDF) | `w2.coordinacion@isalwa.demo` |
| Effective org (intended) | SYNTH `01M2JKF77TXMJNDTKNCYNHH9G5` |
| Method | Headless Playwright `pf8-delta-bv.mjs` — deep links with `?datos=demo` on almost every goto |
| Not used | Carmen Staging (`507febfb-59e6-4cd1-9a02-362be66dc5ee` on REAL Staging S.R.L.) |

## Critical org split (owner observations)

| Actor | Org | DEMO parties in org |
|---|---|---|
| Carmen Staging | REAL Staging S.R.L. `01M2DV9F…` | **0** |
| Wave2 people-admin / seed | SYNTH `01M2JKF…` | **5** |

Demo mode is a **filter within the current organization**, not an org switcher.
