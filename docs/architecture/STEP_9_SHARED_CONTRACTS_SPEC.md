# Step 9 — Shared Contracts Specification

**Status:** AUTHORITATIVE for Steps 10+ implementation  
**Gate:** Foundation reconciliation (FG-01, FG-02, FG-03)  
**Machine-readable companion:** [`shared-contracts.yaml`](./shared-contracts.yaml)  
**Evidence:** [`ARCHITECTURE_EVIDENCE_REGISTER.md`](./ARCHITECTURE_EVIDENCE_REGISTER.md), Increment 7 challenge

**This document does not implement runtime.** It resolves ambiguous foundation decisions so Step 10 agents cannot reinterpret architecture.

---

## 0. Status labels (mandatory for all agents)

| Label | Meaning |
|-------|---------|
| PLANNED | Specified here or in ADR — not yet code |
| IMPLEMENTED | Runnable code exists |
| TESTED | Automated test asserts behavior |
| INTEGRATED | Cross-package or E2E path verified |
| VERIFIED | Evidence register updated with proof |
| UNKNOWN | Not decided — do not assume |

Verification chain: **PLANNED → IMPLEMENTED → TESTED → INTEGRATED → VERIFIED**

---

## 1. FG-01 — Legacy database reconciliation (DECISION)

### 1.1 Chosen strategy: **B — New foundation boundary + progressive migration**

**NOT chosen:**

| Alternative | Why rejected (repository evidence) |
|-------------|----------------------------------|
| **A — In-place transform `packages/database/prisma/schema.prisma`** | `User` is collapsed identity used by 8+ API modules (`accounts.service`, `commerce.service`, `visits.controller`, seed `universe.ts`). In-place Person/Member/Party rewrite forces simultaneous break of `apps/api` + `apps/web` + seeded demo. **IMPLEMENTED** demo depends on `Account.territoryId`, `Invoice.balanceCentavos`. |
| **C — Parallel production databases** | No operational evidence; doubles ops burden; no code supports split DB. |

### 1.2 Evidence summary

| Artifact | Status | Finding |
|----------|--------|---------|
| `packages/database/prisma/schema.prisma` | IMPLEMENTED | Milestone 2 **commercial demo** schema: `User`, `Account`, `Invoice`, `ActivityEvent`, `Territory` |
| Architected spine (ADRs, manifest) | PLANNED | `Person`, `Party`, `BusinessEvent`, `FinanceProjection` — **not in Prisma** |
| `apps/api` | IMPLEMENTED | No auth middleware; direct Prisma; `emitCommercialEvent` → `ActivityEvent` |
| `packages/contracts/PERMISSIONS` | IMPLEMENTED | Legacy permission keys (`accounts.read`, …) — not admin scopes |
| Planificación / Architect | TESTED | Empty `ws_isalwa`; OS foundation deferred |

### 1.3 Boundary rules (binding)

#### Legacy lane — `packages/database` + demo `apps/api` + `apps/web`

| Rule | Detail |
|------|--------|
| **MAY** | Bugfixes, seed fixes, demo stability, read paths for frozen commercial UI |
| **MUST NOT** | Add OS foundation entities (`Person`, `OrganizationMember`, `Party`, `BusinessEvent`) to legacy schema |
| **MUST NOT** | Add new event types to `COMMERCIAL_EVENT_CATALOG` without D-lane CROSS-LANE CHANGE REQUEST |
| **MUST NOT** | Extend `User` as long-term OS identity |
| **MUST NOT** | Extend `Account` as supplier/customer master beyond demo |
| **MUST NOT** | Add authoritative finance writes to `Invoice`/`Payment` for new OS features |
| **Retirement gate** | **Step 16 Commercial v1** on new spine — timeline reads `BusinessEvent`; commercial objects reference `Party`/`CommercialAccount` |

#### Foundation lane — new packages (Steps 10–15)

