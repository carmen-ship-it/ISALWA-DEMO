# ADR-0004 — OS party graph and identity merge governance

**Status:** Accepted (architecture) — implementation deferred  
**Date:** 2026-08-23 (amended 2026-08-23 — Increment 5.1)

## Decision

Canonical external identity uses a **unified PartyGraph**:

- **Party** (organization or person)  
- **PartyRoleAssignment** (effective-dated: customer, supplier, vendor, distributor, partner, contractor, logistics_provider, financial_counterparty, …)  
- **Contact** (person ↔ organization party)  
- **CommercialAccount** as commercial lens on Party with customer role  
- **Lead** as staging until resolution  

One legal entity may hold **multiple roles** on the **same Party** — not separate customer/supplier/vendor master silos.

All entry channels converge on one resolution pipeline: match candidates → confidence → human confirmation or approval → canonical record. Identity merges and splits are audited events; merges involving financial history require approval, never silent auto-merge on score alone.

## Why

WhatsApp-heavy B2B distribution fails with duplicate customers across Excel, chat, and exports. Supplier and customer overlap is common in distribution — duplicate silos multiply merge risk.

## Consequence

- No per-channel customer databases.  
- `Lead` is staging until resolved — not a permanent parallel Account.  
- Purchasing/Finance future lanes reference same `partyId`.  
- See `PARTYGRAPH_LIFECYCLE.md`, `STORAGE_CONTRACT.md`  
- Planificación: `identity-entry.ts`, `party-lifecycle.ts`

## Related

- ADR-0007 (fiscal identity on Party)  
- ADR-0010 (Person vs Contact vs Party person kind)
