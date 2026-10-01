# PartyGraph Lifecycle

**Status:** Increment 5.1 — architecture only  
**Related:** ADR-0004 (amended), ADR-0010, `STORAGE_CONTRACT.md`

---

## Purpose

One **canonical external-party graph** for customers, suppliers, vendors, distributors, partners, contacts, and future roles — not parallel master-data silos.

---

## Core entities

| Entity | Role |
|--------|------|
| **Party** | Canonical organization or person in business graph (`partyKind`) |
| **PartyRoleAssignment** | Effective-dated role edge: `customer`, `supplier`, `vendor`, `distributor`, `partner`, `contractor`, `logistics_provider`, `financial_counterparty`, … |
| **Contact** | Person ↔ organization Party (phone, email, WhatsApp) |
| **CommercialAccount** | Commercial **lens** on Party with `customer` role — Opportunity, Quote, Order attach here |
| **Lead** | Staging until resolution pipeline completes |
| **FiscalIdentity** | NIT, razón social — governed, effective-dated on Party |

---

## Multi-role example

```
Party "Distribuidora ABC" (organization)
  ├── PartyRoleAssignment: customer (since 2020)
  ├── PartyRoleAssignment: supplier (since 2022)
  └── PartyRoleAssignment: distributor (since 2024)
```

**One Party** — not three masters in customer DB + supplier DB + vendor DB.

---

## Person across organizations

```
Person "Juan"
  ├── Contact at Party A (supplier)
  └── Contact at Party B (customer)  — later
```

One Person; multiple Contact edges — not duplicate Person records.

---

## Lifecycle operations

| Operation | Governance | Events (illustrative) |
|-----------|------------|------------------------|
| CREATE | Admin (A) / import confirm (B) | `party.created` |
| UPDATE | Admin (A) | `party.updated` |
| DEACTIVATE | Admin (A) | `party.deactivated` — no hard delete if money history |
| REACTIVATE | Admin (A) | `party.reactivated` |
| ASSIGN ROLE | Admin (A) | `party.role.assigned` |
| END ROLE | Admin (A/B) | `party.role.ended` |
| MERGE | Approval (B) | `party.merge.requested`, `party.merged` |
| FISCAL CHANGE | Approval (B) | `party.fiscal_identity.changed` |
| CONTACT UPDATE | Admin (A) | `contact.updated` |

---

## Merge governance (ADR-0004 — unchanged)

- Match candidates → confidence → human confirm/approve  
- **No silent merge** especially with receivables, open quotes, or fiscal history  
- Merge produces lineage: `mergedFromPartyId`, audit snapshot  

---

## Commercial integration

- `CommercialAccount.partyId` → canonical Party  
- WhatsApp/email ingest resolves to Contact → Party — not inbox-only contacts  
- Lead resolves to Party + optional CommercialAccount creation  

---

## Finance integration (Finance LOCKED)

- Fiscal fields on Party may **conflict** with external accounting projection → reconciliation attention  
- OS does not invent official invoice or AR balance on Party create  

---

## Not in scope

Separate CRM customer table, separate supplier ERP table, separate vendor list without Party linkage.