| Package (planned) | Owns |
|-------------------|------|
| `packages/os-contracts` | Zod types, command/query DTOs, event catalog registry, error codes — **no Prisma** |
| `packages/os-domain` | Pure domain validation (optional split from os-contracts) |
| `packages/os-database` | Prisma schema **only for OS foundation** — separate from legacy `packages/database` |
| `packages/os-foundation` | Tenant, CapabilityState, AuthIdentity link services |
| `packages/os-workforce` | Person, Member, assignments, Delegation |
| `packages/os-party` | Party graph |
| `packages/os-events` | BusinessEvent, Outbox, Idempotency |
| `packages/os-work` | WorkItem, ApprovalRequest |
| `packages/os-query` | Projection readers |

**Single Postgres database** in production is acceptable with **separate Prisma schemas / table prefixes** (`os_*` vs legacy tables) OR separate schemas — implementation choice at Step 10, but **logical ownership** must remain separate.

### 1.4 Migration path

```
Steps 10–15: Build os-* packages + os-database tables (foundation only)
Step 16+:    Lane G Commercial consumes foundation; bridges demo → new spine
Retirement:  Legacy ActivityEvent read path removed when Commercial timeline uses BusinessEvent
             Legacy Account/User commercial paths retired when Party/CommercialAccount live
```

### 1.5 Invariants (never violated)

- No second permanent identity system  
- No second permanent event authority  
- No second ledger (`FinanceProjection` only when Finance active)  
- No duplicate customer/supplier masters  
- No UI-as-authority  

---

## 2. FG-03 — Event spine (DECISION)

### 2.1 Canonical authority: **BusinessEvent**

| Layer | Authority | Status |
|-------|-----------|--------|
| `business_event` table | Append-only system memory | PLANNED |
| `BusinessEvent` type registry | `packages/os-contracts/events` | PLANNED |
| Outbox + idempotency | Same transaction as authoritative write (ADR-0008) | PLANNED |

### 2.2 Legacy: **ActivityEvent**

| Fact | Evidence |
|------|----------|
| IMPLEMENTED | `packages/database/src/timeline/emit.ts` writes `activityEvent` |
| Consumers | `commerce.service.ts`, `visits.controller.ts`, seed `universe.ts` |
| Represents | Commercial timeline subset (17 types in `COMMERCIAL_EVENT_CATALOG`) |
| Missing vs BusinessEvent | `recordedAt`, `authorizationContext`, `correlationId`, `idempotencyKey`, `dataOrigin`, `capabilityKey` |

### 2.3 Resolution

1. **All new OS commands (Steps 10+)** emit **only** `BusinessEvent` via outbox.  
2. **ActivityEvent is LEGACY_RETIREMENT** — frozen catalog; no new types without D-lane review.  
3. **Compatibility period:** Steps 10–15 — demo commercial code may still use ActivityEvent; **no bridge required** until Step 16.  
4. **Optional projection (Step 16):** Commercial timeline **read model** may materialize from `BusinessEvent` — ActivityEvent table deprecated, not dual-written long-term.  
5. **Retirement condition:** Lane G integration tests read timeline from `BusinessEvent`; `emitCommercialEvent` deleted or shimmed to BusinessEvent-only.

### 2.4 Event type governance

- Registry file: `packages/os-contracts/src/events/registry.ts` (planned)  
- Adding a type requires: D-lane owner + manifest update + contract test  
- Workforce/party events (`member.*`, `party.*`) live in **same registry** as commercial events — not a second catalog

---

## 3. FG-02 — Territory (DECISION)

### 3.1 Classification

| Question | Answer |
|----------|--------|
| Foundational spine entity? | **Partial** — organizational **scope**, not identity |
| Commercial-specific? | **Primary consumer** in current code (`Account.territoryId` required) |
| Optional config? | Governed org configuration (class A/B) |
| Future capability? | Territorio **experience** is Commercial lane UX |

