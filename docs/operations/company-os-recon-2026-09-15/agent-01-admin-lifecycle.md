# Agent 01 — Admin / Employee Lifecycle Reconciliation Receipt

**Date:** 2026-09-15  
**Agent:** 1 ONLY (read-only audit)  
**Repo root:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Scope:** Employee lifecycle, access, organization, continuity, admin history, role governance, termination continuity, archive vs delete, access review, session/device  
**Method:** Codebase inspection only. No implementation. No other files edited.

**State vocabulary (only):** `LIVE` | `LIVE BUT PARTIAL` | `BACKEND ONLY` | `PLANNED` | `MISSING` | `INTENTIONALLY DEFERRED` | `NO LONGER NEEDED`

---

## Package map (no separate `identity` / `rbac` packages)

| Concern | Package / app | Key symbols |
|---|---|---|
| Lifecycle commands | `packages/os-workforce` | `WorkforceCommandService`, `completeInvitedAccess`, `AuthProviderPort`, `SupabaseAuthProviderPort` |
| Authz / effective scopes | `packages/os-domain` | `computeEffectiveScopes`, `memberHasScope`, `assertMemberActive` |
| Contracts / scopes | `packages/os-contracts` | `WORKFORCE_COMMAND_NAMES`, `ADDITIONAL_ASSIGNABLE_SCOPE_KEYS`, `COMMAND_REQUIRED_SCOPES`, `MemberSummaryReadModelSchema` |
| Member directory reads | `packages/os-query` + `packages/os-database` | `MemberQueryService`, `PrismaMemberQueryStore` |
| Persistence | `packages/os-database` | `OsOrganizationMember`, `OsRoleAssignment`, `OsDelegation`, `OsAuditLog`, `PrismaOsWorkforceStore` |
| Events / audit append | `packages/os-events` | `buildBusinessEvent`, `buildAuditEntry` |
| Work reassignment | `packages/os-work` | `WorkCommandService` → `ReassignWork` |
| Commercial owner reassignment | `packages/os-commercial` | `ReassignCommercialAccountOwner` |
| Session binding | `packages/os-request-session`, `apps/os-api` | canonical request session; `MembersController` |
| UI | `apps/os-web` | routes under `app/(app)/administracion/**`, `lib/workforce/*`, `components/admin/*` |
| API | `apps/os-api` | `POST /v1/commands/:command`, `GET /v1/members`, `POST /auth/complete-invite` |

There is **no** `@isalwa/identity` or `@isalwa/rbac` package. Role keys **are** the capability/scopes strings stored on `OsRoleAssignment.roleKey`.

---

## UI routes (`apps/os-web`)

| Route | File | Purpose |
|---|---|---|
| `/administracion` | `app/(app)/administracion/page.tsx` | Admin hub copy + `AdminSectionCards` |
| `/administracion/equipo` | `app/(app)/administracion/equipo/page.tsx` | Member directory (people.admin) |
| `/administracion/equipo/invitar` | `app/(app)/administracion/equipo/invitar/page.tsx` | Invite form |
| `/administracion/equipo/[memberId]` | `app/(app)/administracion/equipo/[memberId]/page.tsx` | Member detail + admin actions |
| `/administracion/accesos` | `app/(app)/administracion/accesos/page.tsx` | Access **explainer** only (links to Equipo) |
| `/administracion/capacidades` | `app/(app)/administracion/capacidades/page.tsx` | Org capability flags (not per-employee access) |
| `/auth/complete-invite` | `app/auth/complete-invite/page.tsx` | Invitee activation ceremony |

Nav helpers: `apps/os-web/lib/workforce/navigation.ts` (`equipoHref`, `memberHref`, `inviteMemberHref`, `accesosHref`, `capacidadesHref`).

UI command surface allowlist: `WORKFORCE_COMMANDS_EXPOSED_IN_UI` in `apps/os-web/lib/workforce/command-types.ts`. Explicitly **blocked in UI:** `RehireMember`, `ChangeMemberEmail`, `RetryAuthProviderSync`.

---

## EMPLOYEE LIFECYCLE

