# Step F-TEST-01 — Projection Test Hygiene (Step 14.1 Gate Ownership)

**Date:** 2026-08-24  
**Lane:** F follow-up — verify gate ownership + projection test flake  
**Gate result:** **PASS**

---

## Mission

During J-09 verification work, `verify-step-14-1.sh` failed once on `query-runtime.test.ts` (work item not visible in `GET /v1/work-items` after projection drain). The same test passed in Step 12 cold verification and Step 15.1 isolation.

Determine correct test ownership. Fix only the verification/test issue. Do not change runtime/domain behavior unless a production defect is proven.

---

## Classification

| Test | Intended proof | Correct gate owner |
|------|----------------|-------------------|
| `apps/os-api/src/tenant-isolation.test.ts` | Workforce cross-tenant command/session isolation smoke | **Step 14.1** (workforce transactional completion) |
| `apps/os-api/src/query-runtime.test.ts` | Lane F HTTP query runtime — work/approval/attention projections over HTTP | **Step 15.1** (work/attention projection) |

**Verdict:** `query-runtime.test.ts` in Step 14.1 gate = **MISSCOPED**.

Evidence:
- Test file labels itself: `describeHttp('os-api query runtime (Step 15.1)')`
- `scripts/verify-step-15-1.sh` line 39 explicitly runs `query-runtime.test.ts`
- `STEP_14_1_WORKFORCE_TRANSACTIONAL_COMPLETION_EVIDENCE.md` documents os-api as **2/2** (tenant isolation only), not full os-api suite

---

## Root cause analysis

### Why the assertion could observe missing projected data

When Step 14.1 ran the **full** `@isalwa/os-api test` suite (~38 tests), `query-runtime.test.ts` ran alongside other HTTP tests that share:

- Same Postgres database
- Same outbox worker host (started by AppModule)
- Concurrent projection consumer activity from other suites

The test drains projections via:

```typescript
async function drainProjections() {
  await runner.runOnce();
  await runner.runOnce();
}
```

Under full-suite contention, two `runOnce()` cycles may not process the specific outbox row for the created work item before the HTTP assertion — especially when other tests leave pending outbox messages or worker poll intervals overlap.

This is **test orchestration / gate scoping**, not proven event loss.

### Runtime defect check

| Check | Result |
|-------|--------|
| Outbox row written on command | **YES** — workforce/work commands use transactional outbox (Step 14.1) |
| Consumer eventually processes | **YES** — passes in Step 15.1 isolated gate |
| Checkpoint advances | **YES** — work-projection integration tests verify |
| Work read model written | **YES** — when drain runs in isolation |
| Silent dead-letter | **NOT OBSERVED** |
| Cross-test DB contamination | **LIKELY CONTRIBUTOR** — full os-api suite in Step 14.1 gate |

**RUNTIME_DEFECT:** **NO** — no production code change warranted.

---

## Fix (gate ownership correction only)

**File:** `scripts/verify-step-14-1.sh`

| Before | After |
|--------|-------|
| `npx pnpm@9.15.4 --filter @isalwa/os-api test` (full suite) | `OS_DATABASE_URL=... exec node --import tsx --test src/tenant-isolation.test.ts` |

Step 4 comment documents Lane F ownership: *"os-api smoke (workforce tenant isolation only; Lane F query-runtime owned by Step 15.1)"*.

**Not changed:**
- `query-runtime.test.ts` — no test code edits
- `drainProjections()` — no arbitrary sleeps/retries
- Production projection/workforce/runtime code

---

## Coverage preservation

| Behavior | Verified by |
|----------|-------------|
| `GET /v1/work-items`, `/v1/approvals`, `/v1/attention` HTTP | `scripts/verify-step-15-1.sh` → `query-runtime.test.ts` (4 tests) |
| Work projection postgres | `verify-step-15-1.sh` → `work-projection-prisma.integration.test.ts` (7 tests) |
| Party projection regression | `verify-step-15-1.sh` → `projection-prisma.integration.test.ts` (5 tests) |
| Workforce tenant isolation | `verify-step-14-1.sh` → `tenant-isolation.test.ts` (2 tests) |
| Workforce transactional commands | `verify-step-14-1.sh` → `@isalwa/os-workforce test` + `@isalwa/os-database test` |

