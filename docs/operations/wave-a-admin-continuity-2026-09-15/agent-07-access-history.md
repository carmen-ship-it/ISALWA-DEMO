# WAVE A AGENT 7 — Access history

**Date:** 2026-09-15  
**Branch:** `wave-a/admin-continuity`  
**Decision:** **YES** (implemented; not deferred to Wave C)

## Event inspection

Workforce commands already emit `OsBusinessEvent` rows (and audit) for the access surface:

| Product concept | `eventType` | Primary entity |
| --- | --- | --- |
| Role assigned / changed | `member.role.changed` | `organization_member` |
| Additional role granted | `member.additional_role.granted` | `role_assignment` (+ `payload.memberId`) |
| Additional role removed | `member.additional_role.ended` | `role_assignment` (+ `payload.memberId`) |
| Manager changed | `member.manager.changed` | `organization_member` |
| Suspended | `member.suspended` | `organization_member` |
| Reactivated / activated | `member.activated` | `organization_member` (label **Acceso reactivado** when prior event in window was `member.suspended`) |
| Terminated | `member.terminated` | `organization_member` |
| Delegation granted | `delegation.granted` | `delegation` (matched via delegator/delegate membership) |
| Delegation revoked | `delegation.revoked` | `delegation` (same) |

No new event types or projection consumers were required.

## Implementation (bounded read)

- **Projection:** `packages/os-workforce/src/member-access-history.ts` — `collectMemberAccessHistory`, Spanish labels, no raw capability strings in copy.
- **Store read:** `listMemberAccessBusinessEvents` + `listDelegationsInvolvingMember` on `OsWorkforceStore` (memory + Prisma).
- **API:** `GET /members/:memberId/access-history` — `people.admin` gate (`apps/os-api/src/members.controller.ts`).
- **UI:** `Historial de acceso` on admin employee detail — `MemberAccessHistoryPanel` + `@isalwa/ui` `Timeline`, cap 20 (`apps/os-web/app/(app)/administracion/equipo/[memberId]/page.tsx`).

## Tests

- `packages/os-workforce/src/member-access-history.test.ts` — suspend → reactivate labels, no `people.admin` in displayed strings.

## Proof state

| State | Notes |
| --- | --- |
| IMPLEMENTED | Code in worktree |
| TESTED | Unit test above (run `pnpm --filter @isalwa/os-workforce test`) |
| HOSTED / BROWSER-VERIFIED | UNPROVEN — not run in this agent pass |
