# Storage Contract (Conceptual)

**Status:** Increment 5.1 — **no database implementation**  
**Purpose:** Define where truth lives before runtime schema work

---

## Principles

1. **Authoritative tables** hold current committed state per aggregate.  
2. **BusinessEvent** + **AuditLog** are append-only.  
3. **Projections** are derived and rebuildable from events + authoritative state.  
4. All tenant-owned rows include `organizationId`.  
5. **Effective-dated** relationships use start/end — not overwrite.  
6. **Deactivation** preferred over hard delete for operational entities.  

---

## Entity ownership

| Entity | Authoritative | Projection / derived | History | Delete/archive |
|--------|---------------|----------------------|---------|----------------|
| Person | `person` | search index | identity id permanent | never hard-delete |
| OrganizationMember | `organization_member` | auth eligibility | employment periods | terminate, retain |
| AuthIdentity | `auth_identity` | session cache | login audit | revoke |
| RoleAssignment | `role_assignment` | permission projection | ended rows | end-date |
| DepartmentAssignment | `department_assignment` | org views | full | end-date |
| ManagerAssignment | `manager_assignment` | escalation paths | full | end-date |
| Delegation | `delegation` | auth projection | full | expire/revoke |
| Party | `party` | search index | merge lineage | deactivate |
| PartyRoleAssignment | `party_role_assignment` | dept lenses | role history | end-date |
| Contact | `contact` | — | contact history | update |
| CommercialAccount | `commercial_account` | 360 read models | — | deactivate |
| Lead | `lead_draft` | — | import batch | resolve/discard |
| Opportunity, Quote, Order | commercial tables | timelines | version events | cancel via event |
| WorkItem | `work_item` | attention input | ownership history | complete/cancel |
| ApprovalRequest | `approval_request` | — | outcome immutable | terminal states |
| BusinessEvent | `business_event` | timelines, activity | permanent | **no delete** |
| AuditLog | `audit_log` | — | permanent | **no delete** |
| FinanceProjection | `finance_projection` | UI balances | sync log | refresh |
| AttentionItem | cache/derived | Command Center | ephemeral | auto-expire |
| Notification | `notification_delivery` | badge counts | retention policy | ack/archive |
| ApprovedKnowledge | `knowledge_version` | retrieval index | versions | retire |
| CapabilityRegistry | `capability_state` | Command Center | config versions | state transitions |
| IntegrationConnection | `integration_connection` | health projection | connect log | disconnect |
| IdempotencyKey | `ingest_idempotency` | — | TTL | expire |
| Document metadata | `document` | search | versions | retain |
| Outbox | `outbox_message` | — | until published | delete after ack |

---

## Cross-cutting

### Soft delete vs deactivate vs archive

- Operational: `status = deactivated`  
- Events/audit: immutable  
- Archive: cold storage export — not UI delete  

### Optimistic concurrency

Version column on mutable aggregates (Party, Quote, Member profile, WorkItem status).

### Effective-dated queries

Authorization and org reports support `asOf` timestamp — join assignments where `effectiveAt <= asOf < endedAt`.

### Search index lag

Writes authoritative immediately; search may lag — UI must not treat search as sole truth.

### Transactional outbox

Command transaction: authoritative row updates + `outbox_message` insert — same DB transaction (ADR-0008).

### Idempotency

External ingest keys stored with TTL; duplicate webhook returns same result id.

### Backup / restore

Tenant-scoped restore; event log + audit required for compliance restore.

### Document versioning

Quote PDF, attachments: version id; events reference version id.

---

## Concurrency expectations

- Per-aggregate optimistic locking on commands  
- Event ordering per aggregate id  
- Projection workers idempotent  

---

## Migration implication

Later Prisma/schema must map 1:1 to this contract — no ad hoc tables for “supplier list” outside Party graph.