### Invite — **LIVE**

- **Backend:** `WorkforceCommandService.inviteMember` (`packages/os-workforce/src/workforce-command-service.ts`) — creates `OsPerson`, `OsOrganizationMember` (`accessStatus: 'invited'`, `employmentStatus: 'pending_start'`), `OsAuthIdentity` (`status: 'invited'`), primary `OsRoleAssignment`, optional `OsDepartmentAssignment`; calls `AuthProviderPort.createInvite`; emits `member.invited`.
- **API:** `POST /v1/commands/InviteMember` (requires `people.admin` via `COMMAND_REQUIRED_SCOPES`).
- **UI:** `/administracion/equipo/invitar` → `InviteMemberForm` → `inviteMemberAction` (`apps/os-web/lib/workforce/actions.ts`).
- **Provider:** `SupabaseAuthProviderPort.createInvite` (`packages/os-workforce/src/supabase-auth-provider.ts`).
- **Note:** Invite UI does **not** set manager (`INVITE_OMITTED_COMMAND_FIELDS` includes `managerMemberId` in `apps/os-web/lib/workforce/invite.ts`). Role options are derived from existing directory role keys (`loadMemberAdminOptions`), not a frozen catalog API.

### Invitation state — **LIVE BUT PARTIAL**

- **LIVE:** Member directory/detail show `accessStatus: 'invited'` with labels (`formatAccessStatus`, `accessStatusExplanation` in `apps/os-web/lib/workforce/labels.ts`); filters on Equipo via `accessStatus` query param.
- **PARTIAL:** `PrismaMemberQueryStore.activeEmailForPerson` only loads auth identities with `status: 'active'`, so invited members often show **email `—`** on detail even though invite email exists on `OsAuthIdentity`. No dedicated invite-token / invite-ref / resend surface in UI. Docs note no resend command yet (`docs/operations/ENVIRONMENT_MAP.md`).

### Activate — **LIVE**

- **Invitee path:** `completeInvitedAccess` → `ActivateMember` (`packages/os-workforce/src/invite-completion.ts`); UI `/auth/complete-invite` → `completeInviteAction` → `POST /auth/complete-invite` (`apps/os-api/src/complete-invite.controller.ts`).
- **Admin reactivate-from-suspended path:** same `ActivateMember` command; UI `activateMemberAction` with synthetic `providerSubject: reactivation:${memberId}` (`apps/os-web/lib/workforce/actions.ts`). Visibility: `memberAdminVisibility.reactivate` (`lifecycle-ui.ts`).
- **Guard:** `ActivateMember` rejects terminated/revoked members (J-13); tested in `workforce-lifecycle.test.ts` / HTTP tests.
- **Admin cannot “force activate” invited** from member admin panel: invited hides org/suspend/reactivate (`lifecycle-ui.ts`; `ui-2b.test.ts` “hides invited onboarding activate from admin surfaces”).

### Suspend — **LIVE**

- **Backend:** `WorkforceCommandService.suspendMember` — sets `accessStatus: 'suspended'`; schedules `authProvider.revokeSessions`; emits `member.suspended`.
- **UI:** `MemberAdminActionsPanel` suspend form + confirm.
- **Behavior:** Open work **remains owned** (hold, not auto-reassign) — `suspend-open-work-lifecycle.integration.test.ts`. Suspended members get `ACCESS_REVOKED` on work/approval commands.

### Reactivate — **LIVE**

- Suspended → `ActivateMember` (admin, not self). Distinct from rehire. UI copy: “Esto no es un recontrato.”

### Terminate — **LIVE BUT PARTIAL**

- **Backend:** `WorkforceCommandService.terminateMember` — requires **zero open work items** (`listOpenWorkItemsForMember`); sets `accessStatus: 'revoked'`, `employmentStatus: 'terminated'`, `employmentEndedAt`; revokes auth identity + `revokeCredentials`; emits `member.terminated`.
- **UI:** terminate confirm + optional reason field; open-work failure maps to link `/trabajo` (`OPEN_WORK_TERMINATE_MESSAGE`).
- **PARTIAL gaps:** Does **not** check commercial ownership, opportunities/quotes/orders ownership, or pending approvals as approver. Optional `reason` in payload schema is **not read/persisted** by the service (UI collects it; emit payload is only `{ memberId }`).

