# V1 release-train state (canonical)

**SNAPSHOT_AT:** 2026-09-17T13:25:00Z  
**BRANCH:** `ct3/owner-demo-completeness`  
**Policy:** NO MICRO-DEPLOYS · one RC only

## RC tip

| Field | Value |
|---|---|
| V1_OWNER_REVIEW_RC_SHA | *(set after build-fix push — tip must build)* |
| Prior tip (build_failed web) | `6c0262e6dbaf9e0505b5f0d60d471ea885fb3268` |
| WEB_FAIL_DEPLOY | `dep-daluhr61egvs73ftatr0` — `next/headers` via mutation-gate → role-preview-provider |
| API_LIVE_PRIOR | `dep-daluhrad0e5s738ma2fg` @ `6c0262e` (will redeploy with fixed tip) |

## Pre-RC reconcile

| Field | Value |
|---|---|
| DURABLE_CONVERSATION_ROWS | **5** (staging applied) |
| Conversation IDs | `owner-demo-conversation:maderas_oriente`, `…:constructora_andina`, `…:proyectos_del_sur`, `…:hotel_central`, `…:ferreteria_norte` |
| LATEST_REPO_MIGRATION | `20260920120000_os_finished_goods_receipt_pedido_context` |
| LATEST_STAGING_MIGRATION | `20260920120000_os_finished_goods_receipt_pedido_context` |
| SCHEMA_DRIFT | **NO** |
| AUDIT_HISTORY_VIEW_AS | PASS (filter + auditoria gate) |
| DOCUMENT/HISTORY/AUDIT NEGATIVES | PASS (A–J unit pack) |

## Conversation IDs (canonical)

1. `owner-demo-conversation:maderas_oriente` → party `01M2PM95PV7YP6AECYXSX4GRBW`
2. `owner-demo-conversation:constructora_andina` → party `01M2PMDY71EDWHJG3AFK36TDZ2`
3. `owner-demo-conversation:proyectos_del_sur` → party `01M2PME87FZGJT8R22KPX921Z2`
4. `owner-demo-conversation:hotel_central` → party `01M2PMF0V0VHHYH19KBXH629E8`
5. `owner-demo-conversation:ferreteria_norte` → party `01M2PMFXKD9VTWB21SQX0VEDJY`

REAL_SEVEN_MUTATED = NO
