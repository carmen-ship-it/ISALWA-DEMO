# V1 release-train state (canonical)

**One file** for live-vs-local truth, capability ledger, supersession, and deployment policy.  
**Do not micro-deploy.** Read this first.

**SNAPSHOT_AT:** 2026-09-17T13:10:00Z  
**BRANCH:** `ct3/owner-demo-completeness`  
**V1_OWNER_REVIEW_RC_SHA:** NOT CUT · **READY_TO_CUT:** NO · **USER_ACCEPTED:** NO

---

## 1. Current state snapshot

| Field | Value |
|---|---|
| LOCAL_HEAD | `8cbadca` (ahead of remote; **not pushed**) |
| REMOTE_HEAD | `5032e6c017de10514212487662f25191bc6ac0dd` |
| DIRTY_TREE | clean (unexplained implementation dirt = 0) |
| WEB_RUNTIME_SHA | `8e24b7f73971cb538377371d4670897930bcd250` |
| API_RUNTIME_SHA | `8e24b7f73971cb538377371d4670897930bcd250` |
| WEB_DEPLOY_ID | `dep-daltmtu5vjqs738kr0vg` (live @ 2026-09-17T12:25:30Z) |
| API_DEPLOY_ID | `dep-daltofv40ujc73f83nig` (live @ 2026-09-17T12:27:38Z) |
| LATEST_DB_MIGRATION (repo) | `20260920120000_os_finished_goods_receipt_pedido_context` |
| SCHEMA_DRIFT | unknown (not re-probed this cycle) |
| SYNTH_ORG | `01M2JKF77TXMJNDTKNCYNHH9G5` |
| SYNTH_SEED | densify; `seededAt` `2026-09-17T12:04:20.677Z` (`62cb866`) |
| REAL_ORG | `01M2DV9F0V5DXS4G89AKF4D5SR` |
| REAL_SEVEN_MUTATED | **NO** |

### Buckets

| Bucket | Contents |
|---|---|
| LOCAL_ONLY / COMMITTED_NOT_DEPLOYED | View As EvaluationProjection + Asesor subject; list narrowing (oportunidades, cotizaciones, clientes, trabajo); mutation gates (commercial, work, party, delivery, issue); V1 convert.own + coverage≠convert; Carmen SYNTH full business-eval scopes |
| DEPLOYED_NOT_BV (View As narrowing) | Live `8e24b7f` — Demo cookie / OA / admin strip; **not** data-narrowing View As |
| HOSTED_PROVEN | Demo→SYNTH context, Carmen SYNTH membership, admin-scope removal (prior OA) — do not imply View As complete |
| SECURITY_PROVEN | Unit local only (convert / coverage deny / mutation block / Asesor fail-closed). Hosted View As security loop: **NOT RUN** |
| OWNER_ACCEPTED | NO |

### Open

| Priority | Item |
|---|---|
| P0 | View As: map, search, conversations, ops desks, Cliente360 |
| P0 | Cut **one** `V1_OWNER_REVIEW_RC_SHA` after local green — then push + single deploy |
| P1 | Visual hierarchy on same RC; Jarvis View-As when AI hosted-ready |
| P1 | Full-loop + security-loop hosted receipts |

### Safety

| Flag | Value |
|---|---|
| SAFE_TO_TEST | YES locally / live for already-deployed Demo SYNTH surfaces |
| SAFE_TO_INVITE_ISA_ALVARO | **NO** |

### Control-tower handoff

```
CURRENT_LOCAL_HEAD = 8cbadca
CURRENT_REMOTE_HEAD = 5032e6c
CURRENT_WEB_RUNTIME = 8e24b7f
CURRENT_API_RUNTIME = 8e24b7f
UNCOMMITTED_IMPLEMENTATION_FILES = 0
READY_TO_CUT_V1_OWNER_REVIEW_RC = NO
```

**RC prerequisites:** remaining View As surfaces → push when cutting RC → build/security green → ledger reconciled → one web+API deploy.

---

## 2. Deployment policy (release train)

**NO MICRO-DEPLOYS DURING NORMAL FEATURE CORRECTION.**

Deploy only at: **RC1** → **RC2** (only if RC1 BV fails) → **FINAL** (owner-accepted).

```
parallel implementation (one writer per collision boundary)
→ worker receipts → integrate → reconcile → tests
→ clean candidate SHA → push
→ ONE coordinated web + API deploy (same SHA)
→ migrations / SYNTH seed if required
→ hosted BV on frozen SHA → release receipt
```

