# CURRENT V1 STATE SNAPSHOT

**SNAPSHOT_AT:** 2026-09-17T12:45:00Z (approx; control-tower freeze)  
**POLICY:** Release-train — **NO MICRO-DEPLOY** until `V1_OWNER_REVIEW_RC_SHA` cut.

| Field | Value |
|---|---|
| BRANCH | `ct3/owner-demo-completeness` |
| LOCAL_HEAD | `2a4c96908ae400e8647e5da405faeda7b286393e` (ahead of remote by 1; **not pushed**) |
| REMOTE_HEAD | `5032e6c017de10514212487662f25191bc6ac0dd` |
| DIRTY_TREE | **clean after `2a4c969`** — remaining work is new commits, not unexplained dirt |
| V1_OWNER_REVIEW_RC_SHA | **NOT CUT** |
| WEB_RUNTIME_SHA | `8e24b7f73971cb538377371d4670897930bcd250` |
| API_RUNTIME_SHA | `8e24b7f73971cb538377371d4670897930bcd250` |
| WEB_DEPLOY_ID | `dep-daltmtu5vjqs738kr0vg` (live @ 2026-09-17T12:25:30Z) |
| API_DEPLOY_ID | `dep-daltofv40ujc73f83nig` (live @ 2026-09-17T12:27:38Z) |
| LATEST_DB_MIGRATION (repo) | `20260920120000_os_finished_goods_receipt_pedido_context` (+ sibling delivery docs) |
| SYNTH_SEED_VERSION | owner-demo densify; `seededAt` in `seeded-ids.json` refreshed post-reseed (`62cb866`) |
| SYNTH_ORG | `01M2JKF77TXMJNDTKNCYNHH9G5` |
| REAL_ORG | `01M2DV9F0V5DXS4G89AKF4D5SR` |
| REAL_SEVEN_MUTATED | **NO** |

## Buckets

| Bucket | Contents |
|---|---|
| LOCAL_ONLY_CHANGES | View As EvaluationProjection + Asesor subject picker; commercial list narrowing (oportunidades/cotizaciones); mutation gate cookie + commercial/work actions; V1 convert.own in scopes + coverage≠convert; Carmen SYNTH business-eval scope comments; release-train ledger docs |
| DEPLOYED_NOT_BV | Live `8e24b7f` Demo-cookie preference + prior OA/scope work — partial BV historical; **not** View As data-narrowing |
| HOSTED_PROVEN | Prior OA Demo→SYNTH context, Carmen SYNTH membership apply, admin-scope removal (hosted BV recorded earlier) — **superseded claims must not imply View As complete** |
| SECURITY_PROVEN | Unit: convert.own / coverage deny / role-preview mutation block / Asesor subject fail-closed (**LOCAL**). Hosted security loop for View As: **NOT RUN** |
| OWNER_ACCEPTED | **NO** (`USER_ACCEPTED = NO`) |

## Open

| Priority | Item |
|---|---|
| P0 | Finish View As narrowing beyond oportunidades/cotizaciones (clientes, map, search, conversations, AI, work lists) |
| P0 | Wire mutation gate across remaining action modules (party/delivery/issue/ops) |
| P0 | Cut + deploy **one** `V1_OWNER_REVIEW_RC_SHA` only after local green + ledger reconcile |
| P1 | Visual hierarchy same RC; Jarvis View-As narrowing when AI hosted-ready |
| P1 | Full-loop + security-loop hosted receipts |

## Safety

| Flag | Value |
|---|---|
| SAFE_TO_TEST | YES locally / on staging **current live** for Demo SYNTH review of already-deployed surfaces |
| SAFE_TO_INVITE_ISA_ALVARO | **NO** — View As data narrowing not hosted; RC not cut |

## Release-train rule (active)

**NO MICRO-DEPLOYS.** Sequence: integrate → test → clean RC SHA → push → **one** web+API deploy → seed if needed → BV freeze.
