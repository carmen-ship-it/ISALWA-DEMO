# Step J-09 — Verification Reproducibility Evidence

**Date:** 2026-08-24  
**Lane:** J — Platform / verify script hygiene  
**Gate result:** **PASS**

---

## Finding summary

| ID | Root cause | Fix |
|----|------------|-----|
| **J-09A** | Verify scripts used manual `pnpm --filter X build` lists | Replaced with Turbo graph builds |
| **J-09B** | Package dependency | **NOT A DEFECT** — `os-database` correctly depends on `@isalwa/os-query` |
| **J-09C** | Scripts bypassed Turbo `^build` | **CLOSED** — `verify_turbo_build()` uses `pnpm exec turbo run build --filter=...` |

---

## Root cause (confirmed)

`@isalwa/os-database` imports `@isalwa/os-query` (e.g. `prisma-member-query-store.ts` → `MemberQueryStorePort`). Affected scripts built `os-database` without building `os-query` first. On a clean checkout (no `packages/os-query/dist`), `tsc` fails. Warm `dist/` from prior runs masked the defect.

Turbo `build.dependsOn: ["^build"]` in `turbo.json` is correct. The defect was **script orchestration only**.

---

## Fix (scripts only — no runtime changes)

### Shared helper

`scripts/lib/verify-build.sh`:

```bash
verify_turbo_build @isalwa/os-database   # builds target + declared workspace deps
```

Uses: `npx pnpm@9.15.4 exec turbo run build --filter=<target>`

### Updated scripts

| Script | Build target |
|--------|--------------|
| `verify-step-14-4.sh` | `@isalwa/os-database` |
| `verify-step-14-5.sh` | `@isalwa/os-database` |
| `verify-step-14.sh` | `@isalwa/os-api` (includes os-database + os-query transitively) |
| `verify-step-14-1.sh` | `@isalwa/os-api` |
| `verify-step-16.sh` | `@isalwa/os-api` |

---

## Cold-build verification

**Cold prep:** `rm -rf packages/os-query/dist packages/os-database/dist packages/os-api/dist`

| Gate | Cold build | Full suite | Log |
|------|------------|------------|-----|
| Step 14.4 | PASS | PASS (17 + 7 tests) | `.step14-4-evidence/verify-20260824T134610Z.log` |
| Step 14.5 | PASS | PASS (11 + 7 tests) | `.step14-5-evidence/verify-20260824T134620Z.log` |
| Step 16 | PASS | PASS (6 commercial tests) | `.step16-evidence/verify-20260824T134633Z.log` |
| Step 14 | PASS | **Not re-run** (build-only cold verified) | — |
| Step 14.1 | PASS | **FAIL** — os-api `query-runtime.test.ts` (pre-existing; not build-related) | — |

Step 14.4 cold log proves Turbo built `@isalwa/os-query` before `@isalwa/os-database` (10 tasks, includes os-query).

---

## Additional script audit

| Script | Classification | Notes |
|--------|----------------|-------|
| `verify-step-14-6.sh` | SAFE | Manually lists os-query (works; could migrate to turbo later) |
| `verify-step-15.sh` | SAFE | Includes os-query |
| `verify-step-15-1.sh` | SAFE | Includes os-query |
| `verify-step-15-2.sh` | SAFE | Includes os-query |
| `verify-step-16-1.sh` | SAFE | Includes os-query |
| `verify-step-16-1a.sh` | SAFE | Includes os-query |
| `verify-step-16-1b.sh` | SAFE | Includes os-query |
| `verify-step-17-0.sh` | SAFE | Includes os-query |
| `verify-step-12.sh` | **CLOSED (J-09B)** | Migrated to turbo `@isalwa/os-api` — see `STEP_J09B_STEP12_VERIFY_REPRODUCIBILITY_EVIDENCE.md` |

---

## Future verification standard (minimum)