**Evidence:** `schema.prisma` `Territory`, `TerritoryMember`, `UserRole.territoryId`; `ENGINEERING_MASTER_PLAN.md` "RBAC + territory scopes"; `apps/api` territorio/accounts modules.

### 3.2 Architecture (not client policy)

| Aspect | Contract |
|--------|----------|
| **Owner lane** | A (org configuration) + consumption by B (auth scope) and G (Commercial) |
| **Entities (planned)** | `Territory` (org tree), `TerritoryAssignment` (member ↔ territory, effective-dated) |
| **PartyGraph** | Party is **not** territory — territory scopes **visibility**, not party identity |
| **CommercialAccount** | `territoryId` optional FK — commercial lens attribute |
| **Authorization** | Actor scope includes `territoryIds[]` from effective assignments (EMP §7.4) |
| **AI retrieval** | Same territory filter as user session |
| **Before Commercial v1?** | **YES** — geographic sales demo and EMP auth model require territory scope |

### 3.3 Client policy (UNKNOWN — RD-04)

Territory names, hierarchy, reassignment rules → **ISALWA discovery** (`INCREMENT_7_DISCOVERY_MATRIX` A-07). Architecture provides entities; client fills org tree.

---

## 4. Identity & auth security contract (Step 10 input)

### 4.1 Authority split

| Domain | Owner |
|--------|-------|
| Person, OrganizationMember, employment lifecycle | ISALWA OS |
| Credential storage (password hash, MFA secrets) | **Auth provider** (Auth.js + provider per EMP) |
| Session tokens | Auth provider / session store (Redis/DB per EMP) |
| Link Person ↔ provider subject | `AuthIdentity` in OS |

**Legacy `User.passwordHash`:** IMPLEMENTED in demo schema only — **not** target OS model.

### 4.2 Lifecycle commands & provider responsibilities

| Scenario | OS command / action | Auth provider | Audit event |
|----------|---------------------|---------------|-------------|
| Invite employee | `InviteMember` | Create invite / magic link | `member.invited` |
| Activation | `ActivateMember` | First login establishes credential | `member.activated` |
| Password create | — | Provider onboarding | `auth.credential.created` (integration audit) |
| Password change | — | Provider self-service | `auth.credential.changed` |
| Password reset | — | Provider reset flow | `auth.credential.reset` |
| Email change | `ChangeMemberEmail` (class A/B) | Provider email update after verify | `member.email.changed` |
| Email verification | — | Provider | — |
| Suspend access | `SuspendMember` | Revoke sessions | `member.suspended` |
| Terminate | `TerminateMember` | Revoke credentials + sessions | `member.terminated` |
| Rehire | `RehireMember` | Re-invite or reactivate provider user | `employment.restarted` |
| Session invalidation | On access revoke | Provider session revoke | — |

### 4.3 MFA

**PLANNED:** `AuthIdentity.mfaEnabled` flag; enforcement via provider — OS stores state, not TOTP secrets.

### 4.4 Admin without Carmen

Ordinary invite, suspend, terminate, rehire, role/dept change → **class A** commands. Provider connect (initial) → engineering/integration **once**.

---

## 5. API contract (resolved for Step 10)

### 5.1 Style (resolves DG-06)

| Pattern | Convention |
|---------|------------|
| **Commands** | `POST /v1/commands/{commandName}` — body: payload + optional `correlationId`, `Idempotency-Key` header |
| **Queries** | `GET /v1/{resource}` and `GET /v1/{resource}/{id}` — **no side effects** |
| **Internal events** | Not exposed to browser — dispatcher only |
| **OpenAPI** | Single document in `packages/os-contracts/openapi` — law for agents |

Legacy demo routes (`/v1/pulse`, `/v1/accounts`) remain under **legacy API surface** until Step 16 retirement.

### 5.2 Request context (every request)

