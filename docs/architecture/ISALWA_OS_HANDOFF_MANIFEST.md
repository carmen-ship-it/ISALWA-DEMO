# ISALWA OS — Handoff Manifest

**Increment:** 6  
**Status:** Implementation-ready architecture handoff — **no runtime code**  
**Audience:** OS implementation team, multi-agent engineering lanes, ISALWA leadership  
**Machine-readable companion:** [`handoff-manifest.yaml`](./handoff-manifest.yaml)  
**Audit:** [`HANDOFF_ARCHITECTURE_AUDIT.md`](./HANDOFF_ARCHITECTURE_AUDIT.md)

---

## Purpose

This manifest is the **bridge** between approved architecture and future OS implementation. It preserves **full-system direction** while keeping **Commercial as the first activated capability lane**.

Implementation teams must not reinterpret ADRs or lifecycle docs independently — this document is the consolidated contract.

**Do not build from this file alone** — ADRs and source architecture docs remain authoritative for nuance; this manifest indexes and unifies them.

---

## Classification legend

| Tag | Meaning |
|-----|---------|
| **APPROVED** | Binding architecture decision |
| **PROPOSED** | Direction accepted for planning; details may evolve |
| **REQUIRES_CLIENT_CONFIRMATION** | Cannot become ISALWA fact without client input |
| **DEFERRED** | Explicitly later phase |
| **LOCKED** | Capability or integration not active |
| **IMPLEMENTATION_FOLLOW-UP** | Resolved at schema/API step, not a design gap |

---

## A. Tenant / Organization

**Status:** APPROVED

### Tenant identity

| Field | Contract |
|-------|----------|
| `organizationId` | UUID — boundary for all tenant-owned data |
| `legalName` | Display; governed change if fiscal impact (class B) |
| `status` | `active` \| `suspended` \| `archived` |
| `dataOrigin` | `production` \| `demo` \| `simulation` — never mixed authoritative truth |

### Isolation

- Every operational row: `organizationId` (ADR-0003)  
- APIs enforce tenant **before** resource ACL  
- AI retrieval uses **same** filters as user session  
- Architect `ws_isalwa` ≠ OS production tenant  
- Demo tenant isolated — ADR-0009  

### Organization lifecycle

| State | Meaning |
|-------|---------|
| `provisioning` | Tenant created; capabilities mostly LOCKED |
| `active` | Normal operation |
| `suspended` | Admin action; read-only or blocked per policy |
| `archived` | Export + cold retention; no new writes |

Events: `organization.created`, `organization.suspended`, `organization.archived`

### Capability registry

**Owner lane:** A (Foundation) + governed activation (B)

| State | Meaning |
|-------|---------|
| `LOCKED` | No authoritative facts in domain |
| `APPROVED` | Planificación / leadership approved activation path |
| `CONNECTING` | Integration in progress |
| `ACTIVE` | Full lane operation |
| `DEGRADED` | Partial; manual fallback |
| `DEPRECATED` | Future — sunset path |

Entity: `CapabilityState` — authoritative in `capability_state` (STORAGE_CONTRACT)

Command Center, AI, workflows, reports **must** respect state (ADR-0006).

### Configuration ownership

| Config | Class |
|--------|-------|
| Department tree | CONFIGURABLE (A) |
| Role catalog (within system capabilities) | GOVERNED (B) |
| Capability activation | GOVERNED (B) + engineering connect (C/D) |
| New schema entity | ENGINEERING (C) |
| New event type in shared spine | ENGINEERING (C) — cross-lane review |

---

## B. Workforce

**Status:** APPROVED — ADR-0010, WORKFORCE_ORGANIZATION_LIFECYCLE

### Entity separation (non-negotiable)

```
Person (canonical human, cross-employment)
  └── OrganizationMember (tenant employment period)
        ├── AuthIdentity (login credentials)
        ├── RoleAssignment (effective-dated)
        ├── DepartmentAssignment (effective-dated)
        ├── ManagerAssignment (effective-dated)
        └── Delegation (scoped, expiring)
```

**Never** collapse into one generic `User` row for all semantics.

### Person

| Aspect | Contract |
|--------|----------|
| Authoritative | `person` table |
| ID | Permanent — survives termination |
| Delete policy | **Never hard-delete** |
| Distinction | Workforce **Person** ≠ Party `partyKind: person` (external). Link via Contact when same human is also external contact |

### OrganizationMember

| Aspect | Contract |
|--------|----------|
| Authoritative | `organization_member` |
| `employmentStatus` | `pending_start`, `active`, `on_leave`, `terminated` |
| `accessStatus` | `invited`, `active`, `suspended`, `revoked` |
| Termination | Revoke access; retain Person + audit |
| Rehire | Same Person; new membership period |

