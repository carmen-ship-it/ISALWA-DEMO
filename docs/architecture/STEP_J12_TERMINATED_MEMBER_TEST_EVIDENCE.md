# Step J-12 — Terminated Member Test / Evidence Accuracy

**Date:** 2026-08-24  
**Lane:** J — test/evidence correction  
**Gate result:** **CLOSED**

---

## Finding

Step 15.2 postgres test `terminated member can still build query context` wrote `accessStatus: 'terminated'`, which is **not** a valid `ACCESS_STATUSES` value (`invited`, `active`, `suspended`, `revoked`). Canonical `TerminateMember` never produces this state.

This misclassified a **test/evidence accuracy issue** as a runtime foundation gap.

---

## Correction

| Before | After |
|--------|-------|
| `accessStatus: 'terminated'` synthetic test | Canonical pair: `accessStatus: revoked`, `employmentStatus: terminated`, `AuthIdentity.status: revoked` |
| Expected query context to build | Expect `ACCESS_REVOKED` on `buildQueryContext` |
| CROSS_LANE_CHANGE_REQUEST for `assertMemberActive` | **Withdrawn** — canonical path already blocked via `revoked` |

**Optional defense-in-depth test added:** `employmentStatus: terminated` + `accessStatus: active` (invalid canonical state, J-13 observation only).

---

## Files changed (tests + docs only)

- `packages/os-database/src/member-capability-query-prisma.integration.test.ts`
- `apps/os-api/src/member-capability-runtime.test.ts` (test label + auth identity revoke)
- `docs/architecture/STEP_15_2_MEMBER_CAPABILITY_QUERY_EVIDENCE.md`
- `docs/architecture/ARCHITECTURE_EVIDENCE_REGISTER.md`

**Runtime code:** unchanged.

---

## Verification

```bash
./scripts/verify-step-15-2.sh
```

Log: `.step15-2-evidence/verify-20260824T134841Z.log` (post J-12)

---

## Review request for Agent 3

Confirm J-12 closure: Step 15.2 no longer claims terminated `accessStatus`; canonical termination tests expect denial; no runtime auth changes; verify log green.
