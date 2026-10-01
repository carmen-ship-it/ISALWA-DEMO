# ADR-0007 — OS finance authority boundary and projections

**Status:** Accepted (architecture) — Finance lane not implemented  
**Date:** 2026-08-23 (amended 2026-08-23 — Increment 5.1)

## Decision

1. OS is authoritative for **commercial** objects and communications.  
2. External accounting is authoritative for official invoices, GL, official AR/AP, payroll, inventory valuation when connected.  
3. OS holds **FinanceProjection** read models with source, freshness, provenance, and conflict state — not a second ledger.  
4. Integration via vendor-specific **adapters** after client validation — QuickBooks scaffold in Architect is not a product choice.  
5. Finance capability remains LOCKED until Planificación approval + data source + connection.

### Amendment (5.1): workforce and fiscal identity

- **RoleAssignment** changes (e.g. Commercial → Finance) end-date finance-sensitive permissions via effective-dated auth — not retroactive.  
- **Party fiscal identity** (NIT, razón social) changes are class **B** — may trigger reconciliation with FinanceProjection when connected.  
- Member termination revokes access to finance projections but does not alter historical audit of finance-related actions at time of action.

## Why

Commercial quote→cash eventually needs receivables and credit signals without duplicating contabilidad or fabricating balances while Finance is locked. Workforce moves must not leak finance authority or erase fiscal audit context.

## Consequence

- See `docs/architecture/FINANCE_ACCOUNTING_BOUNDARY.md` and `BOLIVIA_ACCOUNTING_DISCOVERY_MATRIX.md`.  
- Illustrative Commercial↔Finance events are architecture examples until discovery validates.

## Related

- Mission 15 W5 fiscal path  
- ADR-0004, ADR-0010  
- Planificación derive: `finance-dependency.ts`, `party-lifecycle.ts`, `workforce-lifecycle.ts`
