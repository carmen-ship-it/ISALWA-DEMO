# Workforce & Organization Lifecycle

**Status:** Increment 5.1 — architecture only  
**Related:** ADR-0010, `STORAGE_CONTRACT.md`, `API_SERVICE_CONTRACT.md`

---

## Purpose

Minimum workforce identity lifecycle for a **multi-person company OS** — not an HRIS (no payroll, recruiting, benefits, performance suite).

---

## Concept separation (non-negotiable)

| Concept | Meaning |
|---------|---------|
| **Person** | Canonical human identity across time; survives termination and rehire |
| **OrganizationMember** | Tenant-scoped employment/membership; effective-dated |
| **AuthIdentity** | Login credential(s) linked to Person; invitation/activation |
| **RoleAssignment** | Effective-dated role + scope (capabilities projection input) |
| **DepartmentAssignment** | Effective-dated org unit membership |
| **ManagerAssignment** | Effective-dated reporting line |
| **Delegation** | Time-boxed authority grant with scope and expiry |

**Do not collapse** these into a single generic `User` row for all semantics.

---

## Employment vs access

| Field | Examples |
|-------|----------|
| **employmentStatus** | `active`, `on_leave`, `terminated`, `pending_start` |
| **accessStatus** | `invited`, `active`, `suspended`, `revoked` |

Termination: **revoke access** + end employment period — **retain Person** and all historical audit attribution.

---

## Lifecycle scenarios

### New employee (Ana)

1. Create or match **Person**  
2. Create **OrganizationMember** (`pending_start` or `active`)  
3. **Invite** → AuthIdentity (`invited`)  
4. On activation: `member.activated`, role/department/manager assignments  
5. Events: `member.invited`, `member.activated`, `role.assigned`, `department.assigned`, `manager.assigned`  
6. Audit: inviting admin as actor  

### Department transfer (Commercial → Finance)

- **Do not overwrite** department on member row without history  
- End-date previous `DepartmentAssignment`; create new with `effectiveAt`  
- Event: `member.department.changed` (previous, new, effectiveAt, actor)  
- **Authorization projection** recomputed from effective-dated roles at query time  
- **Open WorkItems:** policy → reassign or escalate to manager queue (explicit command, not silent)  
- **Pending approvals:** escalate to replacement approver or active delegation — **no auto-approve**  
- Historical actions remain attributed to actor **at time of action**  

### Role change (Representative → Manager)

- End-date old `RoleAssignment`; new assignment with effectiveAt  
- Event: `member.role.changed`  
- Approval authority and visibility refresh from projection  

### Temporary delegation

```
Delegation: delegatorMemberId, delegateMemberId, scope, startsAt, expiresAt, revokedAt?
```

- Event: `delegation.granted`, `delegation.revoked`, `delegation.expired` (system on expiry)  
- Audit attributes: delegate acted with `onBehalfOfMemberId`  
- **Does not** rewrite historical ownership  

### Leave / suspension

- `accessStatus: suspended` or employment `on_leave`  
- Optional delegation for coverage  
- Suppress notifications to absent member; attention may redirect to delegate/manager  
- Work ownership: policy — hold, delegate, or reassign via explicit workflow  

### Termination

- `accessStatus: revoked`, `employmentStatus: terminated`, `employmentEndedAt`  
- **Person retained**; AuthIdentity credentials revoked  
- **Mandatory** open-work reassignment workflow before or concurrent with revoke  
- Historical audit, events, completed work **unchanged**  

### Rehire

- Same **Person**; new **OrganizationMember** period (or reactivate with new effective range)  
- Event: `employment.restarted`  
- New role/department assignments; link to prior employment history for audit context  

### Manager change

- Effective-dated `ManagerAssignment`  
- Event: `member.manager.changed`  
- Escalation paths update; past escalations retain historical manager context  

---

## Work / attention / notification on lifecycle change

| Artifact | Policy |
|----------|--------|
| Open WorkItems | Reassign, delegate, or manager queue — **explicit** |
| Pending ApprovalRequests | Escalate to backup approver / delegation — **never silent transfer of decision** |
| AttentionItems | Recompute owner scope; auto-resolve only if underlying condition cleared |
| Notifications | Suppress for revoked/suspended access |
| Ownership on Account/Opp | Reassign via governed command if member was owner |

**No silent orphan work.**

---

## Historical attribution rule

Reports and audit for past actions use **effective authorization at occurredAt**, not current department/role.

Implementation: BusinessEvent stores actorMemberId + optional auth snapshot ref; RoleAssignment effective-dated rows for replay.

---

## Handoff

ISALWA admin (authorized) performs invite, department change, role change, deactivation — see `ADMIN_SELF_SERVICE_BOUNDARY.md`.
