# Independent hosted verifier — Wave A CLOSE (SYNTH people.admin continuity)

**Date:** 2026-09-15 (session UTC ~2026-09-16T03:19–03:28)  
**Role:** Independent hosted verifier (receipt only)  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Host:** https://os-web-staging.onrender.com  
**API:** https://os-api-staging.onrender.com  

## Exact deploy candidate (ONE SHA)

`a97e17e156f58648beac4c0cd78d3245cc614e85`

### Git relationship (proven)

```
b6a44f7  feat(admin): Wave A termination preflight, ReassignWork UI, access truth   ← feature runtime
   ↓
941de26  docs(ops): record Wave A deploy blocker and live SHA gap                   ← docs only
   ↓
bf8c0d9  docs(ops): record Wave A independent hosted verifier CONDITIONAL           ← docs acceptance head
   ↓
a97e17e  fix(os-web): clarify split-authority termination resolution paths          ← ONE runtime SHA
   ↓
eb84c9b / 342dc46  docs after deploy (no runtime delta)
```

| Ref | Role | Contains all Wave A runtime? |
| --- | --- | --- |
| `b6a44f7` | Feature runtime | YES (base) — missing split-authority UX fix |
| `941de265` | Reported integrated | Docs only after `b6a44f7` |
| `bf8c0d9` | Docs/acceptance head | Docs only; ancestor of `a97e17e` |
| **`a97e17e`** | **Deploy candidate** | **YES — all intended Wave A runtime** |

Do **not** deploy `b6a44f7+` as an ambiguous target.

## Hosted SHAs

| Service | Deploy ID | Commit | Match |
| --- | --- | --- | --- |
| os-web-staging | `dep-dal04ie7bikc73dt380g` | `a97e17e…` | **PASS** |
| os-api-staging | `dep-dal051740ujc7392vvr0` | `a97e17e…` | **PASS** |

Auto-Deploy: **OFF** (web + api). PreDeployCommand: blank / none. No redeploy this close pass (already live at candidate).

## WEB / API delta (vs prior host base `1fd0167`)

| Lane | Changed? | Evidence |
| --- | --- | --- |
| WEB | **YES** | 19 files / +1123/−13 under `apps/os-web` |
| API + packages | **YES** | 15 files / +1688/−16 (`members.controller`, `os-workforce` termination-impact/access-history, contracts, prisma store, tests) |

Docs after `a97e17e` do not change runtime.

## Predeploy gate

| Suite | Result |
| --- | --- |
| `@isalwa/os-contracts` | **162 PASS** |
| `@isalwa/os-workforce` | **59 PASS** |
| `@isalwa/os-work` | **12 PASS** |
| `staging-wave2-role-fixtures.test.ts` | **28 PASS** (allowlist 17) |
| web continuity + ReassignWork admin tests | **9 PASS** |
| Health `/v1/health` + `/v1/health/ready` | **200** |

## SYNTH people.admin acceptance actor

| Field | Value |
| --- | --- |
| Email | `w2.people-admin@isalwa.demo` |
| Org | `01M2JKF77TXMJNDTKNCYNHH9G5` (**SYNTH**) |
| Member ID | `5ba6994c-cc54-4820-88de-7d626bb4070b` |
| Scopes | `people.admin` **only** (no `commercial.account.reassign`) |
| Fixture tool | `packages/os-database/src/staging-wave-a-synth-continuity.ts` |
| Receipt | `~/.isalwa-secrets/isalwa-os-staging-wave-a-continuity.json` (no passwords in this doc) |

## Browser matrix (Playwright Chrome headless)

Artifact: `~/.isalwa-secrets/_verifier-wave-a-synth-continuity-out/wave-a-synth-continuity-report.json`

| Line | Verdict |
| --- | --- |
| Employee detail | **PASS** |
| Responsibility preflight | **PASS** |
| Blocked termination | **PASS** |
| ReassignWork | **PASS** |
| Refreshed preflight | **PASS** |
| Successful termination after blockers resolve | **PASS** |
| Historical attribution | **PASS** |
| Commercial / opportunity blockers | **PASS** |
| Quote / order fail-closed | **N/A_SYNTH_NO_ACTIVE** (no active quote/order on SYNTH fixture; UI copy present; prior REAL probe had quotes>0 fail-closed) |
| Approval blocker | **PASS** |
| Direct-report blocker | **PASS** |
| Delegation blocker | **PASS** |
| Access history | **PASS** |
| system.admin / people.admin separation | **PASS** (w2.owner `/administracion` deny; owner termination-impact **403**) |
| Cross-tenant denial | **PASS** |
| Mobile 390 admin workflow | **PASS** |
| Split-authority UX (commercial blocker people.admin cannot resolve) | **PASS** — Spanish: permiso comercial distinto + pedir a quien administra cuentas; **no** capability-key leak; **no** implied commercial grant |
| REAL tenant mutations | **NONE** |
| Protected seven active customers | **UNCHANGED** (count **7**; REAL parties **18**; REAL members **3**) |

## Independent verifier access-truth (accepted prior; still holds)

- `system.admin ≠ people.admin`: **PASS**
- `w2.owner` `/administracion` deny: **EXPECTED**
- Onboarding isolation: already **PASS**

## Thin-pilot recovery

Still **CARMEN DECISION** — Option A incomplete / Option B unsigned (`thin-pilot-recovery-decision.md`). Not claimed closed by engineering.

## Wave B

**NOT STARTED.** STOP after this receipt.
