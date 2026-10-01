# ADR-0012 — OS foundation reconciliation (legacy vs new spine)

**Status:** Accepted (architecture) — implementation begins Step 10  
**Date:** 2026-08-23  
**Supersedes:** None — resolves Increment 7 FG-01, FG-02, FG-03

## Decision

1. **Strategy B:** New OS foundation packages (`packages/os-*`) with separate schema ownership — **not** in-place transformation of `packages/database/prisma/schema.prisma`.
2. **Legacy freeze:** `packages/database`, demo `apps/api`, `apps/web` — maintenance only until Step 16 Commercial v1 migrates to foundation spine.
3. **BusinessEvent** is the single authoritative event spine; **ActivityEvent** is legacy retirement (demo commercial timeline only until Step 16).
4. **Territory** is organizational scope (Lane A config, B auth, G commercial) — not Party identity; client org tree remains discovery (RD-04).
5. **Credentials** live in auth provider; OS owns Person, OrganizationMember, AuthIdentity link — not password hashes in target model.

## Why

Repository evidence shows collapsed `User`/`Account`/`Invoice`/`ActivityEvent` in implemented demo code with no OS auth middleware. In-place migration would break demo and duplicate identity/event authority. Progressive foundation preserves demo while building correct spine.

## Consequence

- See `STEP_9_SHARED_CONTRACTS_SPEC.md` and `shared-contracts.yaml`.
- Foundation agents **must not** extend legacy `packages/database` for OS entities.
- Step 10 begins with `packages/os-contracts` + `packages/os-database` — not Prisma edits to legacy schema.

## Related

- Increment 7 `INCREMENT_7_ARCHITECTURE_CHALLENGE.md`
- ADR-0008 (outbox), ADR-0010 (workforce), ADR-0004 (party)
- `ARCHITECTURE_EVIDENCE_REGISTER.md`