### Rehire (related) — **BACKEND ONLY** / **INTENTIONALLY DEFERRED** (UI)

- Command `RehireMember` exists and is tested; emits `employment.restarted`.
- Explicitly in `WORKFORCE_COMMANDS_BLOCKED_IN_UI` (`command-types.ts`). Product docs mark Invite/Rehire UI history as blocked for some UAT lanes; invite is now wired (People V1), rehire remains UI-blocked.

---

## ACCESS

### Assign known business role — **LIVE BUT PARTIAL**

- **LIVE:** `ChangeRole` ends all active role assignments and inserts one new `roleKey` (`changeRole`). UI primary-role select on member detail.
- **PARTIAL:** Primary `roleKey` is `z.string().min(1)` — **not** an enum of known business roles. UI options are **whatever role keys already appear** in the first 100 directory members (`loadMemberAdminOptions` / `uniqueRoles`). Labels exist for common keys (`formatRoleKey`: `sales_rep`, `sales_manager`, `people.admin`, …) but unknown keys render as “Rol del sistema”. No governed seed catalog API for invite/change.

### Additional role — **LIVE**

- `GrantAdditionalRole` / `EndAdditionalRole` gated to `ADDITIONAL_ASSIGNABLE_SCOPE_KEYS` (`commercial.team.read`, `commercial.org.read`, `commercial.order.convert`, `commercial.account.reassign`) via `isAdditionalAssignableScope` (`packages/os-contracts/src/scopes.ts`).
- UI: “Permisos adicionales” in `MemberAdminActionsPanel`.

### Remove role — **LIVE BUT PARTIAL**

- **Additional:** remove via `EndAdditionalRole` — LIVE.
- **Primary:** replaced via `ChangeRole` (ends **all** active assignments including additionals) — LIVE as replacement, not a soft “remove primary leaving none” path.
- No dedicated “clear all access while remaining employed” command beyond suspend/terminate.

### Inspect effective access — **LIVE BUT PARTIAL**

- **LIVE:** Member detail shows access/employment pills, primary roles, additional permissions, department, manager, `activeDelegationCount` (`MemberSummaryReadModel` via `getMember` / `PrismaMemberQueryStore.mapMemberRow` — active assignments only as-of now).
- Runtime auth uses `computeEffectiveScopes(roles + non-expired delegations)` (`packages/os-domain/src/authorization.ts`).
- **PARTIAL:** No UI listing of **delegated scopes detail**, assignment effective/end dates, or “effective scopes as-of” inspector. Delegation count only. `/administracion/accesos` is documentation, not a live matrix.

### Access history — **MISSING** (UI) / **LIVE BUT PARTIAL** (backend evidence)

- Temporal tables exist: `OsRoleAssignment.endedAt`, `OsDepartmentAssignment`, `OsManagerAssignment`, `OsDelegation`, `OsAuditLog`, `OsBusinessEvent` (`member.role.changed`, etc.).
- **No** member access-history query API or UI timeline on employee detail.
- `buildAuditEntry` supports `beforeJson`/`afterJson`, but most workforce emits (role/dept/manager/suspend/terminate) call `emit` **without** before/after snapshots (email change is the exception that passes before/after).

---

## ORGANIZATION

### Department — **LIVE BUT PARTIAL**

- Assignment: `ChangeDepartment` + invite optional `departmentId`; stored on `OsDepartmentAssignment`.
- UI: select from departments **already present** on other members’ assignments — **no CreateDepartment command / admin UI** to create departments.
- Schema: `OsDepartment` with org-scoped `code`/`name`/`parentId` (tree supported in data model; no admin CRUD UI found).

### Manager / reporting relationship — **LIVE**

- `ChangeManager` ends prior `OsManagerAssignment` and inserts new; emits `member.manager.changed`.
- UI: `ServerMemberTypeahead` on member detail.
- Reads: `managerMemberId` on summary; leadership helpers `listDirectReportMemberIds` / `directReportMemberIds` in query layer.
- Invite intentionally omits manager.

