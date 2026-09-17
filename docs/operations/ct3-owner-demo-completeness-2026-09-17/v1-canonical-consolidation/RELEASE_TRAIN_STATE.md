# V1 release-train state (canonical)

**One file** for live-vs-local truth, capability ledger, supersession, and deployment policy.  
**Do not micro-deploy.** Read this first.

**SNAPSHOT_AT:** 2026-09-17T13:35:00Z  
**BRANCH:** `ct3/owner-demo-completeness`  
**V1_OWNER_REVIEW_RC_SHA:** NOT CUT · **READY_TO_CUT:** **NO** · **USER_ACCEPTED:** NO · **AI_OWNER_REVIEW_READY:** NO

---

## 1. Current state snapshot

| Field | Value |
|---|---|
| LOCAL_HEAD | `1e4cca4` (+ pending visual commit if dirty) |
| REMOTE_HEAD | `5032e6c017de10514212487662f25191bc6ac0dd` |
| COMMITS_AHEAD | 7+ |
| DIRTY_TREE | check `git status` — must be clean before RC |
| WEB_RUNTIME_SHA | `8e24b7f73971cb538377371d4670897930bcd250` |
| API_RUNTIME_SHA | `8e24b7f73971cb538377371d4670897930bcd250` |
| WEB_DEPLOY_ID | `dep-daltmtu5vjqs738kr0vg` |
| API_DEPLOY_ID | `dep-daltofv40ujc73f83nig` |
| LATEST_DB_MIGRATION (repo) | `20260920120000_os_finished_goods_receipt_pedido_context` |
| SCHEMA_DRIFT | unknown (not re-probed) |
| SYNTH_ORG | `01M2JKF77TXMJNDTKNCYNHH9G5` |
| SYNTH_SEED_VERSION | densify + conversation plan; `seededAt` in seeded-ids.json |
| DURABLE_CONVERSATION_ROWS | **CODE_READY** (dry-run = 5) · **STAGING APPLY BLOCKED** this cycle (credential gate) · still CODE_AHEAD_OF_DATA until `fixture:owner-demo` runs |
| REAL_SEVEN_MUTATED | **NO** |

### Control-tower handoff

```
CURRENT_LOCAL_HEAD = 1e4cca4 (verify tip)
CURRENT_REMOTE_HEAD = 5032e6c
CURRENT_WEB_RUNTIME = 8e24b7f
CURRENT_API_RUNTIME = 8e24b7f
UNCOMMITTED_IMPLEMENTATION_FILES = see git status
READY_TO_CUT_V1_OWNER_REVIEW_RC = NO
```

### Remaining prerequisites (exact)

1. **Staging SYNTH seed apply** — `STAGING_FIXTURE_CONFIRM=1 pnpm --filter @isalwa/os-database run fixture:owner-demo` (authorized DB write) so `DURABLE_CONVERSATION_ROWS = 5`
2. **Clean dirty tree** — commit remaining Cliente360 spacing / Panel surface if any
3. **Audit/History View As narrowing** — still incomplete for Asesor person-slice
4. **Security negatives pack** — expand automated suite beyond convert + evaluation-resource unit tests (documents/audit/history hosted not required yet)
5. **Push** all intended commits
6. Cut `V1_OWNER_REVIEW_RC_SHA` only after 1–5 green → then **one** web+API deploy

### Safety

| Flag | Value |
|---|---|
| SAFE_TO_TEST | YES locally |
| SAFE_TO_INVITE_ISA_ALVARO | **NO** |

---

## 2. Deployment policy (release train)

**NO MICRO-DEPLOYS.** Deploy only RC1 → RC2 if fail → FINAL owner-accepted.

Sequence: integrate → tests → clean SHA → push → one web+API deploy → migrations/seed → BV freeze.

---

## 3. Supersession (short)

| OLD | STATUS |
|---|---|
| Live `8e24b7f` | **LIVE** — superseded by unpushed tip for View As / convert / visual |
| Cosmetic View As PASS | SUPERSEDED by EvaluationProjection + desk gates |
| `CODE_AHEAD_OF_DATA` conversations | Seed script ready; DB apply still required |

---

## 4. View As local status

| Preview | CODE_READY | LIST | DETAIL | SEARCH | DESK | MUTATION |
|---|---|---|---|---|---|---|
| Asesor (person-specific) | YES | opp/quote/clientes/trabajo/map/conv | Cliente360 + quote | palette | commercial only | blocked |
| Jefe Comercial | YES | team visibility | — | — | commercial | blocked |
| Gerencia | YES | org + desks | — | — | broad | blocked |
| Producción | YES | desk gate | — | — | produccion | blocked |
| Almacén | YES | desk gate | — | — | almacen | blocked |
| Compras | YES | desk gate | — | — | compras | blocked |
| Coordinación | YES | desk gate | — | — | entregas | blocked |
| Finanzas | YES | desk gate | — | — | finanzas | blocked |

HOSTED_* = NO until RC deploy + BV.

---

## 5. Machine-readable

```json
{
  "snapshotAt": "2026-09-17T13:35:00Z",
  "canonicalFile": "RELEASE_TRAIN_STATE.md",
  "readyToCutRc": false,
  "v1OwnerReviewRcSha": null,
  "localHead": "1e4cca4",
  "remoteHead": "5032e6c017de10514212487662f25191bc6ac0dd",
  "webRuntimeSha": "8e24b7f73971cb538377371d4670897930bcd250",
  "apiRuntimeSha": "8e24b7f73971cb538377371d4670897930bcd250",
  "durableConversationSeedPlanCount": 5,
  "durableConversationStagingApplied": false,
  "codeAheadOfDataConversations": true,
  "aiOwnerReviewReady": false,
  "ownerAccepted": false,
  "rcPrerequisites": [
    "staging_fixture_owner_demo_seed_apply",
    "clean_dirty_tree",
    "audit_history_view_as_narrowing",
    "security_negatives_pack_expand",
    "push_then_cut_rc"
  ]
}
```
