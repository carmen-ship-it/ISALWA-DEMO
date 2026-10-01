# ADR-0010 — OS workforce identity lifecycle

**Status:** Accepted (architecture) — implementation deferred  
**Date:** 2026-08-23  
**Supersedes:** None — extends foundation model

## Decision

Workforce identity separates:

1. **Person** — canonical human, persistent across employment periods  
2. **OrganizationMember** — tenant-scoped employment with effective-dated department, manager, employment status  
3. **AuthIdentity** — authentication credentials linked to Person  
4. **RoleAssignment**, **DepartmentAssignment**, **ManagerAssignment** — effective-dated; never silent overwrite  
5. **Delegation** — scoped, expiring grants with audit attribution (`onBehalfOf`)

Termination revokes **access** and ends employment but **does not delete** Person or historical audit. Rehire uses same Person with new membership period.

Lifecycle changes trigger governed work reassignment policies — no silent orphan WorkItems or auto-transferred approvals.

## Why

Collapsing these into one `User` table breaks rehire, historical attribution, department transfers, and handoff admin self-service.

## Consequence

- See `WORKFORCE_ORGANIZATION_LIFECYCLE.md`, `STORAGE_CONTRACT.md`, `API_SERVICE_CONTRACT.md`  
- Planificación: `workforce-lifecycle.ts`  
- ADR-0003 amended for effective-dated authorization

## Related

- ADR-0003, ADR-0005, ADR-0011