```typescript
// Planned — packages/os-contracts
RequestContext {
  organizationId: string      // from session — never body-only
  actorMemberId: string       // from session — never client-supplied
  authIdentityId: string
  correlationId: string       // from header or generated
  effectiveAt: Date           // default now; asOf for queries
}
```

### 5.3 IDs & money

- IDs: **ULID** strings (EMP §1)  
- Money: **bigint centavos** (legacy schema already uses this)  
- Tenant: every command/query scoped by `organizationId` first

### 5.4 Authorization evaluation order

1. Tenant match  
2. `accessStatus` active (not revoked/suspended)  
3. Effective-dated Role/Dept/Manager/Delegation at `effectiveAt`  
4. Resource ACL (party, work item, commercial account)  
5. Territory scope (when applicable)  
6. Capability state (LOCKED lanes deny domain writes)

### 5.5 Idempotency & concurrency

| Mechanism | Rule |
|-----------|------|
| Idempotency | `Idempotency-Key` header on commands + external webhooks; stored in `ingest_idempotency` |
| Optimistic concurrency | `If-Match: version` or body `expectedVersion` on mutable aggregates |
| Errors | `packages/contracts` `ApiErrorSchema` extended with OS codes |

### 5.6 Error codes (foundation set — planned)

| Code | Meaning |
|------|---------|
| `TENANT_FORBIDDEN` | Cross-tenant |
| `AUTH_REQUIRED` | No session |
| `ACCESS_REVOKED` | Member suspended/terminated |
| `PERMISSION_DENIED` | RBAC |
| `GOVERNANCE_REQUIRED` | Class B approval needed |
| `CAPABILITY_LOCKED` | Lane not active |
| `VALIDATION_FAILED` | Domain rule |
| `CONFLICT` | Version mismatch |
| `IDEMPOTENCY_REPLAY` | Duplicate command — return prior result |

### 5.7 Pagination & filtering

- Lists: cursor-based `cursor` + `limit` (EMP §7.1)  
- Effective-dated auth queries: optional `asOf` ISO timestamp

### 5.8 Outbox

Command transaction: authoritative rows + `outbox_message` insert — commit together; worker publishes to internal bus; projection workers consume.

---

## 6. Integration contract (shared rules)

### 6.1 IntegrationConnection (canonical)

All integrations use one record shape — **not** per-vendor tables (legacy `MessagingChannel` is demo-only).

| Field | Purpose |
|-------|---------|
| `integrationType` | enum catalog |
| `status` | disconnected \| connecting \| active \| degraded \| error |
| `credentialRef` | Vault pointer — never in client bundle |
| `capabilityKey` | Linked lane |
| Health | `lastSyncAt`, `lastError`, `healthCheckAt` |

### 6.2 Webhook rules (resolves INT-01)

| Rule | Detail |
|------|--------|
| Verification | Signature header per adapter; reject on fail |
| Idempotency | `idempotencyKey` = provider event id or hash |
| Ordering | **Per aggregate:** events processed with `occurredAt`; out-of-order → projection uses latest `occurredAt`; flag stale if conflict |
| Retries | Exponential backoff; max attempts → dead-letter queue |
| Retry storms | Circuit breaker on connection → `degraded` |

### 6.3 Credential rotation

Admin triggers `RotateIntegrationCredential` (class C/D); adapter updates vault; `integration.credential.rotated` event; health recheck.

### 6.4 Degraded mode

Connection `degraded` → manual capture path with `provenance: manual`; attention item; Command Center message.

### 6.5 Reconciliation

`projection.conflict.detected` → WorkItem; no silent overwrite of external authority.

### 6.6 Per-integration direction (planned)

