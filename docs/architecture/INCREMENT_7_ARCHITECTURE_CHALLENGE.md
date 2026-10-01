# Increment 7 — Architecture Challenge

**Mode:** Analyze → Challenge → Verify → STOP  
**No code, no runtime, no Step 9/10**  
**Evidence:** `ARCHITECTURE_EVIDENCE_REGISTER.md`

---

## Executive verdict

**CONDITIONAL PASS**

The **architected** foundation (ADRs 0003–0011, handoff manifest, storage/API/integration contracts) is **sufficient to phase implementation** without redesigning Person/Party/Event/Work/Finance boundaries — **if** implementation follows steps 10–15 as new foundation packages and does **not** extend the legacy commercial Prisma schema as the OS spine.

**Conditions:**

1. **FG-01:** Explicit legacy-vs-foundation migration contract at Step 9 (see Foundation Gaps).  
2. **FG-03:** BusinessEvent supersedes ActivityEvent with migration plan at Step 11.  
3. **RD-06:** Auth self-service flows documented before Step 10 implementation.  
4. **RD-04:** Territory/scope model aligned before Commercial step 16.

Without these conditions, multi-agent work risks **architectural drift** into the existing `User`/`Account`/`Invoice` demo model.

---

## B. Spine challenge (lanes A–F)

### Verification: spine remains true

| Lane | Owns (authoritative) | Consumes | Must never duplicate | LOCKED behavior |
|------|----------------------|----------|----------------------|-----------------|
| **A** Tenant/Auth/Capability | Organization, CapabilityState, AuthIdentity link | — | Tenant boundary | Capabilities show LOCKED honestly |
| **B** Workforce | Person, Member, assignments, Delegation | A, D | Collapsed User | Revoked access; Person retained |
| **C** PartyGraph | Party, PartyRoleAssignment, Contact, Lead | A, D | Customer/supplier silos | Party create OK; no fake finance on Party |
| **D** Event/Audit/Outbox | BusinessEvent, AuditLog, Outbox, Idempotency | All commands | Second event log | Append-only |
| **E** Work/Attention | WorkItem, ApprovalRequest, AttentionItem | B, C, D | Silent orphan work | Reassignment explicit |
| **F** Query | Read models, search indexes | All + D | Query as mutation | Stale metadata surfaced |

**Evidence:** `handoff-manifest.yaml` `multi_agent_lanes`; ADRs 0003–0005, 0008; `ISALWA_OS_HANDOFF_MANIFEST.md` §Multi-agent.

### Future department consumption (summary)

| Department | Consumes from spine | Owns | External authority | LOCKED |
|------------|---------------------|------|-------------------|--------|
| Commercial G | B, C, D, E, F, I projection | Opp, Quote, Order, CommercialAccount lens | Finance projection | No fake AR |
| Finance I | D, H, C | FinanceProjection only | Accounting system | Entire lane LOCKED |
| Warehouse | C, D, F | Stock events (future) | WMS/ERP | Cannot emit stock.confirmed |
| Purchasing | C, D | PO (future) | Supplier Party id | Locked |
| Operations | C, D, E | Delivery exceptions | Carrier systems | Locked |
| Logistics | C, H | Shipment requests | Carrier | Deferred |
| Customer Service | C, messaging foundation | Threads on Party | WhatsApp provider | Uses Party not inbox silo |
| HR/Workforce admin | B | — (admin UI on B) | — | — |
| Compliance | D, AuditLog | Policies refs | — | — |
| Command Center | F, CapabilityState | Attention ranking | — | Locked dept honesty |
| AI/Research | F, events, ApprovedKnowledge | Suggestions log | Model provider | Same auth as user |

**Evidence:** `CROSS_DEPARTMENT_DEPENDENCIES.md` dependency matrix.

### FOUNDATION_GAP from spine test

| ID | Gap | Why |
|----|-----|-----|
| **FG-01** | Legacy Prisma schema ≠ architected spine | `schema.prisma` `User`/`Account`/`Invoice`/`ActivityEvent` implemented; architected entities absent |
| **FG-02** | Territory scope not in handoff spine | `ENGINEERING_MASTER_PLAN.md` + Prisma `Territory`/`UserRole.territoryId` — Commercial needs geographic scope |
| **FG-03** | Dual event systems | `COMMERCIAL_EVENT_CATALOG` + `ActivityEvent` vs architected `BusinessEvent` |