### Role / function (HR cargo / job title) — **INTENTIONALLY DEFERRED** / **MISSING** as employee field

- Invite forbids `cargo` / `title` / `jobTitle` (`INVITE_FORBIDDEN_FIELDS`).
- Domain explicitly treats cargo/title as **non-authorizing** (`trusted-member-context.ts`, capability-separation tests).
- No `jobTitle`/`cargo` columns on `OsOrganizationMember` / `OsPerson`.
- System “rol” = `roleKey` capability string, not HR function.

---

## CONTINUITY

### Temporary delegation — **LIVE BUT PARTIAL**

- **Backend:** `GrantDelegation` / `RevokeDelegation`; model `OsDelegation` with `scopesJson`, `startsAt`, `expiresAt`, `revokedAt`.
- Expiry enforced at **authorization time** (`computeEffectiveScopes` skips expired); event type `delegation.expired` is registered but **never emitted** by a job/command (registry-only).
- **UI:** create + revoke-by-pasted-id on member detail; default expiry +30 days; scope options limited to `approval.act` (`DELEGATION_SCOPE_OPTIONS`).
- **PARTIAL:** Delegator is always the **actor** (`ctx.actorMemberId`), not the member whose duties are covered. No list of active delegation IDs on the page (success message asks admin to save the id). Revoke UX is fragile.

### Delegation expiry — **LIVE** (enforcement) / **MISSING** (expiry event / admin surfacing of expired rows)

- Enforcement: LIVE via time checks.
- Lifecycle event `delegation.expired`: MISSING as runtime emission.
- Expired rows remain in DB until revoked or ignored by reads.

### Transfer — **MISSING** (as employee continuity product)

- No `TransferMember` / bulk ownership transfer command tied to lifecycle.
- Closest primitives are separate: `ReassignWork`, `ReassignCommercialAccountOwner`, opportunity owner assign — not orchestrated on terminate.

### Reassignment — **BACKEND ONLY** (work) / **LIVE** (commercial accounts, separate surface)

- **Work:** `ReassignWork` requires `people.admin` (`COMMAND_REQUIRED_SCOPES`). Proven in integration tests as prerequisite to terminate. **Not wired** in `apps/os-web` work actions (explicitly asserted absent in `follow-up.test.ts`, `due-order.test.ts`). Terminate UI only links to `/trabajo` for manual handling.
- **Commercial:** `ReassignCommercialAccountOwner` + UI on cliente detail (`reassign-owner-form`) — LIVE for customers, independent of employee terminate.

### Unassigned queues — **LIVE BUT PARTIAL** (commercial) / **MISSING** (workforce termination queues)

- Customers without owner: `OWNER_ABSENT_LABEL` / data-health “unassigned” signals (`apps/os-web/lib/party/*`) — LIVE BUT PARTIAL operational visibility.
- No admin queue of “work/approvals/customers owned by terminated or suspended members” as a termination continuity surface.
- Work attention includes `reassigned_work` for the **new** owner (`attention-derivation.ts`), not an unassigned pool.

---

## ADMIN HISTORY (who / when / previous / new / reason)

### **LIVE BUT PARTIAL** (backend) / **MISSING** (employee UI)

| Dimension | Evidence | State |
|---|---|---|
| Who | `OsAuditLog.actorMemberId`, business event `actorMemberId` | LIVE (persisted) |
| When | `createdAt` / `occurredAt` / assignment `effectiveAt` | LIVE (persisted) |
| Previous / new | Audit `beforeJson`/`afterJson` mostly unused on workforce mutations; temporal rows retain history | LIVE BUT PARTIAL |
| Reason | Schema optional on suspend/terminate; **service ignores `payload.reason`**; work ownership history has `reason` field for work reassignment | MISSING for workforce admin reasons |

No employee “historial administrativo” UI. Org-level “what changed” productivity surfaces are party-scoped, not member-admin.

---

## ROLE MANAGEMENT (governed known roles vs arbitrary capability strings)

### **LIVE BUT PARTIAL**

