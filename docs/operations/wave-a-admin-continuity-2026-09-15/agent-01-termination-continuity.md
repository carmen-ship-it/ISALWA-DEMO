# WAVE A — Termination continuity audit (Agent 1+3+4)

**Date:** 2026-09-15  
**Mode:** READ-ONLY (no implementation) — **SUPERSEDED for gate truth**  
**Repo:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Receipt:** `docs/operations/wave-a-admin-continuity-2026-09-15/agent-01-termination-continuity.md`

> **SUPERSEDED (2026-09-15):** Preflight + reason persistence landed in `agent-01-termination-preflight-impl.md` and commit `b6a44f7`. Do **not** treat “open work only” or “reason discarded” as current truth. Remaining gaps from later agents: quote/order reassignment, no ReassignApprover, customer **coverage grants** not in preflight (`agent-03-commercial-continuity.md`).

---

## Verdict (historical — pre-implementation audit)

`TerminateMember` was **LIVE BUT PARTIAL** at audit time. The sole continuity gate then was open work via `listOpenWorkItemsForMember` (`status: 'open'`). Commercial ownership, opportunities, quotes, orders, pending approvals, manager/direct reports, and delegations were **not** preflighted. Optional terminate `reason` was collected in UI/API payload and **discarded** by the service (event payload `{ memberId }` only).

---

## 1. Exact `terminateMember` gate

### Command path

| Layer | Symbol / path |
| --- | --- |
| Contract | `TerminateMember` in `WORKFORCE_COMMAND_NAMES`; `TerminateMemberPayloadSchema` = `{ memberId, reason? }` — `packages/os-contracts/src/commands.ts` |
| Scope | `COMMAND_REQUIRED_SCOPES.TerminateMember: 'people.admin'` — `packages/os-contracts/src/scopes.ts` |
| Service | `WorkforceCommandService.terminateMember` — `packages/os-workforce/src/workforce-command-service.ts` |
| Store gate | `OsWorkforceStore.listOpenWorkItemsForMember` — `packages/os-workforce/src/os-workforce-store.ts` |
| Prisma impl | `PrismaWorkforceStore.listOpenWorkItemsForMember` — `packages/os-database/src/prisma-workforce-store.ts` |
| Memory impl | `MemoryWorkforceStore.listOpenWorkItemsForMember` — `packages/os-workforce/src/memory-store.ts` |
| UI | `terminateMemberAction` — `apps/os-web/lib/workforce/actions.ts`; form in `MemberAdminActionsPanel` — `apps/os-web/components/admin/member-admin-actions-panel.tsx` |
| Error UX | `OPEN_WORK_TERMINATE_MESSAGE` + link `/trabajo` — `apps/os-web/lib/workforce/command-errors.ts` |

### Gate body (exact)

```793:826:packages/os-workforce/src/workforce-command-service.ts
  private async terminateMember(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
    postCommit: ScheduledProviderEffect[],
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'TerminateMember', ctx.organizationId, store);
    const memberId = String(payload.memberId);
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');

    const openWork = await store.listOpenWorkItemsForMember(ctx.organizationId, memberId);
    if (openWork.length > 0) {
      throw new Error('VALIDATION_FAILED');
    }
    // ... access revoked, employment terminated, auth revoked ...
    return this.emit(ctx, 'member.terminated', 'organization_member', memberId, store, { memberId });
  }
```

### `listOpenWorkItemsForMember` predicate (only continuity check)

```204:218:packages/os-database/src/prisma-workforce-store.ts
  async listOpenWorkItemsForMember(
    organizationId: string,
    memberId: string,
  ): Promise<WorkItemRecord[]> {
    const rows = await this.db().osWorkItem.findMany({
      where: { organizationId, ownerMemberId: memberId, status: 'open' },
    });
    // ...
  }
```

**Answer:** Yes — the terminate continuity gate is **only** `listOpenWorkItemsForMember` (open `OsWorkItem` owned by the member). No commercial, approval, manager, or delegation queries run inside `terminateMember`.

Proven by integration tests: `packages/os-database/src/workforce-admin-mutation-api.integration.test.ts` (“TerminateMember blocked with open work; succeeds after reassignment”), `packages/os-database/src/work-prisma.integration.test.ts`.

