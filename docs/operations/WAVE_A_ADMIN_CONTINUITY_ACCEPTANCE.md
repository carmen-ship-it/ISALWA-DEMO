# WAVE A — Admin Continuity Acceptance

**Date:** 2026-09-15 / 2026-09-16 UTC  
**Wave:** A — Admin Continuity + Safe Termination + Reassignment + Access Truth + Ops Dual Recovery + Customer Coverage Continuity  
**Branch:** `wave-a/admin-continuity`  
**Hosted URL:** https://os-web-staging.onrender.com  
**SYNTH org:** `01M2JKF77TXMJNDTKNCYNHH9G5`  
**REAL org:** `01M2DV9F0V5DXS4G89AKF4D5SR` — **READ ONLY** this wave; no people mutations.

---

## Verdict (current — post customer-coverage P0 close)

| Gate | State |
|------|--------|
| Implementation | **IMPLEMENTED** |
| Automated tests | **TESTED** (`termination-preflight` coverage cases + affected suites at commit time) |
| Exact deploy candidate | **`fc38ebe4f6a445aa1504436040aab257bbd33a4c`** |
| WEB | `fc38ebe…` / `dep-dal13ltg1s2s73ds7b5g` |
| API | `fc38ebe…` / `dep-dal13m5bedkc73as9kr0` |
| Prior continuity runtime (era B) | `a97e17e156f58648beac4c0cd78d3245cc614e85` — **PASS** ([synth close](wave-a-admin-continuity-2026-09-15/independent-verifier-wave-a-close-synth.md)) |
| Customer coverage hosted BV (era C) | **PASS** ([coverage receipt](wave-a-admin-continuity-2026-09-15/independent-verifier-wave-a-coverage.md)) |
| Access-truth | **PASS** |
| Thin-pilot recovery A/B | **SATISFIED BY DATED OWNER EXCEPTION** — Option B signed 2026-09-16 → 2026-09-30 ([thin-pilot-recovery-decision.md](wave-a-admin-continuity-2026-09-15/thin-pilot-recovery-decision.md)) |
| Option A dual recovery | **NOT DONE** |
| Option B dated exception | **SIGNED** (start 2026-09-16 / expiry 2026-09-30) |
| Production recovery / ownership | **NOT SATISFIED** |
| Overall Wave A **technical** close | **PASS** |
| Wave B precondition | **SATISFIED** |
| Wave B | **NOT STARTED** (precondition met; await Wave B prompt) |

---

## Evidence eras (do not collapse)

### A — PRE-DEPLOY / EARLIER VERIFIER (historical only)

Receipt: [independent-verifier-wave-a.md](wave-a-admin-continuity-2026-09-15/independent-verifier-wave-a.md)

At that time (stale relative to current hosted runtime):

| Item | Historical state |
|------|------------------|
| Hosted SHA | Often still `1fd0167` or pre-`a97e17e` |
| SYNTH-scoped people.admin | **BLOCKED / UNPROVEN** |
| ReassignWork → terminate → history | **UNPROVEN** |
| Access-truth (system.admin ≠ people.admin; owner deny) | Already **PASS** |

**Label:** PRE-DEPLOY / EARLIER VERIFIER. **Superseded** for continuity mutations. Keep as history only — do not treat as current verdict.

### B — POST-DEPLOY CONTINUITY VERIFIER @ `a97e17e`

Receipt: [independent-verifier-wave-a-close-synth.md](wave-a-admin-continuity-2026-09-15/independent-verifier-wave-a-close-synth.md)

| Item | State |
|------|-------|
| Hosted SHA | `a97e17e` web `dep-dal04ie7bikc73dt380g` + api `dep-dal051740ujc7392vvr0` |
| Actor | `w2.people-admin@isalwa.demo` on SYNTH only |
| Continuity matrix (work reassign, terminate, blockers, mobile, cross-tenant, REAL none) | **PASS** |
| Quote/order/approver reassignment commands | Still **FOUNDATION_GAP** (fail-closed; not invented) |

### C — CUSTOMER COVERAGE P0 @ `fc38ebe` (current final for this hole)

Receipt: [independent-verifier-wave-a-coverage.md](wave-a-admin-continuity-2026-09-15/independent-verifier-wave-a-coverage.md)