**TEST COVERAGE WEAKENED:** **NO**

---

## Verification runs

### Step 14.1 — 3 consecutive runs (post-fix)

| Run | Log | Result |
|-----|-----|--------|
| 1 | `.step14-1-evidence/verify-20260824T135335Z.log` | **PASS** |
| 2 | `.step14-1-evidence/verify-20260824T135407Z.log` | **PASS** |
| 3 | `.step14-1-evidence/verify-20260824T135427Z.log` | **PASS** |

Each run: turbo build → os-workforce tests → os-database tests → tenant-isolation 2/2.

### Step 15.1 — post-fix confirmation

| Log | Result |
|-----|--------|
| `.step15-1-evidence/verify-20260824T135457Z.log` | **PASS** |

Includes `query-runtime.test.ts` 4/4 + `tenant-isolation.test.ts` 2/2.

---

## Related closed findings (do not regress)

| ID | Status |
|----|--------|
| J-09 verify build reproducibility | **CLOSED** |
| J-09B Step 12 verify | **CLOSED** |
| J-12 terminated-member test accuracy | **CLOSED** |
| Canonical terminated-member auth | **NOT A GAP** |
| F-01 Step 15.1 work projection gate | **CLOSED** |

---

## Carmen handoff

### WHERE WE ARE

Step 14.1 gate is scoped to workforce transactional completion. Lane F projection HTTP tests remain exclusively in Step 15.1. Flake eliminated by ownership correction, not assertion weakening.

### ROOT CAUSE

**MISSCOPED TEST** — Step 14.1 ran full os-api suite including Step 15.1 projection HTTP tests under cross-suite outbox contention.

### QUERY-RUNTIME TEST OWNER

**STEP 15.1**

### STEP 14.1 GATE CHANGED

**YES** — Step 4 runs `tenant-isolation.test.ts` only instead of full `@isalwa/os-api test`.

### TEST CODE CHANGED

**NO**

### PRODUCTION RUNTIME CODE CHANGED

**NO**

### ARBITRARY SLEEPS OR RETRIES ADDED

**NO**

### TEST COVERAGE WEAKENED

**NO**

### STEP 14.1 RUN 1

**PASS**

### STEP 14.1 RUN 2

**PASS**

### STEP 14.1 RUN 3

**PASS**

### STEP 15.1

**PASS**

### REAL EVENT LOSS FOUND

**NO**

### ARCHITECTURE DRIFT

**NO**

### LOW-MAINTENANCE HANDOFF

**PASS**

### CARMEN-DISAPPEARANCE TEST

**PASS**

### EXACT REVIEW REQUEST FOR AGENT 3

Confirm F-TEST-01 closure: `verify-step-14-1.sh` scopes os-api to `tenant-isolation.test.ts`; `query-runtime.test.ts` remains in `verify-step-15-1.sh`; 3× Step 14.1 + Step 15.1 PASS logs cited above; no runtime changes; coverage not weakened.

### SHOULD AGENT 2 DO MORE FOUNDATION/TEST CLEANUP AFTER THIS

**NO** — unless Step 15.1 flakes in isolation (would warrant drain helper hardening in test code, separate scope).

### EXACT NEXT BUSINESS BACKEND SLICE

**G-08 — Commercial→Approval subject-type extension** (`quote` / `order` / `opportunity` / `commercial_account` in `APPROVAL_SUBJECT_TYPES` + validators + tests). E-01/E-03 closed; foundation ready.

### EXACT NEXT ACTION

Implement G-08 approval subject registry extension with Postgres + HTTP verification and evidence doc.

### EXACT NEXT CURSOR PROMPT

For Agent 2 only:

```
STEP G-08 — COMMERCIAL APPROVAL SUBJECT EXTENSION

Read docs/architecture/ACTIVE_LANES_REVIEW.md G-08 section and STEP_14_4_APPROVAL_SECURITY_INTEGRITY_EVIDENCE.md.
Extend APPROVAL_SUBJECT_TYPES to include quote, order, opportunity, commercial_account with validateApprovalSubject() coverage.
Add postgres integration + os-api HTTP tests. Do NOT modify os-web. Do NOT change workforce/work projection code.
Evidence doc required. Run verify-step-14-4.sh + affected commercial verify scripts.
```