BV fail → fix locally → **new** SHA → redeploy. Never change code under an active BV.

**Exceptions only:** security emergency · data integrity · deployment-specific isolated proof.

**Banned:** micro-deploys for progress · inferring HEAD==live from timing · collapsing LOCAL/COMMITTED/PUSHED/DEPLOYED/HOSTED_PROVEN/OWNER_ACCEPTED · marking View As complete from sidebar alone.

---

## 3. Supersession map

Do not treat old PASS receipts as current truth.

| OLD_SHA / RECEIPT | WHAT_IT_CLAIMED | CURRENT_STATUS | SUPERSEDED_BY | WHY |
|---|---|---|---|---|
| `f2740d1` | Early CT3 / PF baseline | SUPERSEDED | OA + `8e24b7f` | history only |
| `e5f6d3a` | Post-PF completeness | SUPERSEDED | OA-1..7 + scope correction | demo/membership model corrected |
| `4900634` | Intermediate ship claim | SUPERSEDED | `8e24b7f` / later tip | runtime evolved |
| PF-8 BV (pre-OA) | Owner demo “complete enough” | SUPERSEDED | OA collision map | Demo cookie vs REAL shadowing |
| OA-1 Demo=SYNTH | Demo uses SYNTH | DEPLOYED @ `8e24b7f` | — | true on live; not View As complete |
| `994a138` admin strip | No people.admin/QA | DEPLOYED @ `8e24b7f` | full business-eval clarify | strip live; coverage meaning clarified locally |
| `a225dfa` owner BV PASS | Carmen can evaluate | PARTIAL for View As | pending RC | no data-narrowing proof |
| Live `8e24b7f` | Current hosted web+API | **LIVE** | next RC only | local tip ahead |
| `5032e6c` | View As gate via management.org.read | PUSHED, not deployed | RC deploy | supersedes system.admin gate claim |
| Pre-EvaluationProjection “View As PASS” | Cosmetic nav | SUPERSEDED | EvaluationProjection commits | not HOSTED_PROVEN |

| Candidate | SHA | Status |
|---|---|---|
| Pre-train micro-deploys | through `8e24b7f` | FROZEN history |
| `V1_OWNER_REVIEW_RC` | NOT CUT | blocked on remaining View As + tests |

Also see: `SUPERSEDED_CLAIM_REGISTER.md`.

---

## 4. Live vs local capability ledger

Stages never collapse.  
`CURRENT_STATUS`: LOCAL_ONLY | COMMITTED | PUSHED | DEPLOYED | DATA_APPLIED | HOSTED_PROVEN | OWNER_ACCEPTANCE_PENDING | OWNER_ACCEPTED | SUPERSEDED | BLOCKED | CODE_AHEAD_OF_DATA

