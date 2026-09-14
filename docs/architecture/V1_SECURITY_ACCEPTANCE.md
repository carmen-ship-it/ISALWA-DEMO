# V1 Security Acceptance Matrix

Adversarial acceptance for local + hosted. Complements `docs/SECURITY_POSTURE.md` and ADRs 0003–0009.

Deploy/migrate out of scope this pass.

Denied write must yield: no mutation · no partial mutation · no success business event · no success outbox event · no existence leakage where contract requires not-found equivalence.

---

## Tenant / IDOR

| ID | Case | Expected | State |
|---|---|---|---|
| SEC-T-01 | Foreign tenant exact id | Deny / not-found equivalence | TESTED delivery isolation; HOSTED U |
| SEC-T-02 | Foreign tenant search | No rows / no leakage | PLANNED hosted |
| SEC-T-03 | Autocomplete leakage | No foreign labels | PLANNED hosted |
| SEC-T-04 | Counts / aggregates | Tenant-scoped | PLANNED hosted |
| SEC-T-05 | Map points / labels / clusters | Tenant-scoped or UNPROVEN | PLANNED; map may be provider-blocked |
| SEC-T-06 | Recent items / quick views | Tenant-scoped | PLANNED hosted |
| SEC-T-07 | Direct URLs / copied IDs | Fail closed | PLANNED hosted |
| SEC-T-08 | Document number as privilege | External # is evidence not auth | TESTED intent |

## Client authority forgery

| ID | Case | Expected | State |
|---|---|---|---|
| SEC-C-01 | Client organization header | Ignored as authority | TESTED prior Gate A |
| SEC-C-02 | Client scopes array | Ignored as authority | TESTED prior Gate A |
| SEC-C-03 | Foreign selector in multi-membership | No silent switch without governed selector | PLANNED hosted |
| SEC-C-04 | Multi-membership with no selector | Safe deny or explicit choose | PLANNED hosted |

## Member lifecycle

| ID | Case | Expected | State |
|---|---|---|---|
| SEC-M-01 | Inactive Member | No write | TESTED prior |
| SEC-M-02 | Suspended Member | No write; open work policy per Step 14.5 | TESTED prior |
| SEC-M-03 | Terminated Member | No session authority | TESTED prior J12 |

## Capability boundaries

| ID | Case | Expected | State |
|---|---|---|---|
| SEC-A-01 | Read scope attempting write | Deny; no mutation | TESTED patterns |
| SEC-A-02 | Receive attempting allocate | Deny allocate | TESTED Listo semantics |
| SEC-A-03 | Management read attempting mutation | Deny | TESTED reader gate |
| SEC-A-04 | people.admin attempting business-manager shortcut | Deny business mutate | POLICY + prior boundary |
| SEC-A-05 | Cargo/title without capability | Deny | POLICY |
| SEC-A-06 | Coordination prior-decision read | Blocked until authority decided | CROSS_LANE |

## Payment / document

| ID | Case | Expected | State |
|---|---|---|---|
| SEC-P-01 | Caja receipt confirms ledger | Refused | TESTED |
| SEC-P-02 | Invented document numbering | Refused | TESTED |
| SEC-P-03 | Signature reference as auth token | Not accepted as session | POLICY |

## UI Guided

| ID | Case | Expected | State |
|---|---|---|---|
| SEC-U-01 | Guided step without capability | Blocked | PLANNED hosted |
| SEC-U-02 | UNPROVEN rendered as PASS | Forbidden | POLICY |

**Case count:** 24.

Stop-the-build only for tenant isolation, identity integrity, destructive loss, canonical truth corruption, irreconcilable schema conflict, secret exposure, unauthorized production action.
