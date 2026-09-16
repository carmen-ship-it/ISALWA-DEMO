# WAVE A — Admin Continuity Acceptance

**Date:** 2026-09-15  
**Wave:** A — Admin Continuity + Safe Termination + Reassignment + Access Truth + Ops Dual Recovery  
**Branch:** `wave-a/admin-continuity`  
**Base SHA (hosted before wave):** `1fd0167aba1633a6978058b6f0e2ba3b6eb6c749`  
**Hosted URL:** https://os-web-staging.onrender.com  
**SYNTH org:** `01M2JKF77TXMJNDTKNCYNHH9G5`  
**REAL org:** `01M2DV9F0V5DXS4G89AKF4D5SR` — **READ ONLY** this wave; no people mutations.

---

## Verdict (post independent hosted verifier)

| Gate | State |
|------|--------|
| Implementation | **IMPLEMENTED** (`b6a44f7`+) |
| Automated tests | **TESTED** |
| Integrated SHA (branch) | `941de265d8de589b25bb5225b733ac254b91ff2d` (`origin/wave-a/admin-continuity`) |
| Deployed / Hosted Wave A | **NO** — live web still `1fd0167` |
| Independent hosted BV | **CONDITIONAL** — access truth PASS; continuity E2E UNPROVEN ([receipt](wave-a-admin-continuity-2026-09-15/independent-verifier-wave-a.md)) |
| Overall Wave A | **CONDITIONAL** |

---

## Owner / people.admin / system.admin

| Item | Exact truth |
|------|-------------|
| OWNER ADMIN DENIAL | **EXPECTED** |
| w2.owner email | `w2.owner@isalwa.demo` |
| w2.owner roleKey (fixture plan) | Owner / `isalwa-manager` |
| w2.owner scopes | `management.org.read`, `system.admin` — **no** `people.admin` |
| `/administracion` gate | `probeAdminAccess` → `people.admin` / `GET /members` |
| `/sistema` gate | exact `system.admin` via `mayOpenSystemControls` |
| system.admin ⇒ people.admin | **NO** (`scopeImplies` identity-only; tests lock) |
| Wave2 SYNTH fixtures with people.admin | **NONE** |
| people.admin acceptance actor | Staging bootstrap admin (separate from Owner) **or** explicit SYNTH grant — not Owner |

Receipt: `docs/operations/wave-a-admin-continuity-2026-09-15/agent-05-owner-admin-truth.md`

---

## Termination safety model

### Preflight

| Piece | Exact |
|-------|--------|
| Collector | `collectTerminationImpact` — `packages/os-workforce/src/termination-impact.ts` |
| API | `GET /members/:memberId/termination-impact` — requires `people.admin` |
| UI | `TerminationImpactPanel` on admin member detail (`#responsabilidades`) |
| Gate | `TerminateMember` fail-closed when `!canTerminate` → `VALIDATION_FAILED` |
| Spanish UX | “No puedes finalizar este acceso todavía. Esta persona todavía tiene responsabilidades activas que deben reasignarse.” |
| Finalizar control | Disabled in UI when `terminationBlocked` |

### Categories inspected (fail-closed if count > 0)

| Key | Spanish label |
|-----|---------------|
| `open_work` | Trabajos abiertos |
| `commercial_accounts` | Cuentas comerciales |
| `open_opportunities` | Oportunidades abiertas |
| `active_quotes` | Cotizaciones activas |
| `active_orders` | Pedidos activos |
| `pending_approvals` | Aprobaciones pendientes |
| `direct_reports` | Reportes directos |
| `active_delegations` | Delegaciones activas |

### Historical attribution

- Reassignment updates **current** owner only.
- `createdByMemberId` / decision / audit / BusinessEvent history not rewritten.
- Terminate reason (optional UI) now included in `member.terminated` payload when provided.
- Suspend reason still **not** persisted in event payload (**gap**, not blocking terminate path).

---

## ReassignWork

| Item | Exact |
|------|--------|
| Command | Existing `ReassignWork` only |
| Authority | `people.admin` (`COMMAND_REQUIRED_SCOPES`) |
| Web | Admin member detail — `ReassignWorkPanel` / **Trabajo activo** |
| `/trabajo` | Still does **not** expose ReassignWork (by design this wave) |
| Hosted BV | UNPROVEN until deploy |

---

## Commercial continuity

| Entity | Active rule | Governed reassignment | Admin UI this wave |
|--------|-------------|----------------------|--------------------|
| Commercial account | `status=active` + owner | `ReassignCommercialAccountOwner` (`commercial.account.reassign`) | Existing party reassign path; people.admin alone insufficient |
| Opportunity | `status=open` | `AssignOpportunityOwner` (`people.admin` may) | `ReassignOpportunitiesPanel` on member detail |
| Quote | not `cancelled` | **FOUNDATION_GAP** — no `AssignQuoteOwner` | Block terminate; cancel or wait |
| Order | `status=open` | **FOUNDATION_GAP** — no `AssignOrderOwner` | Block terminate |

Receipt: `docs/operations/wave-a-admin-continuity-2026-09-15/agent-03-commercial-continuity.md`

---

## Approval / manager / delegation

| Concern | Exact behavior |
|---------|----------------|
| Pending assigned approver | Blocks terminate; resolve via Approve/Reject; **no** ReassignApprover |
| Manager | Optional in model; active direct reports **block** terminate; resolve via `ChangeManager` |
| Delegation FROM/TO | Active (non-expired, non-revoked) **block** terminate; resolve via `RevokeDelegation` |
| Suspend | Does **not** force reassignment |

Receipt: `docs/operations/wave-a-admin-continuity-2026-09-15/agent-04-approval-manager-delegation.md`

---

