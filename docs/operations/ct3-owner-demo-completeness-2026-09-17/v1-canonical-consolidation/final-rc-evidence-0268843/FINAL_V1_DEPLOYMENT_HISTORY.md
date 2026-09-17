# FINAL_V1_DEPLOYMENT_HISTORY (since 2026-09-16)

Evidence sources: prior CT3 receipts, `/tmp/v1-rc-deploys*.json`, `/tmp/v1-rc2-deploys-final.json`, SHIP_ATTEMPT / CT3_FINAL receipts.  
Not a full Render API dump of every intermediate (CREDENTIAL-adjacent list not re-fetched in this read-only pass). **Material candidates for this RC train:**

| TIMESTAMP (UTC) | SHA | WEB/API | DEPLOY_ID | PASS/FAIL | WHY SUPERSEDED |
|---|---|---|---|---|---|
| 2026-09-17 ~ earlier CT3 | `8e24b7f…` | WEB+API | `dep-daltmtu5vjqs738kr0vg` / `dep-daltofv40ujc73f83nig` | PASS (live pre-RC) | Superseded by RC tip push |
| 2026-09-17T13:19:40Z | `6c0262e6dbaf9e0505b5f0d60d471ea885fb3268` | WEB | `dep-daluhr61egvs73ftatr0` | **FAIL** build_failed | `next/headers` pulled into client via mutation-gate → role-preview-provider |
| 2026-09-17T13:19:40Z | `6c0262e…` | API | `dep-daluhrad0e5s738ma2fg` | PASS then superseded | Same-SHA train broken by WEB fail; replaced by fix tip |
| 2026-09-17T13:23:Z | `02688431b9290b818c8fb245d68c086379363b3f` | WEB | `dep-dalujo3m8hqs73e5o5r0` | **PASS live** | **V1_OWNER_REVIEW_RC** |
| 2026-09-17T13:23:Z | `02688431b9290b818c8fb245d68c086379363b3f` | API | `dep-dalujofqj5pc73dme4q0` | **PASS live** | **V1_OWNER_REVIEW_RC** |

**Earlier CT3 lineage (representative, not exhaustive):** `4b85b11` CT2 base → multiple CT3 tips (`bd8b070`, `e5f6d3a`, `4900634`, `8e24b7f`) documented in `CT3_FINAL_RECEIPT.md` / `SHIP_ATTEMPT_OWNER_PROOF.md` — all superseded for owner-review by `0268843`.

**Policy note:** Intermediate SHA `6c0262e` was **not** accepted as RC because WEB did not go live. RC = first tip with WEB+API same SHA live after build fix.