---

## 2. Canonical reassignment commands (by asset)

Legend for “active vs historical”:

- **Active definition** = single LIVE command name in `OS_COMMAND_NAMES` (`packages/os-contracts/src/command-registry.ts`). No alternate/historical command names found for these assets.
- **Historical retention** = how prior ownership/assignment is retained (event, history table, or temporal `endedAt`), not a second command.

| Asset | Canonical command(s) | LIVE? | Active vs historical | UI exists? | Citations |
| --- | --- | --- | --- | --- | --- |
| **Work** | `ReassignWork` | **YES** (API/tests) | Active: overwrites `OsWorkItem.ownerMemberId`. Historical: `OsWorkItemOwnershipHistory` row (`reason` persisted; default `'reassigned'`). Event `task.reassigned` with before/after. | **NO** in os-web. UI work surface only exposes `CreateWorkItem` + `CompleteWork` (`FOLLOW_UP_UI_COMMANDS`). Tests assert `ReassignWork` absent. | Contract: `packages/os-contracts/src/work-commands.ts` (`ReassignWorkPayloadSchema`). Service: `WorkCommandService.reassignWork` — `packages/os-work/src/work-command-service.ts`. Scope: `people.admin`. UI gap: `apps/os-web/lib/work/command-types.ts`, `follow-up.test.ts`, `due-order.test.ts`. |
| **CommercialAccount** | `ReassignCommercialAccountOwner` | **YES** | Active: overwrites `OsCommercialAccount.ownerMemberId` (requires account `status === 'active'`, target `accessStatus === 'active'`). Historical: prior owner in event payload + audit `beforeJson`/`afterJson` (no dedicated ownership history table). | **YES** — cliente `ReassignOwnerForm` / `reassignCommercialAccountOwnerAction`. | Contract: `packages/os-contracts/src/commercial-commands.ts`. Service: `CommercialCommandService.reassignCommercialAccountOwner` — `packages/os-commercial/src/commercial-command-service.ts`. Authority: `canReassignCommercialAccountOwner` + scope `commercial.account.reassign` (command entry is `member_active` then capability check). UI: `apps/os-web/components/party/reassign-owner-form.tsx`, `apps/os-web/lib/commercial/actions.ts`. |
| **Opportunity** | `AssignOpportunityOwner` | **YES** | Active: overwrites `OsOpportunity.ownerMemberId` for `status === 'open'` only. Historical: `previousOwnerMemberId` in `opportunity.owner_assigned` event (row overwrite). | **YES** — `OpportunityActionsPanel` / `assignOpportunityOwnerAction`. | Contract: `AssignOpportunityOwnerPayloadSchema`. Service: `assignOpportunityOwner`. UI: `apps/os-web/components/commercial/opportunity-actions-panel.tsx`. Listed in `UI_5A_COMMERCIAL_COMMANDS`. |
| **Quote** | **NONE** | **NO command** | Owner set at `CreateQuote` (`ownerMemberId` optional → actor). `UpdateQuote` cannot change owner. Fixture tooling patches write-model only (“No AssignQuoteOwner command”). | **NO** reassignment UI | Contract has no `AssignQuoteOwner` / `ReassignQuoteOwner` in `COMMERCIAL_COMMAND_NAMES`. Explicit: `packages/os-database/src/staging-wave2-role-fixtures-lib.ts`, `docs/architecture/WAVE2_FIXTURE_TOOL_PIN.md`. |
| **Order** | **NONE** | **NO command** | Owner copied from quote at `CreateOrder` (`ownerMemberId: quote.ownerMemberId`). No later reassignment command. Cancel only. | **NO** reassignment UI | `createOrder` in `commercial-command-service.ts` (~L1006). `COMMERCIAL_COMMAND_NAMES` has `CreateOrder` / `CancelOrder` only. |
| **Approvals (assigned approver)** | **NONE to reassign** | Approver set only at `RequestApproval` | Active pointer: `OsApprovalRequest.approverMemberId` with `status: 'pending'`. Decide via `Approve` / `Reject` (actor must be approver or hold `approval.act` delegation FROM that approver). No command to change `approverMemberId` after create. | **NO** reassignment UI (approval decide UIs exist elsewhere; not continuity reassign) | `RequestApprovalPayloadSchema` / `requestApproval` — `packages/os-contracts/src/work-commands.ts`, `packages/os-work/src/work-command-service.ts`. Schema: `OsApprovalRequest` — `packages/os-database/prisma/schema.prisma`. |
| **Manager / direct reports** | `ChangeManager` | **YES** | Active: ends prior `OsManagerAssignment` (`endedAt`) and inserts new (`endedAt: null`). Historical: prior rows retained with `endedAt`. Operates on the **report** (`memberId` → new `managerMemberId`). **No** bulk “reassign all reports of leaving manager” command. | **YES** — member admin typeahead | Contract: `ChangeManagerPayloadSchema`. Service: `changeManager`. UI: `MemberAdminActionsPanel` + `changeManagerAction`. Reads: `directReportMemberIds` / `listDirectReportMemberIds` — `packages/os-query/src/leadership/direct-reports.ts`. |
| **Delegations FROM** (member is delegator) | `GrantDelegation` / `RevokeDelegation` | **YES** (but model mismatch) | Active: `OsDelegation` with `revokedAt` null and time window. Historical: row retained after revoke/expiry. **Critical:** `GrantDelegation` always sets `delegatorMemberId: ctx.actorMemberId` (admin actor), **not** the member page subject. There is no `listDelegationsForDelegator` store API (only `listDelegationsForDelegate`). | **YES** create + revoke-by-pasted-id on member detail; fragile; count includes granted+received | Service: `grantDelegation` / `revokeDelegation`. UI: `MemberAdminActionsPanel` delegations section. Count: `prisma-member-query-store.ts` filters `[...delegationsGranted, ...delegationsReceived]`. |
| **Delegations TO** (member is delegate) | Same `RevokeDelegation` (by id); no transfer | **YES** revoke only | Received scopes used at authz via `listDelegationsForDelegate`. Terminate does not revoke them. After terminate, member access is revoked so received scopes are moot for the leaver; grants **FROM** others covering the leaver’s duties are the continuity concern — and those grants are actor-as-delegator today. | Same panel (count only; no list of IDs) | Store: `listDelegationsForDelegate` — `os-workforce-store.ts`. |

