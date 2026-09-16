# WAVE A AGENT 7 — Adversarial access tests

**Date:** 2026-09-15  
**Branch:** `wave-a/admin-continuity`  
**Scope:** Automated proofs only (memory / source-lock). No REAL tenant mutation.

## Matrix

| Requirement | Result | Evidence |
| --- | --- | --- |
| `Owner` roleKey without `people.admin` cannot people-admin | **PASS** | `workforce-adversarial-access.test.ts` — `SuspendMember` → `PERMISSION_DENIED`; `memberHasScope` false |
| `Gerente` roleKey without `people.admin` cannot people-admin | **PASS** | Same test loop |
| `people.admin` may admin regardless of title/cargo strings on same member | **PASS** | `titledAdmin` holds `people.admin` + `Jefe Comercial` / `Gerencia`; `SuspendMember` succeeds |
| Cargo/title strings grant zero authority | **PASS** | `computeEffectiveScopes` + `memberHasScope` false for `people.admin` and `commercial.team.read` |
| `system.admin` does not imply `people.admin` | **PASS** | `scopeImplies` false; `operations-scopes.ts` identity rule source-lock; existing `system-admin-affordance.test.ts`, `operations-scopes.test.ts`, `trusted-member-context.test.ts` |
| Unauthorized cannot `ReassignWork` | **PASS** | `reassign-work-attribution.test.ts`; `auth-query-tenant.test.ts` |
| Unauthorized cannot `TerminateMember` | **PASS** | `workforce-tenant-predicates.test.ts` (sales_rep); adversarial Owner/Gerente cases |
| Termination fails with open responsibilities | **PASS** | `workforce-adversarial-access.test.ts` (open work item); `termination-preflight.test.ts` (commercial blockers) |
| Historical attribution not rewritten on `ReassignWork` | **PASS** | `reassign-work-attribution.test.ts` — two ownership rows; original `changedByMemberId` preserved |
| `people.admin` directory / admin probe gated | **PASS** (pre-existing) | `member-search.adversarial.test.ts`, `member-query-service.ts` |

## New / extended test files (this agent)

1. `packages/os-workforce/src/workforce-adversarial-access.test.ts`
2. `packages/os-workforce/src/member-access-history.test.ts`
3. `packages/os-work/src/reassign-work-attribution.test.ts`

## Commands

```bash
cd /Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate
pnpm --filter @isalwa/os-workforce test
pnpm --filter @isalwa/os-work test
```

## Constraints honored

- Did **not** grant `people.admin` to Owner fixture or redesign role architecture.
- Did **not** start Issues/AI waves.
