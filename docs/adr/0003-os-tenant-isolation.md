# ADR-0003 — OS tenant isolation and authorization boundary

**Status:** Accepted (architecture) — implementation deferred  
**Date:** 2026-08-23 (amended 2026-08-23 — Increment 5.1)  
**Scope:** ISALWA OS foundation (not Architect app alone)

## Decision

Every operational record in ISALWA OS belongs to exactly one `Organization` (tenant) via `organizationId`. Authorization combines RBAC capabilities with scopes (department, team, territory, ownership). Field-level masking applies to sensitive data (NIT, margin, credit, message bodies). AI retrieval and tools execute **only** within the requesting user's authorization boundary.

### Amendment (5.1): effective-dated authorization

- **RoleAssignment**, **DepartmentAssignment**, and **Delegation** are effective-dated.  
- Authorization at time `T` uses assignments valid at `T` — historical reports use `occurredAt`, not current role.  
- **Administrative scopes** gate admin commands (see ADR-0011).  
- **Delegation** expires automatically; expired grants are excluded from auth projection.  
- **accessStatus** revocation (termination/suspension) immediately ends session eligibility without deleting Person or audit history.

## Why

Commercial-first V1 may serve one real company, but tenant isolation is non-negotiable for security, diligence, and future multi-company product. AI must not become a backdoor around RBAC. Department transfers must not rewrite who was authorized when past actions occurred.

## Consequence

- All tenant tables include `organizationId`; APIs enforce tenant first.  
- Consultant/break-glass access is time-boxed and audited — not permanent super-user.  
- Architect pilot (`ws_isalwa`) remains separate from OS production tenant.  
- Query API supports `asOf` for effective-dated auth replay.

## Related

- `docs/architecture/ISALWA_OS_FOUNDATION_SPEC.md`  
- `WORKFORCE_ORGANIZATION_LIFECYCLE.md`  
- `docs/SECURITY_POSTURE.md`  
- ADR-0010, ADR-0011  
- Planificación derive: `foundation.ts`, `workforce-lifecycle.ts`, `admin-governance.ts`
