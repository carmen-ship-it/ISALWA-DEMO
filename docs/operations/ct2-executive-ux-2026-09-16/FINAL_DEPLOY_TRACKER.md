# CT2 FINAL DEPLOY TRACKER

FINAL_CT2_SOURCE_SHA=`328d0cb129a5e5ac7a58ed8c3033cf4a7ea1a2c2`

| Field | Value |
|---|---|
| Prior tip ambiguity | `5462c3c` product salvage + `c34f23f` docs-only → superseded |
| OrderPrep wire commit | `328d0cb` (= FINAL) |
| WEB service | `srv-dajddb67bikc73bl42q0` |
| API service | `srv-dajd64gae00c739gpk20` |
| WEB_DEPLOY_ID | `dep-dalk4965vjqs73fmfpcg` |
| API_DEPLOY_ID | `dep-dalk49f40ujc73eahlgg` |
| Status at trigger | build_in_progress both |

SHA reconciliation: `c34f23f` was documentation atop `5462c3c` (nav/role-preview). `328d0cb` contains identical product source from `5462c3c` **plus** OrderPrepCard wire + idempotent review Work. Deploy only `328d0cb`.