| CAPABILITY | LOCAL_IMPLEMENTED | COMMITTED_SHA | PUSHED | WEB_DEPLOYED | API_DEPLOYED | DB_MIGRATED | SYNTH_SEEDED | HOSTED_DATA_VISIBLE | HOSTED_INTERACTION_PROVEN | NEGATIVE_SECURITY_PROVEN | OWNER_ACCEPTED | CURRENT_STATUS | EVIDENCE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Demo context switch | YES | 8e24b7f+ | YES | YES@8e24b7f | YES@8e24b7f | n/a | YES | PARTIAL | PARTIAL | PARTIAL | NO | DEPLOYED | OA-1 / demo cookie |
| Carmen SYNTH membership | YES | 994a138+ | YES | YES@8e24b7f | YES@8e24b7f | n/a | YES | YES | PARTIAL | YES | NO | DEPLOYED | membership apply |
| Carmen business-evaluation capability set | YES | 2a4c969+ | NO | NO | NO | n/a | YES | NO | NO | UNIT | NO | COMMITTED | synth scopes |
| admin-scope removal | YES | 994a138+ | YES | YES@8e24b7f | YES@8e24b7f | n/a | YES | YES | YES | YES | NO | DEPLOYED | forbidden scopes |
| REAL/SYNTH isolation | YES | prior | YES | YES | YES | n/a | YES | YES | PARTIAL | PARTIAL | NO | DEPLOYED | org cookies |
| resource-level authorization | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | PARTIAL | NO | DEPLOYED | convert gate |
| role projections | PARTIAL | 2a4c969+ | NO | NO | NO | n/a | YES | NO | NO | UNIT | NO | COMMITTED | evaluation-projection |
| View As | PARTIAL | 2a4c969+ | NO | NO | NO | n/a | YES | NO | NO | UNIT | NO | COMMITTED | menu+cookie+lists |
| View As mutation blocking | PARTIAL | 2a4c969+ / f5a3d92 | NO | NO | NO | n/a | n/a | NO | NO | UNIT | NO | COMMITTED | mutation-gate |
| View As person-specific Asesor | PARTIAL | 2a4c969+ | NO | NO | NO | n/a | YES | NO | NO | UNIT | NO | COMMITTED | asesor picker |
| client ownership | YES | prior | YES | YES | YES | n/a | YES | YES | PARTIAL | PARTIAL | NO | DEPLOYED | account owner |
| temporary coverage | YES | prior | YES | YES | YES | n/a | PARTIAL | PARTIAL | PARTIAL | UNIT (≠convert) | NO | DEPLOYED | coverage grants |
| permanent reassignment | YES | prior | YES | YES | YES | n/a | PARTIAL | PARTIAL | PARTIAL | UNIT | NO | DEPLOYED | reassign scope |
| own-quote conversion | YES | 2a4c969 | NO | NO | NO | n/a | YES | NO | NO | UNIT+API | NO | COMMITTED | convert.own |
| cross-owner conversion blocking | YES | 2a4c969 | NO | NO | NO | n/a | n/a | NO | NO | UNIT+API | NO | COMMITTED | coverage deny |
| approval routing | PARTIAL | prior | YES | YES@8e24b7f | YES | n/a | PARTIAL | PARTIAL | PARTIAL | PARTIAL | NO | DEPLOYED | OA approval |
| named approver | PARTIAL | prior | YES | YES | YES | n/a | PARTIAL | PARTIAL | PARTIAL | NO | NO | DEPLOYED | RequestApproval |
| Gerencia escalation | PARTIAL | prior | YES | YES | YES | n/a | PARTIAL | NO | NO | NO | NO | DEPLOYED | management.org.read |
| approval Work | PARTIAL | prior | YES | YES | YES | n/a | PARTIAL | PARTIAL | PARTIAL | NO | NO | DEPLOYED | work items |
| post-approval continuation | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | post-approval-continue |
| Opportunity | YES | prior | YES | YES | YES | n/a | YES | YES | YES | PARTIAL | NO | DEPLOYED | |
| Quote | YES | prior | YES | YES | YES | n/a | YES | YES | YES | PARTIAL | NO | DEPLOYED | |
| Quote PDF | YES | prior | YES | YES | YES | n/a | YES | YES | YES | NO | NO | DEPLOYED | PF-4 |
| manual send evidence | YES | prior | YES | YES | YES | n/a | YES | YES | PARTIAL | NO | NO | DEPLOYED | |
| follow-up | YES | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Quote acceptance | YES | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | via convert |
| Quote → Pedido | YES | 2a4c969 | NO | PARTIAL@8e24b7f | PARTIAL | n/a | YES | PARTIAL | PARTIAL | LOCAL | NO | COMMITTED | V1 gate not live |
| Pedido index | YES | prior | YES | YES | YES | n/a | YES | YES | PARTIAL | NO | NO | DEPLOYED | |
| Pedido Cliente360 projection | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Production / Warehouse / Purchasing review | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| shared process progress | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Delivery Note / DN PDF / Salida / Entrega | PARTIAL–YES | prior | YES | YES | YES | YES? | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Mi Trabajo / Who has the ball / Issues / Commitments | PARTIAL–YES | prior+f5a3d92 | NO* | YES@8e24b7f | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | COMMITTED* | *View As work lens local |
| durable Conversations | CODE YES | prior | YES | YES | YES | n/a | **NO** (JSON) | NO DB | PARTIAL UI | NO | NO | CODE_AHEAD_OF_DATA | seed actual state |
| conversation-derived suggestions | PARTIAL | prior | YES | YES | YES | n/a | fixtures | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Cliente360 / Inicio / Search / Map / Gerencia / Finance / Documents / History / Audit | PARTIAL–YES | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | View As filter incomplete on search/map |
| Story Mode | YES | prior | YES | YES | YES | n/a | YES | YES | PARTIAL | NO | NO | DEPLOYED | OA-5 |
| visual hierarchy | NO | — | NO | NO | NO | n/a | n/a | NO | NO | NO | NO | BLOCKED | same RC only |
| semantic colors / next-action / responsibility / progress / mobile | PARTIAL | prior | YES | YES | n/a | n/a | n/a | PARTIAL | PARTIAL | NO | NO | DEPLOYED | tokens + strips |
| Jarvis / AI entry / provider / resource auth / View-As AI / AI mutation | PARTIAL–NO | prior | YES | YES | YES | n/a | n/a | NO | NO | NO | NO | BLOCKED | HOSTED_PROOF |