### Related non-reassignment (do not count as continuity reassign)

| Name | Role | Note |
| --- | --- | --- |
| `TransferMember` | **MISSING** | Capability map / recon: no orchestrated leave transfer. |
| `SuspendMember` | Hold | Open work **remains owned**; terminate gate does not apply on suspend. |
| `CreateOpportunity` / `CreateQuote` | Initial owner only | Not reassignment. |

---

## 3. What terminate **should** preflight-count (recommended continuity inventory)

Today only #1 is enforced. Recommended preflight counts for a safe leave ceremony (policy not implemented):

| # | Count | Predicate (suggested) | Enforced today? |
| --- | --- | --- | --- |
| 1 | Open work | `OsWorkItem` where `ownerMemberId = member` AND `status = 'open'` | **YES** |
| 2 | Active commercial accounts | `OsCommercialAccount` where `ownerMemberId = member` AND `status = 'active'` | NO |
| 3 | Open opportunities | `OsOpportunity` where `ownerMemberId = member` AND `status = 'open'` | NO |
| 4 | Live quotes | `OsQuote` where `ownerMemberId = member` AND `status ∈ {draft, submitted}` (non-terminal; `accepted`/`cancelled` closed) | NO |
| 5 | Open orders | `OsOrder` where `ownerMemberId = member` AND `status = 'open'` | NO |
| 6 | Pending approvals as approver | `OsApprovalRequest` where `approverMemberId = member` AND `status = 'pending'` | NO |
| 7 | Active direct reports | `OsManagerAssignment` where `managerMemberId = member` AND `endedAt IS NULL` (as-of now) | NO |
| 8 | Active delegations FROM | `OsDelegation` where `delegatorMemberId = member` AND not revoked AND not expired | NO (and grant model rarely makes leaver the delegator) |
| 9 | Active delegations TO | `OsDelegation` where `delegateMemberId = member` AND active | NO (optional; revoke hygiene) |

