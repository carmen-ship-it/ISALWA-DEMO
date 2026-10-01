# ADR-0006 — OS capability activation registry

**Status:** Accepted (architecture) — implementation deferred  
**Date:** 2026-08-23

## Decision

Every department capability (Commercial, Finance, Warehouse, Operations, …) has explicit lifecycle state: `LOCKED` → `APPROVED` → `CONNECTING` → `ACTIVE` → `DEGRADED`. Command Center, AI department summaries, workflows, and reports must respect capability state. LOCKED capabilities display honest disconnected state — never fabricated KPIs, activity, or cross-department insights.

## Why

The Command Center principle requires capability-aware front door. Commercial-first does not mean pretending Finance or Warehouse are operational.

## Consequence

- Planificación approvals gate activation requirements.  
- Feature flags and registry align with handoff manifest (Increment 6).  
- Cross-department dependencies check target capability before authoritative facts.

## Related

- Planificación `command-center.ts`, `finance-dependency.ts`  
- `docs/architecture/CROSS_DEPARTMENT_DEPENDENCIES.md`