- **Governed (enum):** additional assignable scopes only (`ADDITIONAL_ASSIGNABLE_SCOPE_KEYS`).
- **Arbitrary string allowed:** Invite / ChangeRole / Rehire / GrantDelegation scopes (delegation UI constrains; API does not fully enum primary roles).
- **Admin scopes** listed in `ADMIN_SCOPE_KEYS` but assignment is still a free `roleKey` string in storage.
- Cargo never grants scopes (by design).

---

## CORRECTION / OVERRIDE of wrong role / manager

### **LIVE**

- Wrong primary role → `ChangeRole` (also clears additionals — operators must re-grant).
- Wrong additional → `EndAdditionalRole` / grant again.
- Wrong manager → `ChangeManager`.
- Wrong department → `ChangeDepartment`.
- No separate “override with reason” command; corrections are new temporal assignments + events.

---

## TERMINATION CONTINUITY (customers / opportunities / quotes / orders / work / approvals)

| Asset | On TerminateMember | State |
|---|---|---|
| Open work items | **Blocked** until reassigned via `ReassignWork` | LIVE (gate) / BACKEND ONLY (reassign UI) |
| Customers (`OsCommercialAccount.ownerMemberId`) | **Not checked / not cleared** | MISSING |
| Opportunities / quotes / orders ownership | **Not checked / not transferred** | MISSING |
| Pending approvals (as approver) | **Not checked**; terminated member cannot act; requests can strand | MISSING |
| Suspended + open work | Allowed; work stays owned | LIVE (documented hold) |
| Person / assignment history | Person row preserved; membership terminated | LIVE |

Evidence: `terminateMember` only calls `listOpenWorkItemsForMember`; commercial reassignment is a separate command path.

---

## ARCHIVE VS DELETE for employees

### Archive / soft-end — **LIVE** (via terminate/revoke)

- Membership retained with `employmentStatus: 'terminated'`, `accessStatus: 'revoked'`. Person preserved (lifecycle test: “person history preserved”).

### Hard delete employee — **MISSING** / **NO LONGER NEEDED** (product intent)

- No `DeleteMember` command. Prisma generated `delete` exists only as ORM capability; no product command service path. Soft terminate + revoke credentials is the intended end state. Treat hard delete as **NO LONGER NEEDED** unless compliance later requires purge.

---

## ACCESS REVIEW surfaces

### **LIVE BUT PARTIAL**

- Equipo directory with filters (`accessStatus`, `employmentStatus`, search) — usable as lightweight review.
- `/administracion/accesos` — static explainer, not a review campaign.
- `/administracion/capacidades` — org capability flags, not employee entitlement review.
- No attestation workflow, periodic review campaign, or export of effective access.

---

## SESSION / DEVICE

### Logout — **LIVE**

- `signOutAction` (`apps/os-web/lib/auth/actions.ts`); shell / user menu; `EndSessionButton` for expired/revoked states.

### Revoke sessions (admin) — **LIVE BUT PARTIAL**

- On **suspend:** `SupabaseAuthProviderPort.revokeSessions` (global logout admin API).
- On **terminate:** `revokeCredentials` (delete provider user) — stronger than session revoke.
- `RetryAuthProviderSync` can retry revoke — **BACKEND ONLY** / UI-blocked.
- No “list devices / revoke one device” surface.

### Password reset — **INTENTIONALLY DEFERRED** (in-app) / provider-owned

- OS does not store passwords (`AuthProviderPort` comment). Invite UI forbids password fields. Docs: `V1_LAUNCH_SUPPORT_READINESS.md`, `OPERATIONS_RUNBOOK.md` — reset via **Supabase Auth dashboard / provider**, not ISALWA UI.
- In-app password reset: **MISSING** by design for pilot.

---

## Capability scoreboard (audit checklist)

