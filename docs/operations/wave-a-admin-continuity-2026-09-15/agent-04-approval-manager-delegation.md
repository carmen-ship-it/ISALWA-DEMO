# WAVE A AGENT 4 — Approval + manager + delegation continuity

**Date:** 2026-09-15  
**Agent:** 4  
**Branch:** `wave-a/admin-continuity`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Scope:** READ evidence + thin os-web continuity UX (existing commands only).  
**Not modified:** ReassignWork UI internals (Agent 2), commercial packages, Owner scopes, os-query package.json edge, migrations.

---

## Status

| Subfeature | State |
| --- | --- |
| Approval role taxonomy (code evidence) | DOCUMENTED |
| Terminate blocks pending approver / reports / delegations | IMPLEMENTED + TESTED (Agent 1; verified here) |
| Manager optional; ChangeManager governed path | DOCUMENTED |
| Delegation active/expired/revoke; terminate block | DOCUMENTED + TESTED |
| Suspend vs terminate reassignment | DOCUMENTED |
| Member detail UX hints (ChangeManager, RevokeDelegation) | IMPLEMENTED (this agent) |
| Hosted browser proof | UNPROVEN |

---

## 1. Approval model — role distinctions

Product vocabulary mapped to **stored fields and gates** (no separate “eligible approver” table or pool).

| Concept | Meaning in product | Storage / contract | Evidence |
| --- | --- | --- | --- |
| **REQUESTER** | Member who opened the approval | `OsApprovalRequest.requestedByMemberId` (= `ctx.actorMemberId` on `RequestApproval`) | `packages/os-work/src/work-command-service.ts` `requestApproval` L412–413; context snapshot duplicates `requestedByMemberId` L399 |
| **OWNER** (commercial subjects only) | Member who may **request** approval on quote/order | Subject row `ownerMemberId`; gate `canRequestCommercialSubjectApproval({ actorMemberId, subjectOwnerMemberId })` requires equality | `packages/os-contracts/src/commercial-authority.ts` L75–82; enforced in `requestApproval` L377–386. Non–quote/order subjects (`party`, `organization_member`, `work_item`) have **no owner gate** on request — only `member_active` + subject validation |
| **ELIGIBLE APPROVER** | **Not modeled** as a separate role | At request time, payload `approverMemberId` must reference an **active** org member (`accessStatus === 'active'`) | `requestApproval` L359–361. No cargo/scope inference for who may be nominated |
| **ASSIGNED APPROVER** | Designated decider for this request | `OsApprovalRequest.approverMemberId` (immutable after create; no `ReassignApprover` command) | `RequestApprovalPayloadSchema` — `packages/os-contracts/src/work-commands.ts` L47–53; read model `approverMemberId` — `packages/os-query/src/work/approval-query-service.ts` |
| **DECISION AUTHOR** | Member whose action closed the request | `OsApprovalRequest.decisionByMemberId` on `Approve` / `Reject` | `decideApproval` L466–470; event payload `decisionByMemberId: ctx.actorMemberId` via `buildApprovalDecisionEventPayload` — `packages/os-work/src/approval-subjects.ts` L58–69 |

**Decision permission (assigned approver vs delegate):**

- Command auth: `Approve` / `Reject` require scope `member_active` only (`packages/os-contracts/src/scopes.ts` L80–81).
- Business gate: `canDecideApproval` — actor equals `approval.approverMemberId`, **or** active delegation **from that approver** with scope `approval.act` (`work-command-service.ts` L431–445).
- Query mirror: `canActAsApproverDelegate` / `canViewApproval` — `packages/os-query/src/work/work-auth.ts` L17–27.
- Attention queue targets **assigned approver** (`approval.approverMemberId`), not decision author — `packages/os-query/src/work/attention-derivation.ts` L158–164.

**Termination preflight for approvals:** counts rows where member is **assigned approver** on **pending** requests only — `listPendingApprovalsForApprover` (`approverMemberId` + `status: 'pending'`) — `packages/os-database/src/prisma-workforce-store.ts` L295–301; wired in `collectTerminationImpact` — `packages/os-workforce/src/termination-impact.ts` L105, L136–141.

---

## 2. Terminate with pending actionable approval role

**Yes — blocked** by `collectTerminationImpact` → category `pending_approvals` → `canTerminate: false` → `TerminateMember` throws `VALIDATION_FAILED`.

| Layer | Behavior |
| --- | --- |
| Collector | Any category with `count > 0` blocks (`termination-impact.ts` L80–83, L159–164) |
| Command | `terminateMember` calls collector; rejects if `!impact.canTerminate` (`workforce-command-service.ts` L805–814) |
| Test | Memory store pending approval on member → `VALIDATION_FAILED` (`termination-preflight.test.ts` L138–154) |

**Operator path to unblock:** resolve each pending request via `Approve` / `Reject` (by assigned approver or `approval.act` delegate). **No** governed command to change `approverMemberId` → **FG-03**.

Requester-owned pending approvals where someone else is approver do **not** block the requester’s terminate — only **assigned approver** pending rows block the approver’s terminate.

---

## 3. Manager / direct reports