### AuthIdentity

| Aspect | Contract |
|--------|----------|
| Authoritative | `auth_identity` |
| Links | `personId` |
| Invitation | `invited` → `active` on activation |
| Revocation | On termination/suspension — credentials invalidated |

### RoleAssignment / DepartmentAssignment / ManagerAssignment

| Aspect | Contract |
|--------|----------|
| Effective dating | `effectiveAt`, `endedAt` — **no silent overwrite** |
| Queries | Support `asOf` for historical auth (ADR-0003) |
| Projection | Permission projection derived at query time |

### Delegation

| Field | Required |
|-------|----------|
| `delegatorMemberId` | ✓ |
| `delegateMemberId` | ✓ |
| `scope` | Capability/resource scope |
| `startsAt` | ✓ |
| `expiresAt` | **Required** — no permanent delegation without policy exception |
| `revokedAt` | Optional |
| Audit | Actions attribute `onBehalfOfMemberId` |

### Employment lifecycle (commands)

| Scenario | Commands | Events (illustrative) |
|----------|----------|----------------------|
| New employee | Create Person/Member, InviteMember | `member.invited` |
| Activation | ActivateMember | `member.activated` |
| Department transfer | ChangeDepartment | `member.department.changed` |
| Role change | ChangeRole | `member.role.changed` |
| Manager change | ChangeManager | `member.manager.changed` |
| Leave / suspension | SuspendMember | `member.suspended` |
| Termination | TerminateMember + ReassignWork | `member.terminated` |
| Rehire | RehireMember | `employment.restarted` |
| Delegation | GrantDelegation, RevokeDelegation | `delegation.granted`, `delegation.revoked` |

### Work / approval on lifecycle change

| Artifact | Policy |
|----------|--------|
| Open WorkItems | Explicit ReassignWork, delegate, or manager queue — **no silent orphan** |
| Pending approvals | Escalate to backup/delegation — **no auto-approve transfer** |
| AttentionItems | Recompute scope; auto-resolve only if condition cleared |
| Notifications | Suppress for revoked/suspended |
| CommercialAccount ownership | Governed reassignment if owner terminated |

### Historical attribution

**APPROVED:** Past actions use authorization at `occurredAt`, not current department/role.

---

## C. PartyGraph

**Status:** APPROVED — ADR-0004, PARTYGRAPH_LIFECYCLE

### Core rule

**One Party — multiple PartyRoleAssignments.** No customer master, supplier master, vendor master silos.

### Party

| Aspect | Contract |
|--------|----------|
| `partyKind` | `organization` \| `person` |
| Authoritative | `party` |
| Fiscal | NIT, razón social — governed (class B) |
| Deactivate | Soft — no hard delete if financial history |
| Merge | Class B — lineage `mergedFromPartyId` |

### PartyRoleAssignment (effective-dated roles)

Roles (extensible catalog — new role **type** in schema = C):

`customer`, `supplier`, `vendor`, `distributor`, `partner`, `contractor`, `logistics_provider`, `financial_counterparty`, …

### Contact

Person ↔ organization Party — phone, email, WhatsApp handles. Unified ingest resolves here.

### CommercialAccount

Commercial **lens** on Party with `customer` role. Opportunity, Quote, Order attach here.

**Canonical name:** `CommercialAccount` (Foundation L1 "Account" is alias — see audit DG-01).

### Lead

Staging until resolution pipeline — not permanent duplicate Party.

### Commands

`CreateParty`, `UpdateParty`, `DeactivateParty`, `ReactivateParty`, `AssignPartyRole`, `EndPartyRole`, `UpdateContact`, `RequestPartyMerge`, `ApprovePartyMerge`, `RejectPartyMerge`

### Finance (LOCKED)

OS does not invent AR balance on party create. Fiscal conflicts → reconciliation attention when Finance connected.

---

## D. Work / Approval

**Status:** APPROVED — ADR-0005

### WorkItem

| Aspect | Contract |
|--------|----------|
| Meaning | Human obligation — distinct from event |
| Ownership | owner, collaborators, watchers — not `assignedTo` alone |
| History | `task_assigned`, `task_reassigned` events |
| Concurrency | Optimistic version on status |
| Dependencies | Explicit between WorkItems on same subject |

### ApprovalRequest

| Aspect | Contract |
|--------|----------|
| Outcome | Immutable once terminal |
| Snapshot | Approval context frozen at request time |
| Delegation | Valid delegate may act within scope + expiry |
| Lifecycle | No silent transfer on approver termination |