No additional identity/event/notification/ledger systems required if FG-01–03 are governed at Step 9–11.

---

## C. Admin self-service test (25 scenarios)

**Legend:** ENG = engineering required for ordinary admin path?

| # | Scenario | Command | Auth | Storage | Event | Projection | Audit | UX (target) | Failure | Recovery | ENG? |
|---|----------|---------|------|---------|-------|------------|-------|-------------|---------|----------|------|
| 1 | Add employee | CreatePerson + CreateMember | `people.admin` | person, organization_member | member.created | member list | AuditLog | Admin form | validation fail | show errors | NO |
| 2 | Invite email | InviteMember | `people.admin` | auth_identity invited | member.invited | invite status | ✓ | Email invite | email down | retry queue | NO* |
| 3 | Password create | ActivateMember + auth provider | auth flow | auth_identity | member.activated | session | ✓ | Onboarding | weak password | policy message | NO* |
| 4 | Email change | ChangeMemberEmail (IMPLEMENTATION_FOLLOW-UP) | member + policy | auth_identity | member.email.changed | profile | ✓ | Self-service or admin | conflict | verify new email | **GAP SG-01** |
| 5 | Lose access | SuspendMember or auth revoke | admin or system | access_status | member.suspended | auth projection | ✓ | Locked screen | — | admin reactivate | NO |
| 6 | Suspended | SuspendMember | `people.admin` | access suspended | member.suspended | no session | ✓ | Banner | — | reactivate | NO |
| 7 | Return from leave | ReactivateMember / end leave | `people.admin` | employment active | member.reactivated | work queue | ✓ | Restored access | — | — | NO |
| 8 | Change department | ChangeDepartment | `people.admin` | department_assignment end+new | member.department.changed | auth asOf | ✓ | Admin org UI | open work | ReassignWork policy | NO |
| 9 | Change manager | ChangeManager | `people.admin` | manager_assignment | member.manager.changed | escalation paths | ✓ | Admin org UI | — | — | NO |
| 10 | Change role | ChangeRole | A or B | role_assignment | member.role.changed | permissions | ✓ | Admin | finance role | class B approval | NO |
| 11 | Temporary delegation | GrantDelegation | A/B | delegation | delegation.granted | effective auth | ✓ | Delegate picker | missing expiry | reject command | NO |
| 12 | Delegation expires | system job | — | delegation ended | delegation.expired | auth refresh | ✓ | Delegate loses extra perms | job lag | manual revoke | NO |
| 13 | Termination | TerminateMember | `people.admin` | access revoked, employment ended | member.terminated | no session | ✓ | Admin workflow | open work | mandatory reassignment | NO |
| 14 | Rehire | RehireMember | `people.admin` | new member period | employment.restarted | member list | ✓ | Admin | — | — | NO |
| 15 | Historical attribution | — (read) | query asOf | events at occurredAt | timeline | audit | Reports use past auth | — | — | NO |
| 16 | Reassign open work | ReassignWork | manager/admin | work_item owner | task.reassigned | open work list | ✓ | Manager UI | permission | escalate | NO |
| 17 | Pending approvals | escalate / delegate | policy | approval_request | approval.escalated | approval queue | ✓ | Backup approver | no backup | admin policy | NO |
| 18 | Notifications to revoked | — | system | notification suppress | — | badge count | ✓ | Silent | — | — | NO |
| 19 | Tenant isolation | all queries | tenant first | organizationId filter | — | — | ✓ | 403 | leak attempt | audit alert | NO |
| 20 | Admin self-grant finance | ChangeRole | **deny** by policy | — | — | — | ✓ | Error | SoD violation | audit | NO (policy) |
| 21 | Add administrator | GrantRole admin scope | B / `org.admin` | role_assignment | member.role.changed | — | ✓ | Admin users | — | — | NO |
| 22 | Recover user access | ReactivateMember / reset via auth | `people.admin` | access active | member.reactivated | session | ✓ | Admin reset | auth provider down | manual break-glass | NO* |
| 23 | Rotate integration creds | RotateIntegrationCredential | C/D | credentialRef vault | integration.credential.rotated | health | ✓ | Admin integration UI | bad cred | degraded mode | **YES** connect flow C/D |
| 24 | Integration health | GetIntegrationHealth | `integration.admin` | connection status | — | health projection | — | Status dashboard | — | — | NO |
| 25 | See failure history | ListIntegrationEvents / audit | `integration.admin` | audit_log | integration.* | timeline | ✓ | Ops detail | — | — | NO |

