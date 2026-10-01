# API / Service Contract (Conceptual)

**Status:** Increment 5.1 — **no API implementation**

---

## Request flow

```
Client UI
  → API gateway (HTTPS)
  → Session (AuthIdentity)
  → Authorization (tenant + effective role + delegation + resource ACL)
  → Command handler OR Query handler
  → [Commands only] Domain validation + human-authority policy
  → [Commands only] Transaction (authoritative writes + outbox)
  → Event dispatcher (async)
  → Projection workers
  → Query read models
```

---

## Command vs query

| Type | Rule |
|------|------|
| **Commands** | Mutate authoritative state; emit events; return command result id |
| **Queries** | Read projections only; never side-effect |
| **Events** | Internal append-only; not client-mutable |
| **Projections** | Rebuildable; stale TTL documented |

---

## Conceptual commands

### Workforce

- `InviteMember` · `ActivateMember` · `ChangeDepartment` · `ChangeRole` · `ChangeManager`  
- `SuspendMember` · `TerminateMember` · `RehireMember`  
- `GrantDelegation` · `RevokeDelegation`  

### Party

- `CreateParty` · `UpdateParty` · `DeactivateParty` · `ReactivateParty`  
- `AssignPartyRole` · `EndPartyRole` · `UpdateContact`  
- `RequestPartyMerge` · `ApprovePartyMerge` · `RejectPartyMerge`  

### Work

- `CreateWorkItem` · `ReassignWork` · `CompleteWork` · `RequestApproval` · `Approve` · `Reject`  

Each command: `organizationId`, `actorMemberId`, `correlationId`, idempotency key where external.

---

## Conceptual queries

- `GetMember` · `ListMembers` · `GetMemberEffectiveAuth(asOf?)`  
- `GetParty` · `SearchParties` · `GetPartyRoles`  
- `ListOpenWork` · `GetApproval`  
- `GetFinanceProjection` (stale/conflict metadata included)  
- `GetCapabilityState` · `GetIntegrationHealth`  

Queries apply same authorization filters as commands.

---

## Prohibited patterns

- Browser direct database access  
- Client-supplied role or permission flags trusted  
- UI-only state as authority  
- Query endpoints that mutate (hidden commands)  
- Duplicated domain rules in multiple clients — server is source of validation  

---

## OpenAPI / REST

Engineering Master Plan: REST + OpenAPI primary. Commands may be `POST /v1/commands/*` or resource-oriented with strict verb discipline — **decision at implementation**, not multiple parallel styles.

---

## Handoff

Admin self-service commands exposed only to authorized admin scopes (ADR-0011).
