# V1 release-train state (canonical)

**SNAPSHOT_AT:** 2026-09-17T13:20:00Z  
**BRANCH:** `ct3/owner-demo-completeness`  
**Policy:** NO MICRO-DEPLOYS · one RC only

## Pre-RC reconcile (this pass)

| Field | Value |
|---|---|
| DURABLE_CONVERSATION_ROWS | **5** (staging applied) |
| Conversation IDs | `owner-demo-conversation:maderas_oriente`, `…:constructora_andina`, `…:proyectos_del_sur`, `…:hotel_central`, `…:ferreteria_norte` |
| LATEST_REPO_MIGRATION | `20260920120000_os_finished_goods_receipt_pedido_context` |
| LATEST_STAGING_MIGRATION | `20260920120000_os_finished_goods_receipt_pedido_context` |
| SCHEMA_DRIFT | **NO** |
| AUDIT_HISTORY_VIEW_AS | local filter + auditoria gate (management.org.read) |
| DOCUMENT/HISTORY/AUDIT NEGATIVES | unit pack PASS (17 role-preview + history filter tests) |
| LIVE_WEB / LIVE_API | `8e24b7f` until RC deploy |

## Conversation IDs (canonical)

1. `owner-demo-conversation:maderas_oriente` → party `01M2PM95PV7YP6AECYXSX4GRBW`
2. `owner-demo-conversation:constructora_andina` → party `01M2PMDY71EDWHJG3AFK36TDZ2`
3. `owner-demo-conversation:proyectos_del_sur` → party `01M2PME87FZGJT8R22KPX921Z2`
4. `owner-demo-conversation:hotel_central` → party `01M2PMF0V0VHHYH19KBXH629E8`
5. `owner-demo-conversation:ferreteria_norte` → party `01M2PMFXKD9VTWB21SQX0VEDJY`

REAL_SEVEN_MUTATED = NO

## Gate

Update after push/deploy with exact RC SHA.
