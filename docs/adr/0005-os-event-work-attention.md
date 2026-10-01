# ADR-0005 — OS event spine, work model, and attention

**Status:** Accepted (architecture) — implementation deferred  
**Date:** 2026-08-23

## Decision

1. **BusinessEvent** is append-oriented system memory (`occurredAt` vs `recordedAt`, provenance, correlation, idempotency).  
2. **WorkItem** models human obligation — distinct from events.  
3. **AttentionItem** is derived, ranked, and auto-resolves when underlying condition clears.  
4. **Notification** is sparse delivery — not every event becomes a badge.

Corrections produce new governed events; history is not silently rewritten.

## Why

Without this split, the OS becomes a notification center or conflicting activity feeds. Multi-person departments require ownership history and concurrent work on shared entities.

## Consequence

- Workflow rules: Event → context → (optional) attention → work → human action → new event.  
- Transactional outbox documented for event publication consistency (see ADR-0008).  
- `overdue_work` is still that derivation (`open` work, `dueAt < now`). Crossing `dueAt` is not a business event. A co-hosted wall-clock tick in `os-api` rebuilds the existing attention projection so overdue appears without a later mutation. No new attention type. See `docs/operations/OVERDUE_ATTENTION_CLOCK.md`.

## Related

- Mission 15 commercial timeline  
- Planificación derive: `events-work-attention.ts`