| Item | State |
|------|-------|
| Hosted SHA | **`fc38ebe`** web `dep-dal13ltg1s2s73ds7b5g` + api `dep-dal13m5bedkc73as9kr0` |
| Model | `OsCustomerCoverageGrant` (≠ `CommercialAccount.ownerMemberId`) |
| Preflight categories | `primary_customer_coverage` / `acting_customer_coverage` |
| Resolution command | **NONE** — **FOUNDATION_GAP** |
| Fail-closed while active holder | **PASS** (hosted) |
| people.admin may resolve coverage? | **NO** |
| Expired/revoked | Do **not** block — **PASS** |
| Terminate after coverage resolved (fixture revoke stand-in) | **PASS** |
| History retained | **PASS** (grant rows kept with `revokedAt`; access-history after terminate) |
| REAL / protected seven | **UNCHANGED** |

---

## Owner / people.admin / system.admin

| Item | Exact truth |
|------|-------------|
| OWNER ADMIN DENIAL | **EXPECTED** |
| w2.owner scopes | `management.org.read`, `system.admin` — **no** `people.admin` |
| `/administracion` gate | `people.admin` |
| system.admin ⇒ people.admin | **NO** |
| SYNTH people.admin acceptance actor | `w2.people-admin@isalwa.demo` (explicit SYNTH grant; not Owner; not REAL bootstrap) |

---

## Termination safety model

### Preflight

| Piece | Exact |
|-------|--------|
| Collector | `collectTerminationImpact` |
| API | `GET /members/:memberId/termination-impact` — `people.admin` |
| Gate | `TerminateMember` fail-closed when `!canTerminate` |

### Categories (fail-closed if count > 0)

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
| `primary_customer_coverage` | Clientes bajo su responsabilidad |
| `acting_customer_coverage` | Cobertura temporal activa |

### Customer coverage model (canonical)

| Item | Exact |
|------|--------|
| Table | `OsCustomerCoverageGrant` |
| Primary | `primaryOwnerMemberId` — responsable principal for customer party |
| Acting | `actingAdvisorMemberId` — temporary coverer (≠ primary) |
| Active | `revokedAt` null ∧ `startsAt ≤ asOf` ∧ (`endsAt` null ∨ `endsAt > asOf`) ∧ grantType `commercial.customer.coverage` |
| Tenant / member / party | `organizationId` + member ids + `customerPartyId` |
| Distinct from | `OsCommercialAccount.ownerMemberId` |
| Authority to mutate | **NONE productized** — no Grant/Revoke/ReplaceCoverage command |
| people.admin may resolve? | **NO** |
| Terminate while active holder | **BLOCKED** (fail-closed) |
| Expired/revoked | Do **not** block |
| Migration this pass | **NONE** |

---

## Commercial continuity

| Entity | Governed reassignment | Admin UI |
|--------|----------------------|----------|
| Commercial account | `ReassignCommercialAccountOwner` (`commercial.account.reassign`) | Continuidad comercial |
| Opportunity | `AssignOpportunityOwner` | Reasignar oportunidades |
| Quote / Order | **FOUNDATION_GAP** / operational completeness | Fail-closed copy |
| Approver | **FOUNDATION_GAP** | Fail-closed |
| Customer coverage | **FOUNDATION_GAP** | Fail-closed Spanish + Continuidad comercial listing |

---

## Thin-pilot recovery

| Option | State |
|--------|--------|
| A — Dual recovery | **NOT DONE** |
| B — Dated owner exception | **SIGNED** (2026-09-16 → 2026-09-30) |
| Thin-pilot recovery gate | **SATISFIED BY DATED OWNER EXCEPTION** |
| Production recovery / ownership | **NOT SATISFIED** |
| Wave B precondition | **SATISFIED** |

---

## Remaining honest gaps (not Wave A continuity technical blockers)

1. Quote/Order owner reassignment — operational completeness / future foundation gap (fail-closed).
2. ReassignApprover — future foundation gap (fail-closed via decide path).
3. Coverage **resolution** command — still FOUNDATION_GAP; **preflight closes the safety hole**.
4. Dual recovery (Option A) and production ownership — still required before production-ready claim; Option B expires 2026-09-30.

---

## Next Company OS wave

Wave A **technical** close **PASS** at `fc38ebe`.  
Wave B precondition **SATISFIED** by signed Option B. Await Wave B implementation prompt.