| Integration | External SoR | OS responsibility | Sync direction |
|-------------|----------------|-------------------|----------------|
| WhatsApp | Meta delivery | Message artifact + Party link | Inbound webhook + outbound API |
| Email | Provider | Send queue + delivery status | Outbound + inbound parse |
| Accounting | GL / official invoice | FinanceProjection ingest | Inbound (API/poll/CSV) |
| Banking | Bank | Payment ingest events | Inbound |
| Document storage | Blob store | Metadata + ACL | Outbound upload |
| SIN/Fiscal | Government/intermediary | Fiscal ingest events | Inbound |
| Logistics | Carrier | Shipment status ingest | Inbound |
| Auth provider | Credentials | AuthIdentity link | Outbound admin API |

---

## 7. AI & department intelligence contract

### 7.1 Model

```
GLOBAL OS INTELLIGENCE (cross-dept, authorized)
  └── inherits: tenant, member, effective role, delegation, capability states, resource ACL, territory scope

DEPARTMENT INTELLIGENCE (capability-gated)
  └── Commercial AI: only when Commercial ACTIVE; reads Commercial + Party projections authorized to user
  └── Finance AI: only when Finance ACTIVE; reads FinanceProjection + authorized commercial context
  └── Operations AI: when ACTIVE; own operational projections

USER/ROLE CONTEXT: effective authorization at request time — never current role for historical facts
```

### 7.2 Rules (ADR-0009)

- AI **never** writes authoritative state without human command  
- Retrieval scope = user scope (ADR-0003)  
- Locked capability → no department intelligence fabrication  
- Suggestions logged when acted upon  
- Context packs: `packages/os-ai` (planned) — department tag + capability gate + max token budget

### 7.3 No Commercial AI silo

Commercial copilot uses **shared** retrieval boundary + `ApprovedKnowledge` vault — not a separate customer database for AI.

---

## 8. User experience architecture constraint

**Binding for all implementation agents (Lane G especially):**

Software for a **real company**, not an engineering demo.

| Principle | Architectural implication |
|-----------|---------------------------|
| Few clicks for common workflows | Commands bundle sensible defaults; avoid multi-step wizards for class A admin ops |
| Understandable language | Spanish (es-BO) UI copy; error messages actionable |
| Obvious next actions | WorkItem + Attention drive UI; Command Center ranks by attention |
| Minimal duplicate entry | PartyGraph + unified ingest — one customer path |
| Context preserved | CorrelationId across command → event → UI refresh |
| No mini-app fragmentation | Shared shell; departments are lenses on same Party/work/event spine |
| Useful failure feedback | ApiError with recovery hint; degraded integration banners |
| Progressive complexity | Advanced fields hidden until needed; admin vs everyday user surfaces |

**UI not built in Step 9** — but Lane G **must** cite this section in UX acceptance criteria.

---

## 9. Admin self-service validation

| Operation | Command | Auth scope | Eng required? | Status |
|-----------|---------|------------|---------------|--------|
| Add employee | CreatePerson + CreateMember | `people.admin` | NO | COMPLETE spec |
| Invite employee | InviteMember | `people.admin` | NO | COMPLETE |
| Change email | ChangeMemberEmail | A/B | NO | COMPLETE (new in Step 9) |
| Password reset/change | Provider flow | — | NO* | COMPLETE (*provider setup once) |
| Activate/deactivate | ActivateMember / SuspendMember | `people.admin` | NO | COMPLETE |
| Change department | ChangeDepartment | `people.admin` | NO | COMPLETE |
| Change role | ChangeRole | A/B | NO | COMPLETE |
| Change manager | ChangeManager | `people.admin` | NO | COMPLETE |
| Delegation | GrantDelegation / RevokeDelegation | A/B | NO | COMPLETE |
| Terminate | TerminateMember | `people.admin` | NO | COMPLETE |
| Rehire | RehireMember | `people.admin` | NO | COMPLETE |
| Preserve history | effective-dated + events | — | NO | COMPLETE |
| Reassign work | ReassignWork | manager/admin | NO | COMPLETE |
| Add customer/supplier/etc. | CreateParty + AssignPartyRole | `master_data.admin` | NO | COMPLETE |
| Add contact | UpdateContact | `master_data.admin` | NO | COMPLETE |
| Deactivate/reactivate party | DeactivateParty / ReactivateParty | `master_data.admin` | NO | COMPLETE |
| Merge | RequestPartyMerge / ApprovePartyMerge | B | NO | COMPLETE |
| Change account owner | ReassignCommercialAccountOwner | A/B | NO | COMPLETE |

