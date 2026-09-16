# WAVE A AGENT 2 — ReassignWork Admin UX

**Date:** 2026-09-15  
**Agent:** 2 (implementation)  
**Branch:** `wave-a/admin-continuity`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Scope:** os-web ReassignWork admin surface only. Did **not** touch `TerminateMember` backend, Owner scopes, Issues/AI/commitments.

---

## Verdict

**IMPLEMENTED** (source + unit tests). Hosted browser proof: **UNPROVEN**.

`ReassignWork` is exposed on the people.admin member detail page under **Trabajo activo**. `/trabajo` and follow-up surfaces still do **not** wire `ReassignWork`.

---

## Owner filter

`ListOpenWorkQuery.ownerMemberId` already exists in `packages/os-contracts` and is honored by `WorkQueryService.listOpenWork` via `assertWorkListScope` (people.admin may filter by any owner; others cannot widen).

**No CROSS_LANE change** — no `CROSS_LANE_work_owner_filter.md` filed. Member detail loads:

```ts
client.listWorkItems({ status: 'open', ownerMemberId: memberId, limit: 100 })
```

---

## What shipped

| Piece | Path |
| --- | --- |
| Server action | `apps/os-web/lib/work/reassign-work-action.ts` → `executeWorkCommand(ADMIN_REASSIGN_WORK_COMMAND, { workItemId, newOwnerMemberId, reason? })` |
| Command constant | `ADMIN_REASSIGN_WORK_COMMAND` / `ADMIN_REASSIGN_WORK_COMMANDS` in `apps/os-web/lib/work/command-types.ts` |
| UI panel | `apps/os-web/components/admin/reassign-work-panel.tsx` — section **Trabajo activo**, typeahead, confirm copy (count + from name + history preserved) |
| Page wire | `apps/os-web/app/(app)/administracion/equipo/[memberId]/page.tsx` |
| Visibility | `memberAdminVisibility(...).reassignWork` for active/suspended (not invited/terminated) |
| Terminate hint | Member admin panel links to `#trabajo-activo` (no longer `/trabajo`) |

Authority remains `COMMAND_REQUIRED_SCOPES.ReassignWork = people.admin`. **No second command.**

---

## Tests

| File | Assertion |
| --- | --- |
| `lib/work/reassign-work-admin.test.ts` | Present on admin member detail; Spanish copy; scope people.admin; absent from trabajo |
| `lib/work/due-order.test.ts` | ReassignWork still absent from `/trabajo`; present on admin member page |
| `lib/work/follow-up.test.ts` | Follow-up actions still exclude ReassignWork; admin action file wires command |
| `lib/workforce/ui-2b.test.ts` | `reassignWork` visibility flags |

---

## Explicit non-goals (honored)

- No `TerminateMember` backend changes  
- No grant of `people.admin` to Owner  
- No Issues / AI / commitments work  
- No parallel reassignment command  
- No ReassignWork on `/trabajo`

---

## Proof matrix (subfeature)

| State | Status |
| --- | --- |
| PLANNED | Yes |
| IMPLEMENTED | Yes |
| TESTED (unit/source) | Yes — 49/49 pass (`reassign-work-admin`, `due-order`, `follow-up`, `ui-2b`, `list-polish`) |
| INTEGRATED | Same branch as Wave A |
| DEPLOYED / HOSTED / BROWSER-VERIFIED / USER-ACCEPTED | UNPROVEN |
