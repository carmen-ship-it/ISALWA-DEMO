# LANE UX-6 — Auditoría (receipt)

**STATUS: DRAFT ONLY — NOT INTEGRATED** (lane still dirty at base `1244d84`; no HEAD SHA yet)

| Field | Value |
|---|---|
| LANE | UX-6 |
| BRANCH | `ct2/lane-ux6-audit` |
| WORKTREE | `/Users/carmen/projects/isalwa/.worktrees/ct2-lane-ux6-audit` |
| BASE_SHA | `1244d84ef75142d973c8f7aa44caeadd66361768` |
| COMMIT_SHA | _(pending lane commit)_ |

## Scope delivered

- Searchable **Auditoría** with filters: Fecha (desde/hasta), Persona, Cliente, Tipo, Acción, plus free-text `q`.
- Human labels via existing `lib/audit/humanize` (server + list copy).
- **Detail drawer** (`entry` query) with before/after JSON when loaded by id.
- **Server-backed pagination** (`cursor`, `meta.hasMore`, `meta.nextCursor`) on `GET /v1/audit`.
- Optional **AI ask stub** in drawer, gated off (`AUDIT_AI_ASK_STUB_ENABLED = false`).

## Files (exclusive + additive API)

- `apps/os-web/app/(app)/auditoria/page.tsx`
- `apps/os-web/components/audit/**`
- `apps/os-web/lib/audit/**` (url-state, format-snapshot, filter-options, audit-ai-stub, types)
- `apps/os-api/src/audit.controller.ts` (pagination, search, id snapshot read)
- `apps/os-api/src/audit.controller.test.ts`

## Tests

- `apps/os-web/lib/audit/humanize.test.ts` (existing)
- `apps/os-web/lib/audit/url-state.test.ts`
- `apps/os-web/lib/audit/format-snapshot.test.ts`
- `apps/os-web/lib/audit/audit-ai-stub.test.ts`
- `apps/os-api/src/audit.controller.test.ts`

## Proof matrix

| Capability | PLANNED | IMPLEMENTED | TESTED | HOSTED |
|---|---|---|---|---|
| Filtered audit list | YES | YES | YES (unit) | UNPROVEN |
| Cursor pagination | YES | YES | YES (unit) | UNPROVEN |
| Detail drawer + snapshots | YES | YES | YES (unit/helpers) | UNPROVEN |
| AI ask stub | YES | YES (gated off) | YES | N/A |

## Notes

- Default page size 25; “Cargar más” uses opaque cursor.
- Non-admin still fail-closed via existing people.admin / system.admin gate.