**No ordinary operation requires Carmen** once Steps 10–14 implemented per this spec.

---

## 10. Multi-agent safety contract

### 10.1 Forbidden without CROSS-LANE CHANGE REQUEST

`Person`, `OrganizationMember`, `AuthIdentity`, `Party`, `PartyRoleAssignment`, `BusinessEvent`, `AuditLog`, `WorkItem`, `CapabilityState`, `IntegrationConnection`, `FinanceProjection`, tenant isolation rules, authorization evaluation order, integration webhook/idempotency rules.

### 10.2 Package edit rules

| Path | Lane | Rule |
|------|------|------|
| `packages/os-*` | Owner lane | May implement per spec |
| `packages/os-contracts` | J + gate | Shared — PR review required |
| `packages/database` | **FORBIDDEN** for foundation agents | Legacy demo only; bugfix exception |
| `apps/api`, `apps/web` | **FORBIDDEN** until Step 16 bridge | Frozen commercial demo |

### 10.3 Boundary tests (required before lane declares VERIFIED)

- Tenant isolation test  
- Effective-dated auth `asOf` test  
- Idempotency replay test  
- Outbox atomicity test  
- Party multi-role test  
- LOCKED capability deny test

### 10.4 Change mechanisms

| Trigger | Action |
|---------|--------|
| Shared entity change | CROSS-LANE CHANGE REQUEST + architecture review |
| Foundation ambiguity | FOUNDATION GAP — stop at gate |
| Legacy extension temptation | Rejected — use os-database |

---

## 11. Contract completeness matrix

| Contract area | Status | Gate |
|---------------|--------|------|
| FG-01 reconciliation | **COMPLETE** | Step 9 |
| FG-03 event spine | **COMPLETE** | Step 11 impl |
| FG-02 territory architecture | **COMPLETE** | Client tree RD-04 |
| Identity/auth lifecycle | **COMPLETE** spec | Step 10 |
| API conventions | **COMPLETE** | Step 10 |
| Integration shared rules | **COMPLETE** | Step 16+ adapters |
| AI inheritance | **COMPLETE** | Step 16+ features |
| UX constraint | **COMPLETE** | Lane G |
| Admin self-service | **COMPLETE** | Steps 10–14 |
| Multi-agent safety | **COMPLETE** | All lanes |
| Prisma os schema DDL | **DEFERRED** | Step 10 |
| OpenAPI file | **DEFERRED** | Step 10 |
| Client territory policy | **CLIENT DECISION** | RD-04 |
| Approval thresholds | **CLIENT DECISION** | RD-02 |
| Accounting provider | **CLIENT DECISION** | RD-03 |

---

## 12. Implementation order (unchanged)

| Step | Scope |
|------|-------|
| 9 | Shared contracts ✓ (this document) |
| 10 | Tenant / auth / member / person |
| 11 | Events / audit / outbox |
| 12 | PartyGraph |
| 13 | Role / dept / delegation projections |
| 14 | Work / approval |
| 15 | Query / projections |
| 16+ | Commercial on foundation |

---

## 13. Related documents

| Doc | Role |
|-----|------|
| `ISALWA_OS_HANDOFF_MANIFEST.md` | Narrative handoff |
| `handoff-manifest.yaml` | Machine lanes |
| `STORAGE_CONTRACT.md` | Storage semantics |
| `INCREMENT_7_ARCHITECTURE_CHALLENGE.md` | Gap analysis |
| `shared-contracts.yaml` | Machine contract index |