\* Local commits not pushed; do not deploy until RC cut.

### View As acceptance (not complete)

| Preview | CODE_READY | HOSTED | DATA_NARROWING_PROVEN | DIRECT_URL_PROVEN | SEARCH_NARROWING_PROVEN | MUTATION_BLOCK_PROVEN | AI_NARROWING_PROVEN_IF_READY |
|---|---|---|---|---|---|---|---|
| Asesor | PARTIAL | NO | NO | NO | NO | UNIT | N/A |
| Jefe Comercial | PARTIAL | NO | NO | NO | NO | UNIT | N/A |
| Gerencia | PARTIAL | NO | NO | NO | NO | UNIT | N/A |
| Producción | PARTIAL (nav) | NO | NO | NO | NO | UNIT | N/A |
| Almacén | PARTIAL (nav) | NO | NO | NO | NO | UNIT | N/A |
| Compras | PARTIAL (nav) | NO | NO | NO | NO | UNIT | N/A |
| Coordinación | PARTIAL (nav) | NO | NO | NO | NO | UNIT | N/A |
| Finanzas | PARTIAL (nav) | NO | NO | NO | NO | UNIT | N/A |

---

## 5. Machine-readable state

```json
{
  "snapshotAt": "2026-09-17T13:10:00Z",
  "canonicalFile": "RELEASE_TRAIN_STATE.md",
  "branch": "ct3/owner-demo-completeness",
  "localHead": "8cbadca",
  "remoteHead": "5032e6c017de10514212487662f25191bc6ac0dd",
  "localAheadOfRemote": 3,
  "dirtyTree": false,
  "v1OwnerReviewRcSha": null,
  "readyToCutRc": false,
  "web": {
    "deployId": "dep-daltmtu5vjqs738kr0vg",
    "sourceSha": "8e24b7f73971cb538377371d4670897930bcd250",
    "status": "live",
    "startedAt": "2026-09-17T12:22:15.5897Z",
    "liveAt": "2026-09-17T12:25:30.910558Z"
  },
  "api": {
    "deployId": "dep-daltofv40ujc73f83nig",
    "sourceSha": "8e24b7f73971cb538377371d4670897930bcd250",
    "status": "live",
    "startedAt": "2026-09-17T12:25:35.248316Z",
    "liveAt": "2026-09-17T12:27:38.663468Z"
  },
  "latestDbMigrationLocal": "20260920120000_os_finished_goods_receipt_pedido_context",
  "schemaDriftUnknown": true,
  "synth": {
    "orgId": "01M2JKF77TXMJNDTKNCYNHH9G5",
    "seededAt": "2026-09-17T12:04:20.677Z",
    "realSevenMutated": false
  },
  "real": {
    "orgId": "01M2DV9F0V5DXS4G89AKF4D5SR",
    "realSevenMutated": false
  },
  "ownerAccepted": false,
  "safeToInviteIsaAlvaro": false,
  "deploymentPolicy": "NO_MICRO_DEPLOYS_RELEASE_TRAIN",
  "committedNotDeployed": ["a225dfa", "62cb866", "5032e6c", "2a4c969", "f5a3d92", "8cbadca"],
  "rcPrerequisites": [
    "view_as_narrowing_map_search_conversations_ops_ai",
    "push_when_rc_cut",
    "local_build_green",
    "security_negative_tests_green",
    "single_coordinated_web_api_deploy"
  ],
  "supersedesSplitArtifacts": [
    "CURRENT_V1_STATE_SNAPSHOT.md",
    "CURRENT_V1_STATE_SNAPSHOT.json",
    "LIVE_VS_LOCAL_CAPABILITY_LEDGER.md",
    "SUPERSESSION_MAP.md",
    "DEPLOYMENT_POLICY_RELEASE_TRAIN.md"
  ]
}
```