\*Email/auth provider is class C/D for **initial connect**, not per-employee operation.

### Admin scenario gaps

| ID | Gap | Severity | Gate |
|----|-----|----------|------|
| **SG-01** | `ChangeMemberEmail` not in API_SERVICE_CONTRACT command list | Medium | BEFORE STEP 10 |
| **SG-02** | Password reset/self-service flow not in WORKFORCE lifecycle doc | Medium | BEFORE STEP 10 (RD-06) |
| **SG-03** | Break-glass workflow documented in ADR-0003 only — no admin recovery playbook | Low | CAN DEFER |

---

## D. Master data handoff test

| Operation | Command(s) | Single PartyGraph? | Parallel silo risk |
|-----------|------------|--------------------|--------------------|
| Create customer | CreateParty + AssignPartyRole(customer) + optional CommercialAccount | YES | Legacy `Account` table if FG-01 ignored |
| Create supplier | CreateParty + AssignPartyRole(supplier) | YES | — |
| Vendor | AssignPartyRole(vendor or supplier) | YES | — |
| Distributor / partner | AssignPartyRole | YES | — |
| Contact | UpdateContact | YES | Legacy Contact → Account only |
| Customer + supplier same org | Multiple PartyRoleAssignment on one Party | YES | **Architected correctly** |
| Change legal name | UpdateParty / class B | YES | — |
| Change NIT | class B fiscal command | YES | — |
| Deactivate / reactivate | DeactivateParty / ReactivateParty | YES | — |
| Merge duplicate | RequestPartyMerge → ApprovePartyMerge | YES | — |
| Correct master data | UpdateParty / UpdateContact | YES | — |
| Change commercial owner | ReassignCommercialAccountOwner (G lane) | YES | Legacy ownerUserId on Account |
| Add/remove contacts | UpdateContact | YES | — |

**Verdict:** PartyGraph architecture **sufficient** if implementation uses C lane entities, not Prisma `Account` extension.

**Evidence:** `PARTYGRAPH_LIFECYCLE.md`, ADR-0004, `party-lifecycle.ts` derive.

---

## E. Storage challenge (senior DB architect view)

### Entity storage matrix (condensed)

| Entity | SoT | Primary ID | Tenant | Effective date | Immutable history | Soft delete | Concurrency | Index notes | Ambiguity |
|--------|-----|------------|--------|----------------|-------------------|-------------|-------------|-------------|-----------|
| Person | person | personId | via Member | — | events/audit | never hard delete | version on profile? | email lookup | vs Party person kind **DG-02** |
| OrganizationMember | organization_member | memberId | organizationId | employment periods | assignments | terminate | version | org+status | — |
| AuthIdentity | auth_identity | authId | via Person | — | login audit | revoke | — | provider subject id | Link to external auth |
| RoleAssignment | role_assignment | id | org | effectiveAt/endedAt | rows permanent | end-date | — | member+asOf | — |
| DepartmentAssignment | department_assignment | id | org | effectiveAt/endedAt | rows | end-date | — | member+asOf | vs Team **DG-04** |
| ManagerAssignment | manager_assignment | id | org | effectiveAt/endedAt | rows | end-date | — | member+asOf | — |
| Delegation | delegation | id | org | starts/expires | rows | revoke | — | delegate+expiry | — |
| Party | party | partyId | organizationId | fiscal effective? | merge lineage | deactivate | version | nit, name search | FiscalIdentity **DG-05** |
| PartyRoleAssignment | party_role_assignment | id | org | effectiveAt/endedAt | history | end-date | — | party+role | — |
| Contact | contact | id | org | — | history events | update | — | phone, email | Person link optional |
| CommercialAccount | commercial_account | id | org | — | — | deactivate | version | partyId, owner | — |
| Lead | lead_draft | id | org | — | import batch | resolve/discard | — | staging status | — |
| WorkItem | work_item | id | org | — | ownership events | complete/cancel | **version required** | owner, status | vs Task **FG-01** |
| ApprovalRequest | approval_request | id | org | snapshot at request | terminal immutable | — | — | approver, status | Not in legacy schema |
| BusinessEvent | business_event | eventId | org | occurredAt | **append-only** | never | — | org+time, aggregate | vs ActivityEvent **FG-03** |
| AuditLog | audit_log | id | org | — | append-only | never | — | org+time | — |
| IntegrationConnection | integration_connection | id | org | — | connect log | disconnect | — | type+status | — |
| FinanceProjection | finance_projection | id | org | projection time | sync log | refresh | — | party+source | vs Invoice table **FG-01** |
| CapabilityState | capability_state | capabilityKey | org | state transitions | config versions | deprecated | — | org+capability | vs FeatureFlag |

