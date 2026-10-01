# ADR-0011 — OS admin self-service vs engineering boundary

**Status:** Accepted (architecture) — implementation deferred  
**Date:** 2026-08-23

## Decision

After handoff, ISALWA **authorized administrators** perform normal organizational and master-data administration (class **A**, and **B** where policy requires approval) through governed **commands** — not by engineering or direct database access.

Engineering (**C**) and external integration owners (**D**) handle: new capabilities, schema evolution, new integration adapter types, infrastructure, and security-model changes.

Admin commands remain: tenant-scoped, least-privilege, validated, audited, and event-backed. Admin self-service **does not** bypass RBAC.

Administrative scopes (e.g. `people.admin`, `master_data.admin`, `fiscal.admin`) gate commands — final role names require client validation.

## Why

Without this boundary, every hire, supplier, or department change becomes a Carmen/engineering ticket — the OS fails as an operating system for the client.

## Consequence

- See `ADMIN_SELF_SERVICE_BOUNDARY.md`  
- Handoff manifest (Increment 6) must encode admin command surface  
- Planificación: `admin-governance.ts`

## Related

- ADR-0003, ADR-0010, `API_SERVICE_CONTRACT.md`