| Item | CURRENT STATE |
|---|---|
| Invite | LIVE |
| Invitation state | LIVE BUT PARTIAL |
| Activate | LIVE |
| Suspend | LIVE |
| Reactivate | LIVE |
| Terminate | LIVE BUT PARTIAL |
| Assign known business role | LIVE BUT PARTIAL |
| Additional role | LIVE |
| Remove role | LIVE BUT PARTIAL |
| Inspect effective access | LIVE BUT PARTIAL |
| Access history | MISSING (UI); LIVE BUT PARTIAL (raw events/assignments) |
| Department | LIVE BUT PARTIAL |
| Manager / reporting | LIVE |
| Role/function (HR) | INTENTIONALLY DEFERRED / MISSING |
| Temporary delegation | LIVE BUT PARTIAL |
| Delegation expiry | LIVE (enforce) / MISSING (expiry event) |
| Transfer | MISSING |
| Reassignment | BACKEND ONLY (work); LIVE (commercial, separate) |
| Unassigned queues | LIVE BUT PARTIAL (customers); MISSING (term queues) |
| Admin history who/when/prev/new/reason | LIVE BUT PARTIAL / MISSING reason+UI |
| Governed roles vs arbitrary strings | LIVE BUT PARTIAL |
| Correction/override role/manager | LIVE |
| Termination continuity (non-work assets) | MISSING |
| Archive vs delete | LIVE (soft terminate); hard delete NO LONGER NEEDED |
| Access review surfaces | LIVE BUT PARTIAL |
| Logout | LIVE |
| Session revoke | LIVE BUT PARTIAL |
| Password reset (in-app) | INTENTIONALLY DEFERRED |

---

## BUSINESS DECISIONS REQUIRED

1. **Primary role catalog:** Freeze a governed enum of invite/ChangeRole keys (vs continue deriving from existing members’ free strings)?
2. **Termination continuity policy:** Must customers / opportunities / quotes / orders / pending approvals be blocked, auto-reassigned, or left orphaned when terminating?
3. **Work reassignment UX:** Expose `ReassignWork` in os-web for people.admin (required to terminate), or keep API/ops-only?
4. **Suspend reason / terminate reason:** Persist optional reason into audit/event payload, or remove UI fields?
5. **Rehire:** Ship UI for `RehireMember`, or keep backend-only for pilot?
6. **Department administration:** Who creates `OsDepartment` rows (seed-only vs admin CRUD)?
7. **Delegation product model:** Admin grants scopes they administer vs employee grants own temporary coverage; need delegation list UI?
8. **Access history / access review:** Is Equipo filtering enough for V1, or is a formal review/attestation surface required?
9. **Invited email visibility:** Should member summary include invited auth email (not only active)?
10. **Hard delete / GDPR purge:** Confirm soft-terminate is permanent product stance for employees.

---

## Gaps by priority

### P0

- **Termination leaves commercial + approval ownership stranded** while only open work is gated (`terminateMember` vs no commercial/approval checks).
- **`ReassignWork` required for terminate but not exposed in os-web** — operators cannot complete the terminate path from UI without another API client.
- **Primary `roleKey` is arbitrary string** with invite options bootstrapped from existing data — risk of inventing/ghost roles and no empty-tenant bootstrap.

### P1

- **Admin history incomplete:** reasons ignored; before/after rarely written; no employee history UI.
- **Delegation UX partial:** revoke-by-id, no list, expiry event unused, limited scopes.
- **Invitation state partial:** invited email often blank on detail; no resend.
- **Access review** is only directory filters + static Accesos page.
- **`RetryAuthProviderSync` / provider side-effect failures** have no admin UI recovery.

### P2

- Department CRUD UI.
- Rehire UI.
- In-app password reset (likely remain provider-owned).
- Device inventory / per-device revoke.
- Emit `delegation.expired` or cleanup job.
- HR cargo/function fields (if ever needed as non-authorizing labels only).

---

## Proof notes (non-blocking)

Automated tests prove substantial backend lifecycle (invite/activate/suspend/terminate/rehire/delegation expiry authz/open-work terminate gate) under `packages/os-workforce`, `packages/os-database` integration tests, and `apps/os-api` HTTP tests. UI wiring proven by source/contract tests (`people-v1.test.ts`, `ui-2b.test.ts`). Hosted/browser verification is **out of scope** for this receipt and must not be claimed here.