### Storage gaps

| ID | Gap | Severity | Owner | Gate |
|----|-----|----------|-------|------|
| **STG-01** | No unified event table shape in DB | High | D | BEFORE STEP 11 |
| **STG-02** | Outbox table unspecified beyond name | Medium | D | BEFORE STEP 11 |
| **STG-03** | Territory storage undefined in new model | Medium | A/G | BEFORE COMMERCIAL |
| **STG-04** | Retention/archive policy undefined | Low | Ops | CAN DEFER |

---

## F. API challenge

### Prohibitions — architecturally enforced?

| Rule | Documented | Legacy code risk |
|------|------------|------------------|
| UI ≠ authority | API_SERVICE_CONTRACT | web → api → prisma (OK if API validates) |
| browser ≠ database | Prohibited patterns | web does not touch DB directly |
| query ≠ mutation | Command vs query | Some GET endpoints need audit at step 15 |
| client role ≠ auth | ADR-0003 | EMP AuthZ in Nest — must rebuild on Member |
| projection ≠ SoT | Finance boundary | **Invoice table is SoT in legacy** — FG-01 |

### Unresolved API contracts (MUST decide before runtime)

| ID | Contract | Gate |
|----|----------|------|
| **API-01** | Command URL pattern (`POST /v1/commands/*` vs REST) | STEP 9 |
| **API-02** | Session exchange Next ↔ Nest (EMP §2) | STEP 10 |
| **API-03** | `asOf` query parameter standard | STEP 13 |
| **API-04** | Idempotency-Key header on commands | STEP 11 |
| **API-05** | Error code catalog for governance denials | STEP 9 |
| **API-06** | ChangeMemberEmail / password reset endpoints | STEP 10 |

---

## G. Integration challenge

| Integration | System of record | OS responsibility | Adapter | Idempotency | Degraded | Reconciliation | Credential rotation | Gap |
|-------------|------------------|-------------------|---------|-------------|----------|----------------|---------------------|-----|
| Email | Provider | transactional send, templates | EmailProvider mock | message id | queue retry | — | provider API key in vault | IMPLEMENTED mock only |
| WhatsApp | Meta | message artifacts, Party link | MessagingProvider | providerMessageId unique in Prisma | manual capture | match queue | WABA token rotate | Partial in legacy schema |
| Document storage | Blob store | metadata, ACL | StorageProvider mock | checksum | local fail | — | storage key rotation | Mock only |
| Accounting | External | FinanceProjection | Finance adapter | ingest keys | LOCKED | projection.conflict | OAuth refresh | **LOCKED RD-03** |
| Banking | Bank | payment ingest events | Banking adapter | idempotency key | manual CSV | reconcile | API key | DEFERRED |
| Fiscal/SIN | Government/intermediary | — | Fiscal adapter | — | DEFERRED | — | cert rotation | DEFERRED |
| Logistics | Carrier | delivery requests | Logistics | external id | DEFERRED | — | — | DEFERRED |
| External accountant | Human+files | quarantine import | Manual/CSV | batch id | always available | human confirm | file-based | Documented |
| Auth provider | Provider | AuthIdentity link | Auth.js (EMP) | — | local creds fallback | — | OIDC secret rotate | STEP 10 |

