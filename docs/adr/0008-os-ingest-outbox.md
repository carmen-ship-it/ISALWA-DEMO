# ADR-0008 — OS ingest idempotency and transactional outbox

**Status:** Accepted (architecture) — implementation deferred  
**Date:** 2026-08-23

## Decision

1. External ingest (WhatsApp webhooks, accounting sync, Excel import) uses **idempotency keys** and external event IDs to prevent duplicate business events.  
2. Authoritative writes that must emit events use a **transactional outbox** so DB commit and event publication stay consistent.  
3. Failed downstream processing uses dead-letter + replay with audit — not silent drop.

## Why

WhatsApp duplicate webhooks, replayed payment notifications, and re-imported spreadsheet rows destroy trust if they create duplicate leads or payments.

## Consequence

- Ingest adapters are mandatory before production messaging/accounting sync.  
- Partial import batches quarantine unresolved rows.

## Related

- Planificación derive: `foundation.ts`, `identity-entry.ts`
