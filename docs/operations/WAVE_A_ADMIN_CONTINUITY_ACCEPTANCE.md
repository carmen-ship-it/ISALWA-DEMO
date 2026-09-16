# WAVE A — Admin Continuity Acceptance

**Date:** 2026-09-15 / 2026-09-16 UTC  
**Wave:** A — Admin Continuity + Safe Termination + Reassignment + Access Truth + Ops Dual Recovery + Customer Coverage Continuity  
**Branch:** `wave-a/admin-continuity`  
**Base SHA (hosted before wave):** `1fd0167aba1633a6978058b6f0e2ba3b6eb6c749`  
**Hosted URL:** https://os-web-staging.onrender.com  
**SYNTH org:** `01M2JKF77TXMJNDTKNCYNHH9G5`  
**REAL org:** `01M2DV9F0V5DXS4G89AKF4D5SR` — **READ ONLY** this wave; no people mutations.

---

## Verdict (current — post customer-coverage P0 close)

| Gate | State |
|------|--------|
| Implementation | **IMPLEMENTED** (coverage categories on termination impact + prior Wave A runtime) |
| Automated tests | **TESTED** |
| Exact deploy candidate | *(set at deploy — see close receipt)* |
| Prior continuity runtime | `a97e17e156f58648beac4c0cd78d3245cc614e85` (hosted before this coverage pass) |
| Independent hosted BV (continuity @ `a97e17e`) | **PASS** — SYNTH `w2.people-admin` ([synth close receipt](wave-a-admin-continuity-2026-09-15/independent-verifier-wave-a-close-synth.md)) |
| Customer coverage in preflight | **IMPLEMENTED** — awaiting this-pass deploy + BV |
| Access-truth | **PASS** |
| Thin-pilot recovery A/B | **OPEN** — Carmen decision (`thin-pilot-recovery-decision.md`) |
| Overall Wave A technical close | **CONDITIONAL** until coverage deploy + hosted BV land |
| Wave B | **NOT STARTED** |

---

## Evidence eras (do not collapse)

### A — PRE-DEPLOY / EARLIER VERIFIER (historical)

Receipt: [independent-verifier-wave-a.md](wave-a-admin-continuity-2026-09-15/independent-verifier-wave-a.md) and early close attempt notes.

At that time:

| Item | Historical state |
|------|------------------|
| Hosted SHA | Often still `1fd0167` or pre-`a97e17e` |
| SYNTH-scoped people.admin | **BLOCKED / UNPROVEN** |
| ReassignWork → terminate → history | **UNPROVEN** |
| Access-truth (system.admin ≠ people.admin; owner deny) | Already **PASS** |

This era is **superseded** for continuity mutations. Keep as history only.

### B — CURRENT POST-DEPLOY FINAL VERIFIER (continuity @ `a97e17e`)

Receipt: [independent-verifier-wave-a-close-synth.md](wave-a-admin-continuity-2026-09-15/independent-verifier-wave-a-close-synth.md)

| Item | Current state |
|------|---------------|
| Hosted SHA | `a97e17e` web + api |
| Actor | `w2.people-admin@isalwa.demo` on SYNTH only |
| Continuity matrix (work reassign, terminate, blockers, mobile, cross-tenant, REAL none) | **PASS** |
| Quote/order/approver reassignment commands | Still **FOUNDATION_GAP** (fail-closed; not invented) |

### C — CUSTOMER COVERAGE P0 (this pass)

Extends termination impact with `primary_customer_coverage` / `acting_customer_coverage`. Resolution command = **NONE** (**FOUNDATION_GAP**). Fail-closed required. Hosted BV for coverage follows deploy of this pass’s candidate SHA.

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
| Primary | `primaryOwnerMemberId` — responsible principal for customer party |
| Acting | `actingAdvisorMemberId` — temporary coverer (≠ primary) |
| Active | `revokedAt` null ∧ `startsAt ≤ asOf` ∧ (`endsAt` null ∨ `endsAt > asOf`) ∧ grantType `commercial.customer.coverage` |
| Distinct from | `OsCommercialAccount.ownerMemberId` |
| Authority to mutate | **NONE productized** — no Grant/Revoke/ReplaceCoverage command |
| people.admin may resolve? | **NO** |
| Terminate while active holder | **BLOCKED** (fail-closed) |
| Expired/revoked | Do **not** block |

---

## Commercial continuity

| Entity | Governed reassignment | Admin UI |
|--------|----------------------|----------|
| Commercial account | `ReassignCommercialAccountOwner` (`commercial.account.reassign`) | Continuidad comercial |
| Opportunity | `AssignOpportunityOwner` | Reasignar oportunidades |
| Quote / Order | **FOUNDATION_GAP** | Fail-closed copy |
| Customer coverage | **FOUNDATION_GAP** | Fail-closed Spanish + Continuidad comercial listing |

---

## Thin-pilot recovery

| Option | State |
|--------|--------|
| A — Dual recovery | **NOT DONE** |
| B — Dated owner exception | **UNSIGNED** |

Engineering does not choose for Carmen.

---

## Remaining honest gaps (not Wave A continuity blockers once coverage BV passes)

1. Quote/Order owner reassignment — operational completeness / future foundation gap (fail-closed).
2. ReassignApprover — future foundation gap (fail-closed via decide path).
3. Coverage **resolution** command — still FOUNDATION_GAP; preflight closes the safety hole.
4. Thin-pilot recovery A or B — Carmen only.

---

## Next Company OS wave

**Do not start Wave B** until Carmen recovery decision + this coverage pass hosted BV close.