### Integration gaps

| ID | Gap | Severity | Gate |
|----|-----|----------|------|
| **INT-01** | Webhook ordering strategy not specified | Medium | BEFORE STEP 11 |
| **INT-02** | Retry storm limits / circuit breaker | Medium | BEFORE STEP 16 |
| **INT-03** | Partial batch import failure UX | Medium | BEFORE COMMERCIAL ingest |
| **INT-04** | Generic IntegrationConnection vs MessagingChannel only | Medium | BEFORE STEP 10 H lane |

---

## H. AI architecture challenge

### Required intelligence layers

| Layer | Supported in architecture? | Evidence | Gap |
|-------|--------------------------|----------|-----|
| OS-wide cross-dept (authorized) | YES | Foundation Command Center, CROSS_DEPT | Implementation deferred |
| Department-specific | YES | Capability gating ADR-0006 | No module contract file |
| Role-aware | YES | ADR-0003 effective auth | — |
| Resource-aware | YES | Field-level masking ADR-0003 | AI-03 client list needed |
| Capability-aware | YES | LOCKED = no fake intel | TESTED in derive |

### AI prohibitions (ADR-0009)

Silent merge, price, credit, fiscal, permissions, external send — **ARCHITECTED**.

### AI gaps

| ID | Gap | Severity | Gate |
|----|-----|----------|------|
| **AI-01** | No `packages/os-ai` contract (prompt isolation per dept) | Medium | BEFORE COMMERCIAL AI features |
| **AI-02** | Kill switch implementation unspecified | Low | CAN DEFER |
| **AI-03** | Department context pack boundaries not in manifest | Medium | BEFORE COMMERCIAL |

**Verdict:** AI will not become parallel SoT if ADR-0009 enforced; department isolation needs **contract at step 9**, not new spine.

---

## I. Future-department simulation

See §B table. **No department requires new identity/event/ledger system** if spine + FG-01–03 addressed.

| Department | FOUNDATION_GAP? |
|------------|-----------------|
| Commercial | NO (consumes spine) — YES if built on legacy Account |
| Finance | NO — LOCKED until adapter |
| Operations, Purchasing, Inventory, Logistics | NO — event consumers |
| HR admin | NO — admin UI on B |
| Compliance | NO — audit read |
| Command Center | NO — F + CapabilityState |
| AI/Research | NO — AI-01 contract only |

---

## J. Operational failure test

| Failure | Detection | SoT | Recovery | User visibility | Audit | Retry | Manual fallback |
|---------|-----------|-----|----------|-----------------|-------|-------|-----------------|
| Email down | provider error | outbox queue | retry DLQ | "notification delayed" | integration.error | exponential | in-app only |
| WhatsApp down | health degraded | messages in OS once ingested | degraded mode | Command Center banner | ✓ | webhook retry | manual message log |
| Accounting down | stale projection TTL | external when connected | reconciliation queue | "balance not verified" | ✓ | poll retry | Excel import |
| Duplicate webhook | idempotency key | single event | return same id | none | duplicate logged | no double write | — |
| Out-of-order webhook | version/effectiveAt | event time | projection reorder | stale flag | ✓ | — | reconcile |
| DB transaction fail | command error | no partial commit | user retry | error | failed command | user retry | — |
| Projection fail | worker lag metric | authoritative tables | replay from outbox | stale badge | worker errors | BullMQ retry | — |
| Stale search | index lag doc | authoritative DB | reindex | "search may be incomplete" | — | reindex job | direct id lookup |
| Credential expires | health check | vault | rotate + reconnect | integration degraded | ✓ | — | manual |
| User terminated + work | lifecycle policy | work_item | ReassignWork | manager queue | ✓ | — | admin |
| Manager terminated | escalation | approval policy | escalate | approval pending | ✓ | — | admin |
| External data conflict | conflictState | reconciliation | WorkItem | attention item | ✓ | — | human |
| Duplicate Party | match queue | Party | merge or reject | duplicate suggestion | ✓ | — | admin |
| Bad merge request | Approve rejects | Party | RejectPartyMerge | error | ✓ | — | — |
| Network mid-command | idempotent command | txn boundary | safe retry | idempotent response | partial none | client retry | — |
| AI retrieval down | provider error | no AI write | degrade to rules | "assistant unavailable" | — | retry | rules tier |
| Consumer behind | queue depth | events | scale worker | delayed attention | — | retry | — |