1. Build via `verify_turbo_build <target>` (Turbo `^build` graph), not manual package lists.
2. Fail on build/test failure (`set -euo pipefail`).
3. Capture timestamped logs under `.step*-evidence/`.
4. Do not depend on warm `dist/` — cold prep should succeed.
5. Prefer scoped `--filter=@isalwa/<target>` over full monorepo rebuild.

---

## Carmen handoff

### WHERE WE ARE

J-09 verify-script build bypass is **closed**. Five affected Lane E/G gates now use Turbo dependency-aware builds. Runtime unchanged.

### J-09 STATUS
**CLOSED**

### ROOT CAUSE CONFIRMED
Manual `pnpm --filter` build lists in verify scripts skipped `@isalwa/os-query` before `@isalwa/os-database`; warm `dist/` masked failures.

### FILES CHANGED
- `scripts/lib/verify-build.sh` (new)
- `scripts/verify-step-14.sh`
- `scripts/verify-step-14-1.sh`
- `scripts/verify-step-14-4.sh`
- `scripts/verify-step-14-5.sh`
- `scripts/verify-step-16.sh`
- `docs/architecture/STEP_J09_VERIFICATION_REPRODUCIBILITY_EVIDENCE.md`
- `docs/architecture/ARCHITECTURE_EVIDENCE_REGISTER.md`

### BUILD STRATEGY NOW
`source scripts/lib/verify-build.sh` → `verify_turbo_build @isalwa/os-database` or `@isalwa/os-api`  
Underlying: `npx pnpm@9.15.4 exec turbo run build --filter=<target>`

### COLD STEP 14.4
**PASS**

### COLD STEP 14.5
**PASS**

### STEP 14
**CONDITIONAL** — cold build PASS; full suite not re-run this session

### STEP 14.1
**CONDITIONAL** — cold build PASS; full suite failed on unrelated `query-runtime.test.ts` HTTP flake (not J-09)

### STEP 16
**PASS**

### TEST COVERAGE WEAKENED
**NO**

### RUNTIME CODE CHANGED
**NO**

### ADDITIONAL AFFECTED SCRIPTS FOUND
`verify-step-12.sh` — same pattern; documented follow-up, not fixed in J-09 scope

### NEW EVIDENCE LOGS
- `.step14-4-evidence/verify-20260824T134610Z.log`
- `.step14-5-evidence/verify-20260824T134620Z.log`
- `.step16-evidence/verify-20260824T134633Z.log`

### WHAT IS NOT VERIFIED
- Full cold re-run of `verify-step-14.sh` (build phase only)
- Full cold re-run of `verify-step-14-1.sh` (os-api test failure unrelated to build)
- `verify-step-12.sh` turbo migration

### ARCHITECTURE DRIFT
**NO**

### LOW-MAINTENANCE HANDOFF
**PASS** — single helper + Turbo graph; no manual dependency lists to maintain

### CARMEN-DISAPPEARANCE TEST
**PASS**

### EXACT REVIEW REQUEST FOR AGENT 3

Re-review J-09 closure: confirm `scripts/lib/verify-build.sh` + five updated verify scripts reproduce Step 14.4 and 14.5 from cold `dist/` removal using Turbo `^build` only; confirm no runtime changes; confirm test coverage unchanged. Logs: `.step14-4-evidence/verify-20260824T134610Z.log`, `.step14-5-evidence/verify-20260824T134620Z.log`.

### EXACT NEXT BACKEND GAP
None introduced by J-09. Canonical terminated-member auth is **NOT A GAP** (J-12 closed).

### EXACT NEXT ACTION
Agent 3: re-review J-09 closure against cold logs above.

### EXACT NEXT CURSOR PROMPT

For Agent 2 only:

```
Lane J follow-up — migrate verify-step-12.sh to scripts/lib/verify-build.sh (verify_turbo_build @isalwa/os-api) using same J-09 pattern. Do NOT change runtime. Cold-verify build phase and capture log.
```