| Question | Answer | Evidence |
| --- | --- | --- |
| Is manager **required**? | **No** for invite or employment. `managerMemberId` on member summary is nullable. Invite explicitly omits manager; `ChangeManager` assigns later | `apps/os-web/lib/workforce/invite.ts` (comment); `MemberSummaryReadModelSchema.managerMemberId` nullable — `packages/os-contracts/src/queries.ts` L343 |
| Does terminate block on direct reports? | **Yes** — member as **manager** with active assignments | `listActiveDirectReportAssignments(organizationId, managerMemberId, asOf)` — `prisma-workforce-store.ts` L312–323; category `direct_reports` — `termination-impact.ts` L144–146; test `termination-preflight.test.ts` L157–182 |
| Governed reassignment path? | **`ChangeManager`** on each **report** (`memberId` = report, `managerMemberId` = new manager). Ends prior `OsManagerAssignment`, inserts new | `changeManager` — `workforce-command-service.ts` L693–721; scope `people.admin` — `scopes.ts` |
| Bulk reassign all reports? | **No command** | Prior audit **FG-06**; still accurate |

**Query read:** one-hop direct reports via `directReportMemberIds` — `packages/os-query/src/leadership/direct-reports.ts` (used by member query store for leadership pilot).

---

## 4. Delegations FROM and TO member

| State | Definition | Store predicate |
| --- | --- | --- |
| **Active** | `revokedAt === null`, `startsAt <= asOf`, `expiresAt > asOf`, member is delegator **or** delegate | `listActiveDelegationsInvolvingMember` — `memory-store.ts` L238–250; Prisma mirror L335–358 |
| **Expired** | `expiresAt <= asOf` | Excluded from active list; test `termination-preflight.test.ts` L214+ |
| **Revoked** | `revokedAt` set | `RevokeDelegation` → `revokeDelegation` sets `revokedAt` — `workforce-command-service.ts` L758–768 |

**Commands (contracts):** `GrantDelegation`, `RevokeDelegation` — **no** `EndDelegation` name (`packages/os-contracts/src/commands.ts`).

**Grant model caveat:** `delegatorMemberId` is always **`ctx.actorMemberId`** (admin executing grant), not the subject on the member detail page — `grantDelegation` L742. UI “Crear delegación” on member **A** still creates delegation **from admin actor** unless actor is A.

**Terminate block:** any active delegation **from or to** member → category `active_delegations` — tests L185–211.

**Revoke path:** `RevokeDelegation` with `{ delegationId }`; UI paste-id form — `MemberAdminActionsPanel` + `revokeDelegationAction`.

---

## 5. Suspend vs terminate

| | **SuspendMember** | **TerminateMember** |
| --- | --- | --- |
| Preflight / reassignment force | **None** — no `collectTerminationImpact` | **Fail-closed** on all impact categories |
| Open work | Stays owned by member | Blocks if open work owned |
| Employment | Unchanged (`accessStatus: suspended`) | `employmentStatus: terminated`, access revoked |
| Service | `suspendMember` L771–791 | `terminateMember` L794–848 |

UI copy confirms suspend does not force reassignment — `member-admin-actions-panel.tsx` suspend section (“El trabajo asignado puede seguir a nombre de esta persona…”).

---

## 6. os-web admin member detail UX (this agent)

**Already present (prior agents):** `TerminationImpactPanel` + `getTerminationImpact`; `ChangeManager` + `RevokeDelegation` in `MemberAdminActionsPanel`.

**Added (Agent 4 — thin Spanish continuity):**

| File | Change |
| --- | --- |
| `apps/os-web/components/admin/termination-impact-panel.tsx` | Per-category resolution hints (Spanish); anchor links to `#trabajo-activo`, `#continuidad-responsable`, `#continuidad-delegaciones` where governed UI exists |
| `apps/os-web/components/admin/member-admin-actions-panel.tsx` | Section ids `continuidad-organizacion`, `continuidad-responsable`, `continuidad-delegaciones`; terminate error links to `#responsabilidades` |

No new commands invented.

---

## 7. FOUNDATION_GAP (continuity-relevant)

| ID | Gap | Affects |
| --- | --- | --- |
| **FG-03** | No `ReassignApprover` / change `approverMemberId` on pending requests | Cannot clear `pending_approvals` except decide or leave stranded |
| **FG-06** | No bulk `ReassignDirectReports` | Manager leave requires N × `ChangeManager` on report fichas |
| **FG-07** | `GrantDelegation` delegator = actor only; no list-by-member in admin UI | Delegations FROM leaver often not visible; revoke by pasted id |
| **FG-01 / FG-02** | No quote/order owner reassignment | `active_quotes` / `active_orders` categories block terminate |

---

## 8. Files touched by Agent 4

| Path | Role |
| --- | --- |
| `docs/operations/wave-a-admin-continuity-2026-09-15/agent-04-approval-manager-delegation.md` | This receipt |
| `apps/os-web/components/admin/termination-impact-panel.tsx` | Continuity resolution hints |
| `apps/os-web/components/admin/member-admin-actions-panel.tsx` | Anchor ids + terminate hint |

**Evidence-only (not edited by Agent 4):** `packages/os-workforce/src/termination-impact.ts`, `packages/os-work/src/work-command-service.ts`, `packages/os-query/src/work/approval-query-service.ts`, `packages/os-query/src/work/work-auth.ts`, `packages/os-contracts/src/work-commands.ts`, `packages/os-contracts/src/commercial-authority.ts`.

---

## 9. Proof matrix (Agent 4 scope)

| Check | Automated | Hosted |
| --- | --- | --- |
| Pending approver blocks terminate | `termination-preflight.test.ts` | UNPROVEN |
| Direct reports block terminate | same | UNPROVEN |
| Active delegation TO/FROM blocks terminate | same + Prisma lifecycle test | UNPROVEN |
| Suspend skips impact collector | code review `suspendMember` | UNPROVEN |
| Impact panel + anchor hints | not browser-tested | UNPROVEN |