**Gap:** Webhook ordering (**INT-01**) and projection lag SLOs not numerically defined — CAN DEFER to ops runbook.

---

## K. Security / credential lifecycle

| Topic | Architected? | Implemented? | Admin without Carmen? |
|-------|--------------|--------------|----------------------|
| Password create (invite) | Partial EMP | User.passwordHash in legacy | YES via auth provider |
| Password reset | SG-02 gap | Auth.js path in EMP | YES if documented |
| Email change | SG-01 gap | — | Policy-dependent |
| Session revocation | ADR-0003 access revoke | — | YES on terminate |
| Invitation lifecycle | WORKFORCE doc | — | YES |
| MFA future | mfaEnabled in legacy User | column exists | Config when enabled |
| Role changes | effective-dated | UserRole no dates | YES |
| Delegation | expiry required | — | YES |
| Termination | revoke access | — | YES |
| Integration credential rotation | INTEGRATION_CONTRACT | — | View health YES; rotate C/D |
| Secret storage | credentialRef vault | env vars in apps | Engineering for new types |
| Break-glass | ADR-0003 | — | Carmen audited — SG-03 |
| Tenant isolation | ADR-0003 | orgId on legacy tables | YES |
| Audit actor | BusinessEvent + AuditLog | AuditLog exists | YES |

---

## L. Client discovery

See `INCREMENT_7_DISCOVERY_MATRIX.md` — **no invented answers**.

---

## M. RD-01, RD-02, RD-03

See `UPDATED_CLIENT_DECISIONS.md`.

**Summary:** Foundation can proceed with placeholders for RD-01 and RD-03; RD-02 thresholds needed before Commercial credit/discount features.

---

## N. Documentation gaps (DG-01–06)

| ID | Resolution | Why |
|----|------------|-----|
| **DG-01** Account vs CommercialAccount | **RESOLVE BEFORE STEP 9** | Shared types must use `CommercialAccount`; legacy `Account` mapped explicitly |
| **DG-02** Person vs Party(person) | **RESOLVE BEFORE STEP 9** | Type discriminant + linking rules in contracts spec |
| **DG-03** Blocker | **RESOLVE BEFORE STEP 14** | WorkItem subtype or tag — not blocking foundation |
| **DG-04** Team | **KEEP DEFERRED** unless client needs sub-dept teams in v1 |
| **DG-05** FiscalIdentity | **RESOLVE BEFORE STEP 9** | Fiscal fields on Party + change events — table shape at schema |
| **DG-06** REST command URL | **RESOLVE BEFORE STEP 9** | One command style for all agents |

---

## O. Multi-agent readiness (lanes A–J)

| Lane | Owner | Input contracts | Output contracts | Future packages | Forbidden | Contract tests | Handoff artifact | Review gate |
|------|-------|-----------------|------------------|-----------------|-----------|----------------|------------------|-------------|
| A | Foundation | — | org, capability, auth link | os-foundation | duplicate tenant | tenant isolation tests | manifest YAML | Step 9 sign-off |
| B | Workforce | A, D | member.*, delegation.* | os-workforce | User collapse | effective-dated auth tests | manifest commands | Cross-lane if shared entity |
| C | PartyGraph | A, D | party.*, contact.* | os-party | master silos | Party multi-role tests | manifest | Cross-lane |
| D | Events | all commands | events, audit | os-events | second log | outbox + idempotency tests | manifest event fields | **Mandatory** for new event types |
| E | Work | B,C,D | work.*, approval.* | os-work | orphan work | reassignment tests | WORKFORCE doc | Step 14 |
| F | Query | all | read DTOs | os-query | query mutation | auth filter tests | STORAGE projections | Step 15 |
| G | Commercial | B,C,D,E,F,I | commercial.* | os-commercial | fork spine | commercial on Party tests | CROSS_DEPT | Step 16 |
| H | Integrations | A,D,C | integration.* | os-integrations | secrets in client | adapter contract tests | INTEGRATION_CONTRACT | New adapter type |
| I | Finance | D,H,C | finance projection | os-finance | second ledger | projection stale tests | FINANCE_BOUNDARY | Step 19 |
| J | QA/Security | all | CI gates | os-contracts | unreviewed shared change | contract suite | evidence register | Every PR to shared packages |