## Access history

| Item | Exact |
|------|--------|
| State | **LIVE BUT PARTIAL** (bounded projection) |
| Source | Existing BusinessEvents only (`MEMBER_ACCESS_HISTORY_EVENT_TYPES`) |
| API | `GET /members/:memberId/access-history` — `people.admin` |
| UI | `MemberAccessHistoryPanel` — capped 20 |
| Full Audit Viewer | Deferred Wave C |

---

## Role catalog

| Layer | Truth |
|-------|--------|
| Invite / ChangeRole UI | `<select>` from observed directory role keys — **no free-text field** |
| Contract | `roleKey` still free-string |
| Frozen governed enum | **FOUNDATION_GAP** — not invented from Cargo |

---

## Ops dual recovery

| Item | Exact |
|------|--------|
| Dual recovery today | **NOT EVIDENCED** |
| Checklist | `docs/operations/ISALWA_OWNER_INFRASTRUCTURE_MAP.md` + `agent-08-ops-dual-recovery.md` |
| External ownership mutated | **NO** |
| BLOCKS THIN PILOT | Second Render admin + second Supabase Auth admin (or dated owner exception) |
| BLOCKS PRODUCTION CLAIM | Company-owned accounts + billing + vault + production env (production still NOT EVIDENCED) |

---

## Migrations

**NONE.**

---

## Tests (local gate — this wave)

| Suite | Result (sample) |
|-------|-----------------|
| `@isalwa/os-contracts` | 162 pass |
| `@isalwa/os-domain` | 232 pass |
| `@isalwa/os-workforce` | 59 pass (incl. termination-preflight + adversarial) |
| `@isalwa/os-work` | 10 pass |
| `@isalwa/os-commercial` | 48 pass |
| `@isalwa/os-database` (unit) | 34 pass |
| os-web source-lock (reassign / ui-2b / follow-up / system-admin) | pass |
| typecheck/build | os-api + os-web OK |

---

## Deploy record

| Service | SHA | Deploy ID | Status |
|---------|-----|-----------|--------|
| os-web-staging | still live `1fd0167aba1633a6978058b6f0e2ba3b6eb6c749` | `dep-dakuhuad0e5s73ftrvng` | **Wave A deploy not applied** |
| os-api-staging | still live `fd06aea735fca2400956496727c3d8698f06e046` | `dep-dakm1cafngtc73atlrbg` | **Wave A deploy not applied** |

**Integrated code SHA (pushed):** `b6a44f721bff2d1360d510127571818febb3efee` on `origin/wave-a/admin-continuity`

**BLOCKED LANE:** hosted deploy  
**BLOCKER TYPE:** `HOSTED_PROOF_BLOCKED` (environment gate refused `render deploys create` for staging services without an approval card; Auto-Deploy is **OFF** on both services; branch tracked = `main`)  
**UNBLOCK REQUIREMENT:** Carmen (or authorized operator) run:

```bash
SHA=b6a44f721bff2d1360d510127571818febb3efee
# merge/cherry-pick onto main if Render requires main ancestry, then:
render deploys create srv-dajddb67bikc73bl42q0 --commit "$SHA" --wait --confirm
render deploys create srv-dajd64gae00c739gpk20 --commit "$SHA" --wait --confirm
```

Note: API service historically had migrate preDeploy; Wave A expects **no new migrations** — confirm migrate is no-op or cleared before API deploy.

Migration expected: **NONE**.

---

## Independent hosted acceptance

**Receipt:** `docs/operations/wave-a-admin-continuity-2026-09-15/independent-verifier-wave-a.md`  
**Tooling:** Playwright-core 1.51.1 + headless Google Chrome; Render CLI for SHA; cursor-ide-browser **not** used.

| Check | Result |
|-------|--------|
| Hosted SHA matches integrated | **FAIL** — web `1fd0167` / `dep-dakuhuad0e5s73ftrvng`; api `fd06aea` / `dep-dakm1cafngtc73atlrbg` |
| people.admin bootstrap credentials | **AVAILABLE** (`carmen.staging@isalwa.demo`) — reaches `/administracion` |
| people.admin: responsabilidades / ReassignWork / terminate / history | **UNPROVEN** — Wave A UI not on host |
| Non-admin `/administracion` denied | **PASS** (`w2.asesor`) |
| system.admin without people.admin — no escalation | **PASS** (`w2.owner` deny admin; `/sistema` allow) |
| Cross-tenant / SYNTH-scoped admin continuity | **UNPROVEN** hosted (bootstrap equipo looked REAL-org scoped) |
| Mobile 390 continuity usable | **UNPROVEN** |
| REAL tenant mutations | **NONE** |
| Protected seven customers | **UNCHANGED** (read-only nav only) |

---

## Remaining Wave A blockers (honest)

1. Hosted deploy + independent BV not yet done at doc write.
2. SYNTH Wave2 personas lack `people.admin` — acceptance must use bootstrap admin or explicit SYNTH grant (not Owner).
3. Quote/Order owner reassignment commands absent — terminate stays fail-closed (**FOUNDATION_GAP**).
4. No ReassignApprover — pending approvals must be decided, not reassigned.
5. Ops dual recovery not transferred — thin pilot needs exception or second admins.
6. **Customer coverage grants** (`OsCustomerCoverageGrant` primary/acting advisor) are **not** in termination preflight — a terminated member can remain sole acting advisor (**FOUNDATION_GAP**; evidence `agent-03-commercial-continuity.md`).

---

## Next Company OS wave (exact one)

**Wave B — Attention / Commitments product honesty** (or Issues Memory if Control Tower reprioritizes — do not start both). Default next from recon: **Issue Memory** only after Continuity hosted BV closes P0 admin continuity.
