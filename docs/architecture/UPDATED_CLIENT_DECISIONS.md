# Updated Client Decisions

**Increment:** 7  
**Status:** Tracks open decisions — **no fabricated ISALWA facts**  
**Updates:** RD-01, RD-02, RD-03 from Increment 6 audit + new discovery items

---

## Decision register

| ID | Topic | Current status | Can implement with placeholder? | Placeholder strategy | Blocking gate |
|----|-------|----------------|--------------------------------|----------------------|---------------|
| **RD-01** | Admin role names | REQUIRES_CLIENT_CONFIRMATION | **YES** for steps 10–13 | Configurable scope keys (`people.admin`, `master_data.admin`, `fiscal.admin`, `org.admin`, `integration.admin`) with ISALWA-editable display labels in org settings | Step 16 if admin UI labels wrong |
| **RD-02** | Approval thresholds | REQUIRES_CLIENT_CONFIRMATION | **PARTIAL** | Architecture supports class B approvals; threshold **values** stored as governed config post-discovery | Commercial credit/discount/merge UX |
| **RD-03** | Accounting provider | REQUIRES_CLIENT_CONFIRMATION | **YES** | Finance **LOCKED**; `IntegrationConnection` + adapter interface; no vendor in code | Step 19 only |

---

## RD-01 — Admin role names

### What architecture already requires (APPROVED)

- Administrative **scopes** gate commands — not UI labels (`ADR-0011`, `ADMIN_SELF_SERVICE_BOUNDARY.md`).  
- Admin commands: tenant-scoped, audited, event-backed.  
- Proposed scope keys in manifest YAML — not validated names.

### What can remain configurable

| Configurable at runtime | Fixed in architecture |
|-------------------------|----------------------|
| Role display names ("Gerente Comercial", "Administrador") | Scope key enum + permission mapping table |
| Which scopes attach to which role templates | Command → required scope mapping |
| Number of admins holding `people.admin` | Separation: admin cannot self-grant `fiscal.admin` without policy |

### Blocking dependency?

**No** for foundation steps 10–13. **Yes** for polished admin UX and client sign-off on who is admin — discovery question A-01, H-01.

### Do not manufacture

Exact Spanish role titles for ISALWA org chart.

---

## RD-02 — Approval thresholds

### What architecture already requires (APPROVED)

- Class **B** for merge, NIT, credit limit, payment terms, finance-sensitive role changes.  
- `ApprovalRequest` immutable outcome; no auto-transfer on approver termination.  
- Illustrative Commercial↔Finance flows marked **examples** in `FINANCE_ACCOUNTING_BOUNDARY.md`.

### What can remain configurable

| Safe placeholder | Needs client before Commercial features |
|------------------|----------------------------------------|
| Approval **machinery** (RequestApproval, Approve, Reject) | Discount % requiring director approval |
| Generic "requires approval" flags on commands | Credit limit numeric thresholds |
| Merge always class B | Payment terms change authority |
| Credit hold from projection when Finance ACTIVE | Who is backup approver per type |

### Blocking dependency?

**No** for foundation. **Yes** before Commercial v1 ships credit-sensitive quote blocking and merge UX — discovery A-04, M-07, F-07.

### Do not manufacture

ISALWA's actual approval matrix.

---

## RD-03 — Accounting provider

### What architecture already requires (APPROVED)

- External accounting authoritative for GL, official invoice, official AR/AP when connected.  
- OS holds `FinanceProjection` only — no second ledger (`ADR-0007`).  
- QuickBooks = scaffold only (`BOLIVIA_ACCOUNTING_DISCOVERY_MATRIX.md`).  
- Adapter pattern; Excel/CSV fallback; reconciliation WorkItems.

### What can remain configurable

| Safe during steps 10–18 | Blocked until client answers |
|-------------------------|------------------------------|
| Entire Finance lane LOCKED | Vendor-specific adapter code |
| `invoice.requested` → attention only | Live accounting sync |
| FinanceProjection schema with `source`, `conflictState` | Bolivia fiscal field mapping |
| Mock finance projection in dev | Production credential connect |

### Blocking dependency?

**No** for foundation through Commercial v1 (without live AR). **Yes** for step 19 finance adapter and any UI showing verified balances.

### Do not manufacture

ISALWA uses QuickBooks, Odoo, or any specific Bolivian product.

---

## New decisions surfaced in Increment 7

| ID | Topic | Classification | Gate | Notes |
|----|-------|----------------|------|-------|
| **RD-04** | Territory model for sales scope | REQUIRES_CLIENT_CONFIRMATION | BEFORE COMMERCIAL | Legacy Prisma `Territory`; not in handoff spine — see FG-02 |
| **RD-05** | Legacy schema migration vs parallel foundation | ENGINEERING DECISION | BEFORE STEP 9 | FG-01 — not client but blocks agents |
| **RD-06** | Email/password self-service policy | REQUIRES_CLIENT_CONFIRMATION | BEFORE FOUNDATION | EMP mentions Auth.js; OS lifecycle doc thin |
| **RD-07** | Event catalog migration ActivityEvent → BusinessEvent | ENGINEERING DECISION | BEFORE STEP 11 | FG-03 |

---

## Client decision workflow

1. Capture answers in Planificación client questions (existing derive surfaces gaps).  
2. Mark items `aprobado` only with evidence — ADR-A2 evidence-first.  
3. Update `handoff-manifest.yaml` `requires_decision` entries when validated.  
4. New ADR only if answer **changes** approved architecture — not for config values.

---

## Summary

| Decision | Proceed with placeholders? |
|----------|---------------------------|
| RD-01 | Yes (scope keys) |
| RD-02 | Partial (machinery yes, thresholds no for Commercial credit) |
| RD-03 | Yes (LOCKED + interface) |
| RD-04 | Defer territory detail; need direction before Commercial |
| RD-05 | Engineering — must resolve at step 9 spec |
| RD-06 | Need policy before auth implementation |
| RD-07 | Engineering — must resolve at step 11 |
