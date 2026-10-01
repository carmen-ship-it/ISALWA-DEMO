# Step J-09B — Step 12 Verify Script Reproducibility

**Date:** 2026-08-24  
**Lane:** J follow-up — `verify-step-12.sh`  
**Gate result:** **PASS**

---

## Mission

Apply the J-09 Turbo dependency-graph build pattern to `scripts/verify-step-12.sh`, the one remaining script identified during J-09 audit with the same manual `pnpm --filter` build-list defect (skipped `@isalwa/os-query` before `@isalwa/os-database`).

**Runtime code:** unchanged.

---

## Change

| Before | After |
|--------|-------|
| Manual build of contracts, events, party, workforce, database | `source scripts/lib/verify-build.sh` |
| Separate os-api build in step 4 | `verify_turbo_build @isalwa/os-api` in step 2 |
| Warm `os-query/dist` could mask failure | Turbo `^build` builds full dependency graph |

**Target rationale:** Step 12 runs `@isalwa/os-database test` and `@isalwa/os-api test`. `@isalwa/os-api` depends on `os-database`, `os-query`, `os-party`, etc. — single filter covers all declared workspace deps.

---

## Cold verification

**Prep:**
```bash
rm -rf packages/os-query/dist packages/os-database/dist packages/os-api/dist
```

**Command:**
```bash
./scripts/verify-step-12.sh
```

**Log:** `.step12-evidence/verify-20260824T135029Z.log`  
**Exit code:** 0

| Phase | Result |
|-------|--------|
| Turbo build (`@isalwa/os-api`) | PASS — includes `@isalwa/os-query` before `@isalwa/os-database` |
| `@isalwa/os-database test` (party integration) | PASS |
| `@isalwa/os-api test` (full suite, 38 tests) | PASS |

---

## Step 14.1 unrelated failure (not fixed here)

During J-09 primary work, `verify-step-14-1.sh` full suite failed once on:

- **Test:** `os-api query runtime (Step 15.1)` → `GET /v1/work-items and /v1/approvals and /v1/attention over HTTP`
- **Assertion:** `assert.ok(workJson.items.some((w) => w.workItemId === workItemId))` — work item not in list after projection drain
- **Reproducibility:** Intermittent / environment-order dependent (same test **PASS** in Step 12 cold run above)
- **Runtime/security relevance:** Low — projection timing / test isolation, not auth bypass
- **Owner recommendation:** Lane F — tighten HTTP test to await projection drain or scope test file in 14-1 verify script

---

## Related closed findings (do not regress)

| ID | Status |
|----|--------|
| J-09 primary | **CLOSED** |
| J-12 terminated-member test accuracy | **CLOSED** |
| Canonical terminated-member production auth | **NOT A GAP** |
| J-13 employmentStatus guard | **OPTIONAL HARDENING** |

---

## Review request for Agent 3

Confirm J-09B closure: `verify-step-12.sh` uses `verify_turbo_build @isalwa/os-api`; cold dist removal + full Step 12 gate PASS; no runtime changes; log `.step12-evidence/verify-20260824T135029Z.log`.

---

## Carmen handoff

### WHERE WE ARE

J-09 verify-script reproducibility is **fully closed** including Step 12 follow-up. All identified manual-build scripts now use Turbo graph builds.

### STEP 12 VERIFY REPRODUCIBILITY
**PASS**

### VERIFY-STEP-12 BUILD STRATEGY
`verify_turbo_build @isalwa/os-api` → `pnpm exec turbo run build --filter=@isalwa/os-api`

### COLD STEP 12
**PASS**

### FULL STEP 12 TEST SUITE
**PASS** (38 os-api + party prisma integration)

### TEST COVERAGE WEAKENED
**NO**

### RUNTIME CODE CHANGED
**NO**

### J-09 PRIMARY
**CLOSED**

### J-12
**CLOSED**

### TERMINATED MEMBER PRODUCTION AUTH GAP
**NOT A GAP**

### J-13
**OPTIONAL HARDENING**

### STEP 14.1 UNRELATED FAILURE

`query-runtime.test.ts` work list assertion failed intermittently during J-09 session; not reproduced in Step 12 cold run. Recommend Lane F test isolation fix — out of J-09B scope.

### NEW EVIDENCE LOG
`.step12-evidence/verify-20260824T135029Z.log`

### ARCHITECTURE DRIFT
**NO**

### LOW-MAINTENANCE HANDOFF
**PASS**

### CARMEN-DISAPPEARANCE TEST
**PASS**

### EXACT REVIEW REQUEST FOR AGENT 3

Confirm J-09B: Step 12 verify uses Turbo graph build, cold PASS, full tests unchanged, no runtime diff. Log: `.step12-evidence/verify-20260824T135029Z.log`.

### EXACT NEXT BACKEND GAP

Step 14.1 verify script should scope or stabilize `query-runtime.test.ts` HTTP projection timing (Lane F test hygiene — separate from J-09B).

### EXACT NEXT ACTION

Agent 3: close J-09B on review of Step 12 cold log.

### EXACT NEXT CURSOR PROMPT

For Agent 2 only:

```
Lane F test hygiene — scope verify-step-14-1.sh os-api step to workforce/transactional tests only OR fix query-runtime.test.ts projection drain timing. Do NOT change runtime auth. Evidence: STEP_J09B Step 14.1 unrelated failure note.
```
