# ADR-0009 — OS AI authority, audit, and demo isolation

**Status:** Accepted (architecture) — implementation deferred  
**Date:** 2026-08-23

## Decision

1. AI is not a second source of truth; outputs are FACT / PATTERN / CONCLUSION / RECOMMENDATION with provenance.  
2. AI may not silently merge identities, change prices, extend credit, issue fiscal documents, elevate permissions, or send external messages outside policy.  
3. AI suggestions shown to users are logged for audit when acted upon.  
4. Demo universe, simulation, and production tenant data are isolated via `dataOrigin` and tenant boundaries — demo never contaminates production truth.

## Why

Aligns Mission 15 copilot tiers with human authority. Executive simulator and demo seed must not leak into real tenant operations.

## Consequence

- Kill switches per AI tier; retrieval scoped to user authorization (ADR-0003).  
- `ws_isalwa` remains empty; OS demo org is synthetic and isolated.

## Related

- `NO_FABRICATED_CONTENT.md`  
- Planificación derive: `ai-authority.ts`, `foundation.ts`