### Commands

`CreateWorkItem`, `ReassignWork`, `CompleteWork`, `RequestApproval`, `Approve`, `Reject`

### Blocker

**IMPLEMENTATION_FOLLOW-UP (DG-03):** May be WorkItem subtype or tag — E lane defines at step 14.

---

## E. Events (spine contract)

**Status:** APPROVED — ADR-0005, ADR-0008

### BusinessEvent fields

| Field | Purpose |
|-------|---------|
| `eventId` | Unique |
| `organizationId` | Tenant |
| `eventType` | Catalog — engineering adds via C + review |
| `occurredAt` | When it happened in business time |
| `recordedAt` | When system recorded |
| `actorMemberId` | Who acted (nullable for system) |
| `authorizationContext` | Snapshot ref for audit replay |
| `primaryEntity` | `{ type, id }` |
| `relatedEntities` | Array |
| `payload` | Type-specific JSON |
| `provenance` | `manual`, `integration`, `ai_suggestion`, … |
| `correlationId` | Trace command → events |
| `idempotencyKey` | External ingest dedup |
| `dataOrigin` | Demo/production isolation |
| `capabilityKey` | Gate — locked lane cannot emit domain facts |

### Producer / consumer model

| Role | Rule |
|------|------|
| Producer | Command handler or authorized integration ingest |
| Consumer | Projection workers, attention engine, audit, integrations |
| Client | **Never** appends events directly |

### Corrections

Compensating events — **no silent rewrite** of history.

### Transactional boundary

Authoritative write + `outbox_message` in **same DB transaction** (ADR-0008).

---

## F. Audit

**Status:** APPROVED

### Always auditable

| Category | Examples |
|----------|----------|
| Identity | Person create, member lifecycle, party merge |
| Authorization | Role change, delegation grant/revoke |
| Commercial | Quote accept, order confirm (when active) |
| Finance | Projection refresh, reconciliation resolution |
| Integration | connect, disconnect, sync, error |
| AI | Suggestion shown + human action taken |
| Admin | All class A/B commands |
| Break-glass | Time-boxed elevated access |

### AuditLog

Append-only — **no delete**. Separate from BusinessEvent (compliance vs domain memory).

---

## G. Storage

**Status:** APPROVED — STORAGE_CONTRACT (conceptual; no Prisma)

See STORAGE_CONTRACT for full table mapping. Manifest summary:

| Principle | Rule |
|-----------|------|
| Authoritative | Current committed aggregate state |
| Projections | Rebuildable from events + authoritative |
| Effective dating | Assignments use start/end |
| Deactivation | Preferred over hard delete |
| Optimistic concurrency | Version on mutable aggregates |
| Search lag | Authoritative immediate; index may lag |
| Backup | Tenant-scoped restore; events + audit required |

**IMPLEMENTATION_FOLLOW-UP:** Prisma schema at step 9 must map 1:1 — no ad hoc supplier list table.

---

## H. API / Service

**Status:** APPROVED — API_SERVICE_CONTRACT

### Flow

```
UI → HTTPS → Session (AuthIdentity) → Authorization → Handler
  → [Command] validation → transaction (writes + outbox) → async dispatcher
  → projections → Query read models
```

### Command contract (each command)

| Requirement | |
|-------------|---|
| `organizationId` | Required |
| `actorMemberId` | From session — not client-supplied |
| Authorization | Tenant + effective role + delegation + resource ACL |
| Validation | Server-side domain rules |
| Write | Authoritative tables only |
| Event | Via outbox |
| Audit | AuditLog entry |
| Response | Command result id + correlationId |

### Query contract

| Rule | |
|------|---|
| Read projections only | No side effects |
| Same auth filters | As commands |
| Stale metadata | FinanceProjection, integration health |

### Prohibited

Browser → DB; client-supplied roles; UI-only authority; query-as-mutation; duplicated domain logic in clients.

---

## I. Integrations

**Status:** APPROVED — INTEGRATION_CONTRACT; Finance **LOCKED**

### Common IntegrationConnection contract

| Field | Purpose |
|-------|---------|
| `organizationId` | Tenant |
| `integrationType` | Catalog |
| `connectionId` | Unique per tenant |
| `status` | disconnected \| connecting \| active \| degraded \| error |
| `capabilityKey` | Linked lane |
| `credentialRef` | Vault — never client bundle |
| Health | `lastSyncAt`, `lastError`, `healthCheckAt` |

### Categories