**Shared entities** (Person, Member, AuthIdentity, Party, PartyRoleAssignment, BusinessEvent, AuditLog, WorkItem, CapabilityState, IntegrationConnection, FinanceProjection) — **CROSS-LANE CHANGE REQUEST** required.

---

## P. Findings summary

### FOUNDATION_GAPS

| ID | Severity | Evidence | Impact | Lane | Gate | Action |
|----|----------|----------|--------|------|------|--------|
| FG-01 | **Critical** | `schema.prisma` vs handoff entities | Drift if agents extend legacy schema | All | STEP 9 | Migration/parallel spec in shared contracts |
| FG-02 | **High** | Territory in EMP/Prisma, absent manifest | Commercial scope wrong | A/G | BEFORE COMMERCIAL | Add territory to step 9 spec or map to dept scope |
| FG-03 | **High** | ActivityEvent vs BusinessEvent | Dual event systems | D | STEP 11 | Event migration + catalog merge |

### CLIENT_DECISIONS

RD-01 (defer labels), RD-02 (thresholds before Commercial credit), RD-03 (defer until Finance), RD-04 (territory), RD-06 (auth self-service policy). See `UPDATED_CLIENT_DECISIONS.md`.

### DOCUMENTATION_GAPS

DG-01, DG-02, DG-05, DG-06 → STEP 9; DG-03 → STEP 14; DG-04 deferred.

### IMPLEMENTATION_FOLLOW_UPS

Prisma mapping, OpenAPI, break-glass playbook, retention policy, projection SLOs, AI module package — per Increment 6 IF-01–08.

### SECURITY_GAPS

SG-01 ChangeMemberEmail command; SG-02 password reset lifecycle doc; SG-03 break-glass playbook.

### INTEGRATION_GAPS

INT-01 ordering; INT-02 circuit breaker; INT-03 partial import; INT-04 generic IntegrationConnection.

### AI_GAPS

AI-01 department context contract; AI-03 sensitive field list from client (AI-03 discovery).

### STORAGE_GAPS

STG-01–04 as above.

### API_GAPS

API-01–06 as above.

### MULTI_AGENT_GAPS

**MG-01:** No `packages/os-*` yet — expected; manifest defines boundaries.  
**MG-02:** Without FG-01 governance, parallel agents may edit `packages/database` legacy schema — **forbid in lane rules at Step 9**.

---

## Verification chain (required for future agents)

```
PLANNED (manifest/ADR)
  → IMPLEMENTED (code in owned lane package)
  → TESTED (contract/boundary test)
  → INTEGRATED (cross-lane test or e2e)
  → VERIFIED (evidence register updated)
```

**Do not accept IMPLEMENTED from documentation alone** — see `ARCHITECTURE_EVIDENCE_REGISTER.md`.

---

## Final gate

| Result | **CONDITIONAL PASS** |
|--------|----------------------|
| Why pass | Spine A–F coherent; PartyGraph; admin A/B; Finance LOCKED; multi-agent lanes; 0 blockers in Increment 6 audit hold after re-challenge |
| Conditions | FG-01, FG-03 at Step 9/11; SG-01/SG-02/RD-06 at Step 10; FG-02/RD-04 before Commercial |
| Why not full PASS | Legacy runtime contradicts architected finance and identity models; must be explicitly governed before coding |

**Do not start Step 9 or Step 10 until this gate is reviewed and FG-01 resolution approach is approved.**
