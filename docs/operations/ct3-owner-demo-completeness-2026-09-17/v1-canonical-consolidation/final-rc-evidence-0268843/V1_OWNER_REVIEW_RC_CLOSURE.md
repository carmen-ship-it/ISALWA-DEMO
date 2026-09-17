# V1 Owner Review RC — closure receipt

**At:** 2026-09-17T13:40:00Z  
**Branch:** `ct3/owner-demo-completeness`

## Gate

| Field | Value |
|---|---|
| READY_TO_CUT_V1_OWNER_REVIEW_RC | **YES** |
| V1_OWNER_REVIEW_RC_SHA | `02688431b9290b818c8fb245d68c086379363b3f` |
| LOCAL_HEAD | `02688431b9290b818c8fb245d68c086379363b3f` |
| REMOTE_HEAD | `02688431b9290b818c8fb245d68c086379363b3f` |
| WEB_RUNTIME_SHA | `02688431b9290b818c8fb245d68c086379363b3f` |
| API_RUNTIME_SHA | `02688431b9290b818c8fb245d68c086379363b3f` |
| SAME_SHA_PROOF | **YES** |
| WEB_DEPLOY_ID | `dep-dalujo3m8hqs73e5o5r0` |
| API_DEPLOY_ID | `dep-dalujofqj5pc73dme4q0` |
| HOST | https://os-web-staging.onrender.com |
| CODE_FROZEN_FOR_BV | **YES** (no post-RC app commits after tip) |

## Prerequisites

| Field | Value |
|---|---|
| DURABLE_CONVERSATION_ROWS | **5** |
| AUDIT_HISTORY_VIEW_AS | **PASS** |
| DOCUMENT_SECURITY_NEGATIVES | **PASS** (unit A–J) |
| HISTORY_SECURITY_NEGATIVES | **PASS** |
| AUDIT_SECURITY_NEGATIVES | **PASS** |
| SCHEMA_DRIFT | **NO** |
| LATEST_REPO_MIGRATION | `20260920120000_os_finished_goods_receipt_pedido_context` |
| LATEST_STAGING_MIGRATION | `20260920120000_os_finished_goods_receipt_pedido_context` |

## Durable conversation IDs

1. `owner-demo-conversation:maderas_oriente` → `01M2PM95PV7YP6AECYXSX4GRBW`
2. `owner-demo-conversation:constructora_andina` → `01M2PMDY71EDWHJG3AFK36TDZ2`
3. `owner-demo-conversation:proyectos_del_sur` → `01M2PME87FZGJT8R22KPX921Z2`
4. `owner-demo-conversation:hotel_central` → `01M2PMF0V0VHHYH19KBXH629E8`
5. `owner-demo-conversation:ferreteria_norte` → `01M2PMFXKD9VTWB21SQX0VEDJY`

## Deploy notes

- First attempt tip `6c0262e` → WEB `dep-daluhr61egvs73ftatr0` **build_failed** (`next/headers` via mutation-gate → client provider).
- Fix commit `0268843` (persona-cookie split) → coordinated WEB+API live.
- Invalid `RENDER_API_KEY` env overrides CLI; deploy used `~/.render/cli.yaml` Bearer token with env unset.

## Hosted BV

- Primary Carmen owner BV: **21 PASS / 0 FAIL** → `/tmp/ct3-bv/carmen-owner-bv-results.json`
- View As / mutation / desks: **PASS** (Producción, Almacén, Asesor, mutation J blocked)
- Recheck owner Auditoría + Conversaciones durable: **PASS** (5 demo hits)
- REAL_SEVEN_MUTATED: **NO**
- USER_ACCEPTED: **NO** (Carmen still required)

## Security negatives A–J (unit, fail-closed)

| Case | ACTOR | VIEW_AS | RESOURCE | EXPECTED | ACTUAL | PASS/FAIL |
|---|---|---|---|---|---|---|
| A | Carmen | Asesor A | other client document | blocked | blocked | PASS |
| B | Carmen | Asesor A | other client history | blocked | blocked | PASS |
| C | Carmen | Asesor A | other client audit | blocked | blocked | PASS |
| D | Carmen | Asesor A | cross-company party | blocked | blocked | PASS |
| E | Carmen | Asesor A | cross-company quote/history | blocked | blocked | PASS |
| F | Carmen | Asesor A | cross-company order/audit | blocked | blocked | PASS |
| G | Carmen | Producción | unrelated commercial doc/history/audit | blocked | blocked | PASS |
| H | Carmen | Almacén | unrelated commercial quote audit | blocked | blocked | PASS |
| I | Carmen | Compras | unrelated client/commercial evidence | blocked | blocked | PASS |
| J | Carmen | any View As | mutation attempt | blocked | blocked | PASS |

Hosted J: mutation blocked message shown under View As Producción.