| Type | External authority | OS authority | Class | Status |
|------|-------------------|--------------|-------|--------|
| Accounting | GL, official invoice, AR/AP | Commercial commitments | D | **LOCKED** — vendor unknown |
| Fiscal/SIN | Fiscal documents | — | D | **DEFERRED** |
| Banking | Bank truth | Payment ingest events | D | **DEFERRED** |
| WhatsApp | Meta delivery | Message artifacts + Party links | D | **DEFERRED** |
| Email | Provider | Message artifacts | D | **DEFERRED** |
| Document storage | Blob | Metadata + ACL | C config | **DEFERRED** |
| Auth provider | Credentials | Member ↔ AuthIdentity | C | Step 10 |
| Logistics | Carrier | Delivery requests (future) | D | **DEFERRED** |
| External accountant | Human + files | Excel/CSV ingest | D | Fallback path |

**QuickBooks:** scaffold only — not Bolivia claim — **REQUIRES_CLIENT_CONFIRMATION**

### Modes

Webhook + idempotency, polling, Excel/CSV batch, manual confirm quarantine.

### Degraded mode

Connection `degraded` → attention + manual capture with `provenance: manual`.

### Reconciliation

`projection.conflict.detected` → WorkItem — no silent pick.

---

## J. Admin self-service

**Status:** APPROVED — ADR-0011, ADMIN_SELF_SERVICE_BOUNDARY

### Handoff target

ISALWA admins perform **class A** (and **B** where required) without engineering.

### Never bypassed

Tenant isolation, RBAC, approvals, audit, financial controls, integration boundaries.

### Matrix (summary — full list in YAML)

| Class A | Class B | Class C | Class D |
|---------|---------|---------|---------|
| Add/invite/deactivate employee | Change NIT, merge parties | New capability/schema | Connect accounting |
| Dept/manager/role (non-finance) | Credit limit, payment terms | New event contract | Connect WhatsApp |
| Reassign work | Fiscal legal name | Infrastructure | Fiscal adapter |
| Add party + roles + contacts | Approval authority change | Security model | Banking |

Admin scopes: **REQUIRES_CLIENT_CONFIRMATION** (RD-01).

---

## K. AI

**Status:** APPROVED — ADR-0009

| Rule | Contract |
|------|----------|
| Read scope | Same authorization as human user |
| Capability gating | No locked-dept fake intelligence |
| Suggestion vs decision | AI suggests; human commands decide |
| Provenance tiers | FACT → PATTERN → CONCLUSION → RECOMMENDATION |
| Audit | Log suggestions acted upon |
| Prohibited silent actions | Merge identity, price, credit, fiscal, permissions, external send |
| Kill switch | Per tier — IMPLEMENTATION_FOLLOW-UP |
| Model provenance | Log model id for acted suggestions |

---

## L. Finance

**Status:** LOCKED — ADR-0007

### Authority split

| OS authoritative | External authoritative (when connected) |
|------------------|--------------------------------------|
| Commercial objects, communications, promise-to-pay (commercial) | Official invoice, GL, official AR/AP |
| FinanceProjection (read model) | Payroll, inventory valuation |

### FinanceProjection

Fields: `invoiceRef`, `invoiceStatus`, `openBalance`, `agingBucket`, `paymentReceived`, `creditHold`, `creditTerms`, `source`, `freshness`, `conflictState`

### When LOCKED

No AR KPIs, no collection dashboard, no AI finance health, `invoice.requested` → attention only.

### No second ledger

**APPROVED** — projections only.

---

## M. Cross-department dependencies

**Status:** APPROVED — CROSS_DEPARTMENT_DEPENDENCIES

All lanes share: Tenant, Person/Member, PartyGraph, BusinessEvent, WorkItem, AttentionItem, AuditLog, scoped Query, AI auth boundary.

| From | To | Locked behavior |
|------|-----|-----------------|
| Commercial | Finance | "Finance not connected" |
| Commercial | Warehouse | "Cannot verify stock" |
| Commercial | Operations | "Delivery not connected" |
| Messaging | PartyGraph | Resolve to Contact → Party |
| AI | Every authorized capability | No locked-dept fabrication |

Locked lanes **cannot emit** authoritative domain facts.

Commercial **first** — consumes shared contracts; does not fork them.

---

## Configuration vs code

| CONFIGURABLE BY ISALWA (A) | GOVERNED (B) | ENGINEERING (C) | EXTERNAL (D) |
|----------------------------|--------------|-----------------|--------------|
| Departments | Approval thresholds | New schema entity | Accounting connection |
| Employees | Capability activation | New event contract | WhatsApp WABA |
| Normal roles (catalog) | Party merge, NIT change | New integration adapter type | Fiscal provider |
| Party master data (non-fiscal) | Credit limit | Security model | Bank feeds |
| Work reassignment (authorized) | Payment terms | Break-glass implementation | Manual accountant import |