Status enums: `packages/os-contracts/src/commercial-events.ts` (`OPPORTUNITY_STATUSES`, `QUOTE_STATUSES`, `ORDER_STATUSES`).

---

## 4. Reason collected but discarded?

**YES for TerminateMember (and SuspendMember).**

| Layer | Behavior | Citation |
| --- | --- | --- |
| Schema | `reason: z.string().optional()` on `TerminateMemberPayloadSchema` | `packages/os-contracts/src/commands.ts` |
| UI | Optional “Motivo” field `name="reason"` | `member-admin-actions-panel.tsx` |
| Action | Copies reason into payload if non-empty | `terminateMemberAction` — `apps/os-web/lib/workforce/actions.ts` |
| Service | **Never reads `payload.reason`** | `terminateMember` body |
| Event | Emits `{ memberId }` only | `emit(..., { memberId })` |

Contrast: `ReassignWork` **does** persist reason into `OsWorkItemOwnershipHistory.reason` (`payload.reason` or default `'reassigned'`).

Suspend mirrors the same collect-and-discard pattern (`SuspendMemberPayloadSchema.reason` unused in `suspendMember`).

---

## 5. FOUNDATION_GAP — missing reassignment / continuity commands

| Gap ID | Missing / incomplete primitive | Impact on terminate |
| --- | --- | --- |
| **FG-01** | `AssignQuoteOwner` / `ReassignQuoteOwner` | Cannot canonically move quote ownership before leave; fixture code patches write-model. |
| **FG-02** | `AssignOrderOwner` / `ReassignOrderOwner` | Open orders stay owned by terminated member with no command path. |
| **FG-03** | `ReassignApprover` / `ChangeApprovalApprover` (pending only) | Pending approvals strand; terminated approver cannot `Approve`/`Reject`; no re-point. |
| **FG-04** | Terminate preflight beyond open work | Commercial / opp / quote / order / approval / manager / delegation orphans allowed. |
| **FG-05** | `TransferMember` (or orchestrated continuity ceremony) | Operators must stitch per-asset commands; incomplete set. |
| **FG-06** | Bulk `ReassignDirectReports` (manager leaving) | Only per-report `ChangeManager`; terminate does not block on reports. |
| **FG-07** | Admin `GrantDelegation` **on behalf of** member (`delegatorMemberId` ≠ actor) + list/revoke by member | Coverage FROM leaver cannot be modeled; revoke UX is paste-id only. |
| **FG-08** | os-web `ReassignWork` UI | Gate requires reassignment that UI does not expose (`FOLLOW_UP_UI_COMMANDS` omits it). |
| **FG-09** | Persist terminate/suspend `reason` into event/audit | UI/API lie; no admin history reason. |

---

## 6. Proof matrix (this capability)

| Subfeature | State |
| --- | --- |
| Open-work terminate gate | **IMPLEMENTED** + **TESTED** (integration) |
| ReassignWork backend | **IMPLEMENTED** + **TESTED** |
| ReassignWork os-web | **MISSING** (asserted absent) |
| Commercial account reassign | **IMPLEMENTED** + UI **INTEGRATED** (hosted BV separate / UNPROVEN here) |
| Opportunity owner assign | **IMPLEMENTED** + UI **INTEGRATED** |
| Quote / order reassign | **MISSING** |
| Approval approver reassign | **MISSING** |
| Manager change | **IMPLEMENTED** + UI **INTEGRATED** |
| Delegation grant/revoke | **IMPLEMENTED** + UI **PARTIAL** |
| Full terminate continuity policy | **MISSING** / **UNPROVEN** |

Do not collapse to “terminate works.” Work gate alone ≠ employment continuity.

---

## 7. Sources cross-check

Aligned with prior recon (not re-implemented):  
`docs/operations/company-os-recon-2026-09-15/agent-01-admin-lifecycle.md` §§ Terminate / Continuity / Termination continuity table;  
`docs/product/ISALWA_COMPANY_OS_CAPABILITY_MAP.md` rows Terminate employee, Correct work ownership, Termination continuity (work / commercial).
