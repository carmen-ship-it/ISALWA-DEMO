# RC3 — Temporary coverage local / unit proof

**As of:** 2026-09-17  
**Scope:** `GrantCustomerCoverage` / `RevokeCustomerCoverage` + convert negatives (`canConvertQuoteToOrder` / `coverageAuditForConvert`).  
**Does not:** deploy, rewrite RC2 receipts, or claim hosted BV.

---

## Scoreboard

| Gate | Result | Evidence |
|---|---|---|
| **COVERAGE_GRANT_LOCAL** | **PASS** | `packages/os-commercial` Grant suite + `packages/os-contracts` authority |
| **COVERAGE_REVOKE_LOCAL** | **PASS** | `packages/os-commercial` Revoke suite |
| **COVERAGE_CANNOT_CONVERT** | **PASS** | contracts + CreateOrder coverage-deny tests |

Aliases requested in gate naming: `COVERAGE_GRANT_LOCAL` / `REVOKE` / `CANNOT_CONVERT` → all **PASS**.

---

## What was proven

### GrantCustomerCoverage (`COVERAGE_GRANT_LOCAL` = PASS)

| Requirement | Proof |
|---|---|
| Same-company helper only | Helper resolved via `getMemberInOrg`; foreign member → `NOT_FOUND` (`denies cross-company helper`) |
| Authorized Jefe/Gerencia (`commercial.account.reassign`) only | Happy path with reassign scope; Asesor scopes → `PERMISSION_DENIED` |
| Canonical owner unchanged | Assert `account.ownerMemberId` unchanged after grant; event payload keeps `primaryOwnerMemberId` |
| Coverage persisted / event | `createCustomerCoverageGrant` row + `customer_coverage.granted` event |

### RevokeCustomerCoverage (`REVOKE` = PASS)

| Requirement | Proof |
|---|---|
| Inactive after revoke | `revokedAt` set; `listActiveCustomerCoverageGrants` empty |
| Owner unchanged | `account.ownerMemberId` unchanged |
| History retained | Grant row remains in store (soft revoke); `customer_coverage.revoked` event |

### Negatives (`CANNOT_CONVERT` = PASS)

| Requirement | Proof |
|---|---|
| Asesor self-grant DENY | Grant without `commercial.account.reassign` → `PERMISSION_DENIED` |
| Cross-company helper DENY | Helper not in org → `NOT_FOUND` |
| Coverage alone does **not** grant Quote→Pedido | `canConvertQuoteToOrder` ignores coverage; `coverageAuditForConvert` may allow workflow but convert stays false; CreateOrder with active grant + no convert scope → `PERMISSION_DENIED` |

---

## Commands run (local)

```bash
# Command-layer grant/revoke + CreateOrder coverage deny
cd packages/os-commercial && node --import tsx --test src/commercial-authority.test.ts
# → 21 pass / 0 fail

# Predicate / audit contracts
cd packages/os-contracts && node --import tsx --test \
  src/commercial-coverage-authority.test.ts \
  src/commercial-authority.test.ts
# → 13 pass / 0 fail
```

---

## Test inventory (extended, not parallel)

| File | Role |
|---|---|
| `packages/os-commercial/src/commercial-authority.test.ts` | **Extended** — `GrantCustomerCoverage` / `RevokeCustomerCoverage` command suites; existing CreateOrder coverage-deny |
| `packages/os-contracts/src/commercial-coverage-authority.test.ts` | **Extended** — `coverageAuditForConvert` + convert-alone deny |
| `packages/os-contracts/src/commercial-authority.test.ts` | Existing — `does not let temporary coverage authorize convert` |

No new parallel command service or duplicate authority module.

---

## Explicit non-claims

| Claim | Status |
|---|---|
| Hosted grant/revoke BV | **UNPROVEN** (see `RC3_COVERAGE_UI_DIAGNOSIS.md` for UI harness notes) |
| Deploy / RC2 rewrite | **Not done** (per RC3 instructions) |
| HTTP runtime `commercial-runtime.test.ts` grant path | Not extended — command service is the commercial API write path under test |

---

## Verdict

Local unit/API-command proof for temporary coverage grant, revoke, and convert-separation is **PASS**. Safe for RC3 local gate item `COVERAGE_GRANT_REVOKE` unit slice; hosted proof remains separate.