---

## Multi-agent ownership lanes

**Status:** APPROVED for parallelization governance

| Lane | Name | Owned entities (authoritative) | Packages (future) | Produces | Consumes |
|------|------|-------------------------------|-------------------|----------|----------|
| **A** | Foundation / Tenant / Auth | Organization, CapabilityState, AuthIdentity (link) | `packages/os-foundation`, auth adapter | `organization.*`, `capability.*` | — |
| **B** | Workforce / Authorization | Person, OrganizationMember, RoleAssignment, DepartmentAssignment, ManagerAssignment, Delegation | `packages/os-workforce` | `member.*`, `delegation.*`, auth projection | A |
| **C** | PartyGraph / Identity | Party, PartyRoleAssignment, Contact, Lead | `packages/os-party` | `party.*`, `contact.*` | A, D (events) |
| **D** | Event / Audit / Outbox | BusinessEvent, AuditLog, Outbox, IdempotencyKey | `packages/os-events` | All domain events | All command lanes |
| **E** | Work / Approval / Attention | WorkItem, ApprovalRequest, AttentionItem, Notification | `packages/os-work` | `work.*`, `approval.*` | B, C, D |
| **F** | Query / Projections | Read models, search indexes | `packages/os-query` | Query APIs | All authoritative + D |
| **G** | Commercial | CommercialAccount, Opportunity, Quote, Order (lane objects) | `packages/os-commercial` | `commercial.*` | B, C, D, E, F, I (projection) |
| **H** | Integrations | IntegrationConnection, ingest adapters, document metadata | `packages/os-integrations` | `integration.*`, ingest events | A, D, C |
| **I** | Finance | FinanceProjection, reconciliation | `packages/os-finance` | `finance.*` projection events | D, H, C |
| **J** | QA / Security / Architecture | Contract tests, security gates | `packages/os-contracts`, CI | — | All |

### Lane rules (forbidden)

- Redefine shared entity in one lane without cross-lane review  
- Change shared contract without architecture review  
- Duplicate identity or event systems  
- Browser → database authority  
- Department-specific workaround for foundation problem  

### Shared contract change

Requires **CROSS-LANE CHANGE REQUEST** + gate — do not silently modify another lane.

---

## Parallelization rule

Parallel work allowed **only when**:

1. Shared contracts locked (manifest + step 9 spec)  
2. Ownership boundaries explicit (lanes above)  
3. Dependencies documented  
4. Integration test boundary per lane pair  
5. No two agents own same mutable contract  
6. Cross-lane changes reviewed  
7. Tests exist at shared boundary  

If issue affects another lane → **FOUNDATION GAP** or **CROSS-LANE CHANGE REQUEST** — stop at gate.

---

## Future implementation order

**Preserved** — change requires explicit architecture review:

| Step | Scope |
|------|-------|
| **6** | Handoff manifest ✓ |
| **7** | Client discovery (parallel) |
| **8** | ADR sign-off |
| **9** | Shared contracts spec (types only) |
| **10** | Tenant / auth / member / person |
| **11** | Events / audit / outbox |
| **12** | PartyGraph |
| **13** | Role / dept / delegation projections |
| **14** | Work / approval / reassignment |
| **15** | Query / projection framework |
| **16+** | Commercial → WhatsApp → Command Center → Finance adapter |

Commercial lane **G** starts at 16+ but must only **consume** lanes A–F contracts.

---

## Related documents

| Doc | Role |
|-----|------|
| `ISALWA_OS_FOUNDATION_SPEC.md` | Philosophy + layers |
| `WORKFORCE_ORGANIZATION_LIFECYCLE.md` | Workforce detail |
| `PARTYGRAPH_LIFECYCLE.md` | Party detail |
| `ADMIN_SELF_SERVICE_BOUNDARY.md` | A/B/C/D matrix |
| `STORAGE_CONTRACT.md` | Storage |
| `API_SERVICE_CONTRACT.md` | API |
| `INTEGRATION_CONTRACT.md` | Integrations |
| `FINANCE_ACCOUNTING_BOUNDARY.md` | Finance |
| `CROSS_DEPARTMENT_DEPENDENCIES.md` | Cross-lane |
| `docs/adr/0003`–`0011` | Binding decisions |
| `handoff-manifest.yaml` | Machine-readable index |
