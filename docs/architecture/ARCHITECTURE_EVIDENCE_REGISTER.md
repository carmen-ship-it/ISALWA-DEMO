# Architecture Evidence Register

**Increment:** 7 — Client discovery + pre-implementation challenge  
**Date:** 2026-08-23  
**Rule:** Status labels are **not interchangeable**. A claim is only **IMPLEMENTED** if runnable code exists in the repo; **TESTED** if automated tests assert it; **INTEGRATED** if it participates in an end-to-end path.

**Legend:** CONFIDENCE = High (direct file evidence) | Medium (derived from multiple docs) | Low (single proposed doc)

---

## Spine entities (lanes A–F)

| CLAIM | SOURCE FILE | SECTION / SYMBOL | STATUS | EVIDENCE | CONFIDENCE | UNKNOWN / ASSUMPTION |
|-------|-------------|------------------|--------|----------|------------|----------------------|
| Tenant isolation via `organizationId` on all operational rows | `docs/adr/0003-os-tenant-isolation.md` | Decision | ARCHITECTED | ADR accepted; no OS tenant enforcement code | High | Assumption: single production tenant initially |
| Person ≠ OrganizationMember ≠ AuthIdentity | `docs/adr/0010-workforce-identity-lifecycle.md` | Decision §1–5 | ARCHITECTED | No `Person` / `OrganizationMember` tables in Prisma | High | — |
| Effective-dated Role/Dept/Manager assignments | `WORKFORCE_ORGANIZATION_LIFECYCLE.md` | Lifecycle scenarios | DOCUMENTED | `UserRole` in Prisma has no effective dates | High | — |
| Delegation requires expiry | `handoff-manifest.yaml` | `Delegation.expires_required` | ARCHITECTED | No `delegation` table in Prisma | High | — |
| Unified PartyGraph — one Party, many roles | `docs/adr/0004-os-party-identity.md` | Decision | ARCHITECTED | Prisma has `Account` only (customer silo) | High | — |
| CommercialAccount (not separate customer master) | `PARTYGRAPH_LIFECYCLE.md` | Core entities | ARCHITECTED | Prisma `Account` = old commercial customer table | High | DG-01 alias "Account" in foundation L1 |
| BusinessEvent append-only spine | `ISALWA_OS_FOUNDATION_SPEC.md` | Event spine | ARCHITECTED | Prisma `ActivityEvent` is commercial-only subset | High | Field set differs from architected BusinessEvent |
| Transactional outbox | `docs/adr/0008-os-ingest-outbox.md` | Decision §2 | ARCHITECTED | No `outbox_message` table or worker in repo | High | — |
| WorkItem ≠ Event ≠ Attention ≠ Notification | `docs/adr/0005-os-event-work-attention.md` | Decision | ARCHITECTED | Prisma `Task` + `AttentionItem` + `Notification` exist but not WorkItem/ApprovalRequest model | Medium | Old Task ≠ architected WorkItem |
| FinanceProjection — no second ledger | `docs/adr/0007-os-finance-boundary.md` | Decision §3 | ARCHITECTED | Prisma has authoritative `Invoice`, `Payment` tables (ledger-like) | High | **Legacy demo contradicts finance boundary** |
| Capability registry LOCKED states | `docs/adr/0006-os-capability-registry.md` | Decision | ARCHITECTED | `FeatureFlag` in Prisma; no `CapabilityState` lane registry | Medium | FeatureFlag ≠ CapabilityState |
| Admin self-service class A/B/C/D | `docs/adr/0011-admin-self-service-boundary.md` | Decision | DOCUMENTED | No admin command API | High | Role names RD-01 |
| AI retrieval = user authorization | `docs/adr/0009-os-ai-audit-demo-isolation.md` | Decision §1–2 | ARCHITECTED | Architect `RetrievalPack` scoped; OS AI not built | Medium | OS copilot not implemented |
| Demo/production isolation `dataOrigin` | ADR-0009; foundation spec | Demo section | ARCHITECTED | `SeedMeta` in Prisma; `ws_isalwa` empty in Architect tests | High | OS demo tenant not built |

---

## Storage contract

| CLAIM | SOURCE FILE | SECTION | STATUS | EVIDENCE | CONFIDENCE | UNKNOWN |
|-------|-------------|---------|--------|----------|------------|---------|
| Authoritative vs projection table mapping | `STORAGE_CONTRACT.md` | Entity ownership table | DOCUMENTED | No Prisma mapping to architected tables | High | Schema step 9 |
| Optimistic concurrency on mutable aggregates | `STORAGE_CONTRACT.md` | Cross-cutting | DOCUMENTED | No `version` columns on Prisma aggregates | High | — |
| Effective-dated query `asOf` | `STORAGE_CONTRACT.md` | Effective-dated queries | DOCUMENTED | Not implemented | High | — |
| Idempotency key storage + TTL | `STORAGE_CONTRACT.md` | Idempotency | ARCHITECTED | No `ingest_idempotency` table | High | — |
| Person never hard-deleted | `STORAGE_CONTRACT.md` | Person row | ARCHITECTED | — | High | — |

---

## API / service contract

| CLAIM | SOURCE FILE | SECTION | STATUS | EVIDENCE | CONFIDENCE | UNKNOWN |
|-------|-------------|---------|--------|----------|------------|---------|
| Command → auth → transaction → outbox flow | `API_SERVICE_CONTRACT.md` | Request flow | DOCUMENTED | Nest `apps/api` uses domain services directly on Prisma | High | Legacy API not command-oriented |
| Conceptual workforce/party commands listed | `API_SERVICE_CONTRACT.md` | Conceptual commands | DOCUMENTED | No command handlers | High | — |
| Prohibited: browser→DB, client-supplied roles | `API_SERVICE_CONTRACT.md` | Prohibited patterns | DOCUMENTED | `apps/web` calls REST API | Medium | BFF/session pattern in EMP |
| REST command URL style | `API_SERVICE_CONTRACT.md` | OpenAPI / REST | DEFERRED | DG-06 | High | Single style required at step 9 |

---

## Integrations

| CLAIM | SOURCE FILE | SECTION | STATUS | EVIDENCE | CONFIDENCE | UNKNOWN |
|-------|-------------|---------|--------|----------|------------|---------|
| Unified IntegrationConnection model | `INTEGRATION_CONTRACT.md` | IntegrationConnection record | ARCHITECTED | Prisma `MessagingChannel` partial analog | Medium | No generic IntegrationConnection table |
| Degraded mode + manual fallback | `INTEGRATION_CONTRACT.md` | Degraded mode | DOCUMENTED | Mock providers in `packages/providers` | Medium | — |
| QuickBooks scaffold only | `BOLIVIA_ACCOUNTING_DISCOVERY_MATRIX.md` | Category matrix | DOCUMENTED | Architect connector catalog referenced | High | RD-03 |
| Provider adapter pattern | `ENGINEERING_MASTER_PLAN.md` | §1 Decision register | DOCUMENTED | `packages/providers` mocks exist | High | — |

---

## Events (implemented commercial lane — legacy)

| CLAIM | SOURCE FILE | SECTION / SYMBOL | STATUS | EVIDENCE | CONFIDENCE | UNKNOWN |
|-------|-------------|------------------|--------|----------|------------|---------|
| Commercial event catalog (17 types) | `packages/domain/src/events/catalog.ts` | `COMMERCIAL_EVENT_CATALOG` | IMPLEMENTED | Types + consumers defined | High | Not OS-wide BusinessEvent |
| Emit to ActivityEvent table | `packages/database/src/timeline/emit.ts` | `emitCommercialEvent` | IMPLEMENTED + INTEGRATED | Used by seed/API path | High | No outbox; direct write |
| Zod wire schemas for timeline | `packages/contracts/src/events/schemas.ts` | `TimelineEventSchema` | IMPLEMENTED | Typecheck passes | High | Commercial DTO only |
| Workforce/party events (`member.*`, `party.*`) | `handoff-manifest.yaml` | commands.* events | ARCHITECTED | Not in domain catalog | High | D lane step 11 |

---

## Planificación derive (Architect only)

| CLAIM | SOURCE FILE | SECTION | STATUS | EVIDENCE | CONFIDENCE | UNKNOWN |
|-------|-------------|---------|--------|----------|------------|---------|
| Empty workspace — no fake counts | `planificacion-derive.test.ts` | increment 5.1 test | TESTED | 22/22 tests pass | High | — |
| Finance LOCKED in derive | `planificacion-derive.test.ts` | finance locked test | TESTED | — | High | — |
| Workforce/party/admin derive items | `workforce-lifecycle.ts`, `party-lifecycle.ts`, `admin-governance.ts` | `derive*Requirements` | IMPLEMENTED | Wired in `view-model.ts` | High | All `propuesta` |
| Party not siloed in derive text | `planificacion-derive.test.ts` | party silos test | TESTED | — | High | — |

---

## Handoff manifest (Increment 6)

| CLAIM | SOURCE FILE | SECTION | STATUS | EVIDENCE | CONFIDENCE | UNKNOWN |
|-------|-------------|---------|--------|----------|------------|---------|
| Multi-agent lanes A–J defined | `handoff-manifest.yaml` | `multi_agent_lanes` | DOCUMENTED | YAML + manifest md | High | Future `packages/os-*` don't exist |
| Admin self-service operations list | `handoff-manifest.yaml` | `admin_self_service.operations` | DOCUMENTED | — | High | — |
| Implementation order 6–19 preserved | `handoff-manifest.yaml` | `implementation_order` | DOCUMENTED | — | High | — |
| Architecture audit 0 blockers | `HANDOFF_ARCHITECTURE_AUDIT.md` | Summary | DOCUMENTED | Increment 6 gate | High | Re-challenged in Increment 7 |

---

## Legacy runtime vs architected OS (critical distinction)

| CLAIM | SOURCE FILE | STATUS | EVIDENCE | IMPACT |
|-------|-------------|--------|----------|--------|
| Prisma schema = Milestone 2 **commercial demo** | `packages/database/prisma/schema.prisma` header | IMPLEMENTED | `User`, `Account`, `Invoice`, `ActivityEvent` | **Not the architected foundation** |
| Collapsed `User` model | `schema.prisma` | `model User` | email, passwordHash, status on one row | FOUNDATION_GAP FG-01 if extended without migration plan |
| Authoritative invoices in DB | `schema.prisma` | `model Invoice` | balanceCentavos authoritative | Contradicts FinanceProjection-only when Finance external |
| Nest API serves commercial demo | `apps/api/src/*` | IMPLEMENTED | accounts, commerce, visits modules | Frozen per project rules; separate from OS foundation build |
| Next.js demo UI | `apps/web` | IMPLEMENTED | personas, cierre, senal pages | Demo surface — not OS admin handoff UI |

---

## Security (Architect app — not OS)

| CLAIM | SOURCE FILE | STATUS | EVIDENCE | CONFIDENCE |
|-------|-------------|--------|----------|------------|
| Architect session from Supabase JWT | `docs/SECURITY_POSTURE.md` | §1 Approved paths | DOCUMENTED | High |
| No client-supplied role in Architect | `SECURITY_POSTURE.md` | §2 Forbidden | DOCUMENTED | High |
| `ws_isalwa` honestly empty | `planificacion-derive.test.ts` | empty workspace test | TESTED | High |

---

## Summary counts (by status label)

| Label | Count (major claims) | Notes |
|-------|----------------------|-------|
| ARCHITECTED | 18 | ADRs + contracts — binding direction |
| DOCUMENTED | 12 | Manifest, lifecycle docs |
| IMPLEMENTED | 8 | Legacy commercial + derive + providers mocks |
| TESTED | 6 | Planificación derive tests |
| INTEGRATED | 2 | emitCommercialEvent → ActivityEvent |
| DEPLOYED | 0 | Not assessed in this audit |

**No OS foundation entity (Person, Party, BusinessEvent, Outbox, WorkItem, CapabilityState, IntegrationConnection, FinanceProjection) is IMPLEMENTED in the target architecture shape.**

---

## Step 10 — Foundation implementation (2026-08-23)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| `packages/os-*` foundation packages | ADR-0012 Strategy B | `packages/os-contracts`, `os-domain`, `os-events`, `os-database`, `os-workforce` | IMPLEMENTED | build passes | High |
| Person ≠ Member ≠ AuthIdentity (runtime) | ADR-0010 | `os-workforce/memory-store.ts`, `workforce-command-service.ts` | IMPLEMENTED + TESTED | 11 workforce tests | High |
| Prisma `os_*` tables | Step 9 storage contract | `packages/os-database/prisma/schema.prisma` | IMPLEMENTED | migration file | High |
| Prisma runtime adapter | Step 10.1 | `packages/os-database/src/prisma-workforce-store.ts` | IMPLEMENTED | integration tests (need Postgres) | High |
| Tenant isolation enforced | ADR-0003 | `os-domain/authorization.ts`, `workforce-command-service.execute` | TESTED + VERIFIED | tenant tests + curl | High |
| Command API `POST /v1/commands/{name}` | API contract | `apps/os-api/src/commands.controller.ts` | INTEGRATED + VERIFIED | 2 api tests + curl | High |
| BusinessEvent + outbox + audit on commands | ADR-0005, 0008 | `packages/os-events/src/append.ts` | IMPLEMENTED + TESTED | lifecycle tests | High |
| Auth provider boundary (no OS passwords) | ADR-0010 | `os-workforce/auth-provider.ts` | IMPLEMENTED | provider revoke test | High |
| Effective-dated role/dept/manager | Workforce lifecycle doc | `workforce-command-service.ts` | TESTED | role history test | High |
| Delegation with expiry | handoff manifest | `grantDelegation`, `computeEffectiveScopes` | TESTED | delegation expiry test | High |
| AI scope inheritance | ADR-0009 | `aiEffectiveScopes` | TESTED | authorization test | High |
| Session dev headers validated | Step 10.1 | `apps/os-api/src/os-session.ts` | IMPLEMENTED + TESTED | api tests | High |
| Supabase JWT session resolver | Step 10.1 | `sessionFromSupabaseJwt` | **VERIFIED** | Step 10.3 JWT curls | High |
| OS foundation hosting neutrality | Step 10.5 audit | `STEP_10_1_PRODUCTION_FOUNDATION_EVIDENCE.md` §10.5 | VERIFIED | grep + entrypoint review | High |
| Legacy commercial schema frozen | ADR-0012 | no `packages/database` OS changes | VERIFIED | git scope | High |

**Step 10 gate:** **FULL PASS** (2026-08-24) — see `STEP_10_1_PRODUCTION_FOUNDATION_EVIDENCE.md` §10.3.

**Step 10.1 gate:** CONDITIONAL PASS — superseded by 10.2/10.3 local verification.

**Step 10.2 gate (2026-08-23):** PASS — log: `.step10-2-evidence/verify-20260823T204206Z.log`.

**Step 10.3 gate (2026-08-24):** **PASS** — CLI linked `efolotcrdaqdixfiqbek`; PRODUCTION_AUTH_VERIFIED. Log: `.step10-3-evidence/verify-20260824T120200Z.log`.

---

## Step 11 — Event / audit / outbox (Lane D, 2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| BusinessEvent envelope (Step 9 fields) | `shared-contracts.yaml` | `os-contracts/event-envelope.ts` | IMPLEMENTED + VERIFIED | envelope in outbox payload | High |
| AuditLog ≠ BusinessEvent | ADR-0005 | `os-events/append.ts` | IMPLEMENTED + TESTED | outbox integration | High |
| Transactional outbox (ADR-0008) | ADR-0008 | `prisma-workforce-store.runInTransaction` | **IMPLEMENTED + VERIFIED** | all 12 workforce commands (Step 14.1) | High |
| Outbox delivery + retry + dead-letter | ADR-0008 | `os-events/outbox-worker.ts`, `prisma-outbox-store.ts` | IMPLEMENTED + VERIFIED | 5 postgres tests | High |
| Consumer delivery idempotency | Step 11 | `os_outbox_consumer_dedup` | IMPLEMENTED + VERIFIED | dedup integration test | High |
| Command idempotency | STORAGE_CONTRACT | `os_idempotency_keys` | IMPLEMENTED + VERIFIED | prisma workforce test | High |
| Event schema version policy | Step 9 | `EVENT_SCHEMA_VERSION_POLICY` | DOCUMENTED + IMPLEMENTED | — | High |
| Postgres `FOR UPDATE SKIP LOCKED` claim | Step 11 | `prisma-outbox-store.claimPendingBatch` | IMPLEMENTED + VERIFIED | worker dispatch test | High |
| Tenant-scoped event/audit/outbox | ADR-0003 | all `os_*` event tables | VERIFIED | stats + workforce tests | High |
| Legacy ActivityEvent not used in OS | ADR-0012 | workforce lifecycle test | VERIFIED | unit test | High |
| Outbox worker host process | Step 11 scope | `OutboxWorkerHost` in `os-events`, `os-api` lifecycle | **IMPLEMENTED + VERIFIED** | Step 14.2 runtime tests | High |
| Outbox operational HTTP surface | Step 11 deferral | `/v1/health`, `/v1/operations/outbox` | **IMPLEMENTED + VERIFIED** | health + ops controller | High |
| All commands atomic with outbox | ADR-0008 | workforce commands | **IMPLEMENTED + VERIFIED** | Step 14.1 — all 12 commands | High |

**Step 11 gate:** **PASS** (workforce transactional deferral **CLOSED** in Step 14.1) — see `STEP_11_IMPLEMENTATION_EVIDENCE.md`, `STEP_14_1_WORKFORCE_TRANSACTIONAL_COMPLETION_EVIDENCE.md`. Log: `.step11-evidence/verify-20260824T122302Z.log`.

**Parallel lanes after Step 11:** C (PartyGraph) YES · E (Work) YES · F (Projection) YES · G (Commercial) NO.

---

## Step 12 — PartyGraph (Lane C, 2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Unified PartyGraph (not CRM silo) | ADR-0004 | `packages/os-party`, `os_parties` | IMPLEMENTED + VERIFIED | 9 postgres tests | High |
| PartyRoleAssignment multi-role | PARTYGRAPH_LIFECYCLE | `os_party_role_assignments` | VERIFIED | integration test | High |
| CommercialAccount lens on Party | ADR-0004 | `os_commercial_accounts` | VERIFIED | create customer test | High |
| Contact on organization Party | PARTYGRAPH_LIFECYCLE | `os_contacts`, `UpdateContact` | VERIFIED | integration test | High |
| FiscalIdentity effective-dated | STORAGE_CONTRACT | `os_fiscal_identities` | IMPLEMENTED | create/update path | High |
| Lead staging | PARTYGRAPH_LIFECYCLE | `os_leads`, CreateLead/ResolveLead | IMPLEMENTED | command surface | Medium |
| Duplicate suggest (no silent merge) | ADR-0004 | `os_party_duplicate_candidates` | VERIFIED | NIT test | High |
| Governed merge + lineage | ADR-0004 | `os_party_merge_requests` | VERIFIED | merge test | High |
| All party commands transactional outbox | Step 11 pattern | `PartyCommandService.runInTransaction` | VERIFIED | event+audit+outbox counts | High |
| Party API commands + query | API contract | `apps/os-api` commands + parties controller | INTEGRATED | os-api tests | High |
| Admin UI for party master data | Step 9 admin self-service | — | **DEFERRED** | no UI | High |
| Legacy Account table as party master | FG-01 | legacy frozen | VERIFIED | no legacy changes | High |

**Step 12 gate:** **PASS** (API/Postgres; UI deferred) — see `STEP_12_PARTYGRAPH_IMPLEMENTATION_EVIDENCE.md`.

---

## Step 14 — Work / Approval (Lane E, 2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| WorkItem authoritative model | ADR-0005 | `packages/os-work`, `os_work_items` | IMPLEMENTED + VERIFIED | 7 postgres tests | High |
| ApprovalRequest immutable outcome | ADR-0005 | `os_approval_requests` | VERIFIED | delegation approve test | High |
| Ownership history | WORKFORCE doc | `os_work_item_ownership_history` | VERIFIED | reassign test | High |
| Transactional outbox on all work commands | Step 11/12 pattern | `WorkCommandService` | VERIFIED | event+outbox counts | High |
| ReassignWork moved to Lane E | handoff manifest | `@isalwa/os-work` | IMPLEMENTED | CROSS-LANE | High |
| Terminate blocked with open work | WORKFORCE doc | `workforce-command-service` | VERIFIED | integration test | High |
| AttentionItem derived only | ADR-0005 | not stored | DEFERRED Lane F | — | High |
| Legacy Task/AttentionItem | FG-01 | frozen | VERIFIED | no legacy changes | High |

**Step 14 gate:** **PASS** — see `STEP_14_WORK_APPROVAL_IMPLEMENTATION_EVIDENCE.md`. Log: `.step14-evidence/verify-20260824T124359Z.log`.

---

## Step 14.1 — Workforce transactional completion (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| All 12 workforce commands atomic (domain+event+audit+outbox+idempotency) | Step 11 deferral close | `WorkforceCommandService.execute` | IMPLEMENTED + VERIFIED | 5 tx tests + lifecycle | High |
| Idempotency record inside transaction | ADR-0008 | `saveIdempotency` in tx callback | VERIFIED | ChangeRole + Invite replay | High |
| Transaction rollback on emit failure | Step 14.1 | `testFailNextAppend` hook | VERIFIED | rollback integration test | High |
| ReassignWork not in workforce | Step 14 | `@isalwa/os-work` only | VERIFIED | no workforce ReassignWork | High |
| Terminate open-work guard (read-only Lane E) | WORKFORCE doc | `listOpenWorkItemsForMember` | VERIFIED | work integration (unchanged) | High |
| Workforce admin product UI | Step 9 | — | **DEFERRED** | API only | High |

**Step 14.1 gate:** **PASS** — see `STEP_14_1_WORKFORCE_TRANSACTIONAL_COMPLETION_EVIDENCE.md`, `STEP_F_TEST_01_PROJECTION_TEST_HYGIENE_EVIDENCE.md`. Latest logs: `.step14-1-evidence/verify-20260824T135427Z.log` (3× consecutive PASS post F-TEST-01 gate scoping).

**Step 11 workforce transactional deferral:** **CLOSED**.

---

## Step 14.2 — Outbox runtime + operability (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Production outbox worker host | Step 11 deferral | `OutboxWorkerHost`, `os-api` `onModuleInit` | IMPLEMENTED + VERIFIED | runtime integration | High |
| Graceful worker shutdown | Step 14.2 | Nest `onModuleDestroy` + host `stop()` | VERIFIED | unit + os-api test | High |
| Multi-instance claim safety | ADR-0008 | `SKIP LOCKED` | VERIFIED | concurrent worker test | High |
| Operational backlog visibility | Step 11 deferral | `getOperationalHealth`, ops HTTP | VERIFIED | integration + controllers | High |
| No payload exposure on ops routes | SECURITY | operations controller | VERIFIED | code review | High |
| Provider-neutral hosting | Step 14.2 | co-hosted os-api, env flags | VERIFIED | — | High |

**Step 14.2 gate:** **PASS** — see `STEP_14_2_OUTBOX_RUNTIME_OPERABILITY_EVIDENCE.md`.

**Step 11 delivery/observability deferrals:** **CLOSED**.

---

## Step 14.3 — Governed dead-letter recovery (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| RetryDeadLetterDelivery operational command | Step 14.2 deferral | `OutboxRecoveryService`, operations API | IMPLEMENTED + VERIFIED | 6 postgres tests | High |
| Recovery audit trail | ADR-0005 | `outbox.dead_letter.recovery_requested` | VERIFIED | integration test | High |
| Recovery idempotency | ADR-0008 | `os_idempotency_keys` in recovery tx | VERIFIED | integration test | High |
| Tenant + people.admin gate | SECURITY | `OutboxRecoveryService.authorize` | VERIFIED | negative tests | High |
| No BusinessEvent mutation on recovery | Step 14.3 | requeue outbox only | VERIFIED | event id test | High |
| Dedup reset on governed recovery | Step 14.3 | `recoverDeadLetterDelivery` | VERIFIED | success path test | High |

**Step 14.3 gate:** **PASS** — see `STEP_14_3_DEAD_LETTER_RECOVERY_EVIDENCE.md`. Log: `.step14-3-evidence/verify-20260824T130039Z.log`.

**Step 14.2 governed DL replay deferral:** **CLOSED**.

---

## Step 14.4 — Approval security + integrity (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Governed approval subject types (explicit enum) | E-01 remediation | `APPROVAL_SUBJECT_TYPES` in `work-events.ts`; `validateApprovalSubject()` | IMPLEMENTED + VERIFIED | postgres tests 1–5 | High |
| Blocked commercial_account for approval | Commercial gate | `APPROVAL_SUBJECT_TYPES_BLOCKED` | VERIFIED | postgres test 3 | High |
| Bounded request context (row only, not events) | E-03 remediation | `ApprovalRequestContextSchema`; `contextSnapshotJson` on row | VERIFIED | postgres tests 6–7 | High |
| Safe decision event payloads | E-03 remediation | `buildApprovalDecisionEventPayload()` | VERIFIED | postgres test 8 | High |
| Concurrent approve/reject single winner | E-02 remediation | `decidePendingApprovalRequest` conditional update | VERIFIED | postgres tests 10–11 | High |
| Immutable terminal decision | Step 14.4 | `CONFLICT` on non-pending | VERIFIED | postgres test 11 | High |
| Authorization negatives (delegation, suspend, tenant) | SECURITY | `canDecideApproval`, tenant scoping | VERIFIED | postgres tests 13–16 | High |
| Atomic rollback on outbox failure | Step 14 pattern | `testFailNextAppend` | VERIFIED | postgres test 17 | High |

**Step 14.4 gate:** **PASS** (remediation) — see `STEP_14_4_APPROVAL_SECURITY_INTEGRITY_EVIDENCE.md`. Log: `.step14-4-evidence/verify-20260824T131833Z.log`.

**Independent review findings E-01 / E-02 / E-03:** Remediation **CLOSED** — pending Agent 3 re-review.

**Commercial → Approval integration:** **BLOCKED** until explicit subject-type extension.

---

## Step 14.5 — Suspend / open work lifecycle (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Suspend preserves work ownership (hold policy) | WORKFORCE doc | `suspendMember` — no work mutation | VERIFIED | postgres test 2 | High |
| Terminate blocks on open work (unchanged) | handoff-manifest | `terminateMember` + `listOpenWorkItemsForMember` | VERIFIED | work regression | High |
| Suspended actor blocked from work/approval | STEP_9 §5.4 | `assertMemberActive` | VERIFIED | postgres tests 3–6 | High |
| Suspended delegate cannot exercise delegation | SECURITY | `assertMemberActive` on delegate | VERIFIED | postgres test 6 | High |
| Explicit ReassignWork resolution path | Lane E | `ReassignWork` by people.admin | VERIFIED | postgres test 7 | High |
| Reactivation restores work authority | admin ops | `ActivateMember` | VERIFIED | postgres test 8 | High |
| Suspend atomic tx + idempotency + rollback | Step 14.1 pattern | `WorkforceCommandService.execute` | VERIFIED | postgres tests 9–10 | High |
| Mandatory reassignment-before-suspend | — | Not in contract | **NOT IMPLEMENTED** | by design | High |
| Auth provider session revoke on suspend | STEP_9 | `revokeSessions` post-commit | **CLOSED (live)** | Step 14.6B | High |
| O-05 leave-type access rules | INCREMENT_7 | — | **CLIENT_DECISION_REQUIRED** | — | High |

**Step 14.5 gate:** **CONDITIONAL PASS** — see `STEP_14_5_SUSPEND_OPEN_WORK_LIFECYCLE_EVIDENCE.md`. Log: `.step14-5-evidence/verify-20260824T132828Z.log`.

**E-04:** **PARTIAL** — security invariants closed; O-05 client leave policy open.

---

## Step 14.6 — Auth provider lifecycle (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Suspend post-commit session revoke | STEP_9 §4.2 | `revokeSessions` on `AuthProviderPort` | MOCK-TESTED | 8 postgres tests | High |
| Terminate post-commit credential revoke | STEP_9 §4.2 | `revokeCredentials` (existing) + retry | MOCK-TESTED | postgres | High |
| Provider failure does not rollback OS | Step 14.1 pattern | post-commit + audit | VERIFIED | failure + retry tests | High |
| RetryAuthProviderSync recovery | Step 14.6 | workforce command | MOCK-TESTED | postgres | High |
| OS session denies non-active members | SECURITY | `os-session.ts` | HTTP VERIFIED | os-api 36/36 | High |
| Supabase global logout on suspend | Step 14.6 | `SupabaseAuthProviderPort.revokeSessions` | **LIVE VERIFIED** | Step 14.6B log | High |
| Supabase delete on terminate | Step 14.6 | `SupabaseAuthProviderPort.revokeCredentials` | **LIVE VERIFIED** | Step 14.6B log | High |
| Live Supabase rehire invite | Step 14.6 | `createInvite` | **DEFERRED** | PROVIDER_INVITE_FAILED on pilot | Medium |

**Step 14.6 gate:** **CONDITIONAL PASS** (Lane J re-review 2026-08-24) — suspend/terminate **LIVE VERIFIED** on pilot; rehire invite deferred. See `STEP_14_6_AUTH_PROVIDER_LIFECYCLE_EVIDENCE.md`. Logs: `.step14-6-evidence/verify-20260824T133951Z.log`, `.step14-6b-evidence/verify-20260824T135127Z.log`.

**Step 14.5 auth-provider gap:** **CLOSED** (live suspend/terminate); rehire provider invite deferred.

**Step 14.6B gate:** **CONDITIONAL PASS** — live Supabase pilot project `efolotcrdaqdixfiqbek`.

---

## Step 14.7 — Workforce admin mutation API readiness (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Admin mutations via canonical command route | Step 14.7 | `CommandsController` | HTTP VERIFIED | 9 HTTP + 15 postgres | High |
| ChangeDepartment/Role/Manager tenant-safe | STEP_9 | `WorkforceCommandService` | VERIFIED | postgres | High |
| Suspend/Terminate provider safety preserved | 14.5/14.6 | post-commit provider effects | LIVE+MOCK | regression logs | High |
| ActivateMember J-13 lifecycle guard | Lane J | `activateMember` | **CLOSED** | domain + HTTP | High |
| ACCESS_REVOKED → HTTP 403 on commands | UI contract | `commands.controller.ts` | VERIFIED | HTTP | High |
| InviteMember/RehireMember UI-ready | — | — | **BLOCKED** | 14.6B invite fail | High |
| ChangeMemberEmail UI-ready | — | — | **BLOCKED** | provider not live | Medium |

**Step 14.7 gate:** **CONDITIONAL PASS** (Lane J re-review 2026-08-24) — UI-safe mutations **READY**; invite/rehire/email-completion blocked at provider tier.

**Workforce Admin mutation backend (Lane J reconciliation):** safe set **READY FOR UI**; invite/rehire/email-completion **BLOCKED** at provider tier.

---

## Step 16-Prep — Commercial projection readiness (2026-08-24)

| CLAIM | SOURCE | STATUS | NOTES |
|-------|--------|--------|-------|
| Lane F extension points documented | Step 16-Prep | **CLOSED** | Implemented in Step 16.1 |
| Agent 2 commercial contracts | `packages/os-commercial` | **CLOSED** | Step 16 PASS |
| Commercial projection harness | `commercial-projection-prisma.integration.test.ts` | **CLOSED** | Replaced skipped harness |
| Cliente 360 composition plan | Step 16-Prep doc | **PARTIAL** | Query composition documented; UI deferred (Agent 4) |
| Timeline query contract | `os-contracts` | **PARTIAL** | Party/Commercial closed; Work/Approval open |

**Step 16-Prep gate:** **CLOSED** — superseded by Step 16.1. See `STEP_16_COMMERCIAL_PROJECTION_READINESS.md` (updated).

---

## Step 15 — Query / Projection (Lane F, 2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Shared projection framework | Step 9 / Lane F | `packages/os-query` | IMPLEMENTED + VERIFIED | 5 postgres tests | High |
| Party search read model | STORAGE_CONTRACT | `os_party_read_models` | VERIFIED | projection integration | High |
| Projection checkpoint / freshness | Step 9 | `os_projection_checkpoints`, `os_projection_freshness` | VERIFIED | rebuild + stale tests | High |
| Outbox consumer idempotency | Step 11 | reuses `os_outbox_consumer_dedup` | VERIFIED | dedup test | High |
| Authorized SearchParties query | handoff manifest | `GET /v1/parties` | INTEGRATED | build + tenant tests | High |
| Work attention boundary | ADR-0005 | `WorkProjectionBoundary` | IMPLEMENTED | fixture only | High |
| AttentionItem projection storage | ADR-0005 | not stored yet | DEFERRED | Lane E handler | High |
| FinanceProjection query | manifest LOCKED | — | **DEFERRED** | Finance lane locked | High |
| Legacy ActivityEvent reads | FG-03 | frozen | VERIFIED | no OS query uses legacy | High |

**Step 15 gate:** **PASS** — see `STEP_15_QUERY_PROJECTION_IMPLEMENTATION_EVIDENCE.md`. Log: `.step15-evidence/verify-20260824T124808Z.log`.

---

## Step 15.1 — Work / Approval / Attention projections (Lane F, 2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Work summary read model | ADR-0005 | `os_work_read_models`, `WorkProjectionConsumer` | VERIFIED | 7 postgres tests | High |
| Approval summary read model | ADR-0005 | `os_approval_read_models` | VERIFIED | approval projection tests | High |
| AttentionItem derived store | ADR-0005 | `os_attention_read_models`, `deriveAttentionReadModels` | VERIFIED | attention tests | High |
| ListOpenWork / GetWorkItem queries | handoff manifest | `GET /v1/work-items` | INTEGRATED + HTTP | query-runtime.test | High |
| ListPendingApprovals / GetApproval | handoff manifest | `GET /v1/approvals` | INTEGRATED + HTTP | query-runtime.test | High |
| ListAttentionItems | Lane F | `GET /v1/attention` | INTEGRATED + HTTP | query-runtime.test | High |
| Manager hierarchy work visibility | WORKFORCE doc | — | **OPEN** | — | High |
| Party projection regression | Step 15 | unchanged | VERIFIED | 5 postgres tests | High |

**Step 15.1 gate:** **PASS** — see `STEP_15_1_WORK_ATTENTION_PROJECTION_EVIDENCE.md`. Log: `.step15-1-evidence/verify-20260824T125720Z.log`.

---

## Step 15.2 — Member directory + capability state (Lane F, 2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| ListMembers authorized query | handoff manifest | `MemberQueryService`, `GET /v1/members` | VERIFIED | postgres + HTTP | High |
| GetMember summary (extended) | Step 10 + 15.2 | `GET /v1/members/:id` + `summary` | VERIFIED | HTTP | High |
| GetCapabilityState registry query | ADR-0006 | `CapabilityQueryService`, `GET /v1/capabilities` | VERIFIED | postgres + HTTP | High |
| Server capability registry | ADR-0006 | `packages/os-contracts/src/capabilities.ts` | IMPLEMENTED | registry defaults | High |
| Org capability overrides | Step 10 schema | `os_capability_states` | VERIFIED | override test | High |
| ListMembers `people.admin` only | ADMIN_SELF_SERVICE | `member-query-service.ts` | VERIFIED | non-admin denial | High |
| Capability ≠ authorization | Step 15.2 spec | commercial list negative test | VERIFIED | HTTP | High |
| Manager hierarchy directory | WORKFORCE doc | — | **OPEN** | — | High |
| Terminated member query gate | FG auth | `assertMemberActive` | **CROSS_LANE_REQUEST** | gap test | High |

**Step 15.2 gate:** **PASS (CONDITIONAL)** — see `STEP_15_2_MEMBER_CAPABILITY_QUERY_EVIDENCE.md`. Log: `.step15-2-evidence/verify-20260824T133229Z.log`.

---

## UI-0 — Production OS web shell (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Production shell app (not legacy demo) | UI-0 | `apps/os-web` | IMPLEMENTED | build PASS | High |
| Supabase + dev auth against os-api | Step 10 / UI-0 | `apps/os-web/lib/auth/*`, `middleware.ts` | IMPLEMENTED | unit + build | High |
| Centralized OS API client | API_SERVICE_CONTRACT | `apps/os-web/lib/api/os-api-client.ts` | IMPLEMENTED | unit tests | High |
| Role-aware nav (admin probe) | UI-0 | `probeAdminAccess` → `GET /v1/operations/outbox` | IMPLEMENTED | unit nav test | High |
| Static capability LOCKED states | ADR-0006 | `lib/capabilities/manifest.ts` | IMPLEMENTED | — | High |
| Production IA routes | PRODUCTION_UI spec | `app/(app)/inicio|clientes|trabajo|aprobaciones|administracion` | IMPLEMENTED | build | High |
| Inicio real query reads | Step 15.1 | `inicio/page.tsx` | IMPLEMENTED | — | Medium |
| No legacy ActivityEvent / apps/web API | UI_REBUILD | grep clean | VERIFIED | — | High |
| Browser runtime E2E vs os-api | UI-0 | — | **DEFERRED** | os-api needs Postgres locally | High |
| GetCapabilityState HTTP nav | Step 15.2 | `GET /v1/capabilities` → `app-nav.tsx` | **IMPLEMENTED** (UI-1) | ui-1 tests + build | High |
| ListMembers HTTP Equipo | Step 15.2 | `GET /v1/members` → Equipo admin | **IMPLEMENTED** (UI-1) | ui-1 tests + build | High |

**UI-0 gate:** **PASS (CONDITIONAL)** — see `UI_0_PRODUCTION_SHELL_IMPLEMENTATION_EVIDENCE.md`.

---

## UI-3 — Work / Approvals / Inicio read surfaces (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Trabajo list from ListOpenWork | Step 15.1 | `app/(app)/trabajo/page.tsx` | IMPLEMENTED | ui-3 tests + build | High |
| Trabajo detail from GetWorkItem | Step 15.1 | `app/(app)/trabajo/[workItemId]/page.tsx` | IMPLEMENTED | build | High |
| Aprobaciones from ListPendingApprovals | Step 15.1 | `app/(app)/aprobaciones/page.tsx` | IMPLEMENTED | ui-3 tests + build | High |
| Approval detail read-only | Step 15.1 | `app/(app)/aprobaciones/[approvalRequestId]/page.tsx` | IMPLEMENTED | build | High |
| Inicio attention/work/approval | Step 15.1 | `app/(app)/inicio/page.tsx` | IMPLEMENTED | ui-3 tests | High |
| Attention derivation UX (reasonCode) | ADR-0005 | `components/work/attention-list.tsx` | IMPLEMENTED | ui-3 tests | High |
| Stale projection banner | Step 15 | `components/work/stale-projection-banner.tsx` | IMPLEMENTED | fixture test | High |
| Member display via GET /members/:id | Step 10 | `lib/work/member-resolver.ts` | IMPLEMENTED | — | Medium |
| Approve/reject commands in UI | — | — | **DEFERRED** | read-only slice | High |
| Browser E2E vs live os-api | UI-3 | — | **DEFERRED** | Postgres required | High |

**UI-3 gate:** **PASS (CONDITIONAL)** — see `UI_3_WORK_APPROVALS_HOME_IMPLEMENTATION_EVIDENCE.md`.

---

## UI-2 — Clientes / Party master read surfaces (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Clientes search list | Step 15 SearchParties | `app/(app)/clientes/page.tsx` | IMPLEMENTED | ui-2 tests + build | High |
| Party detail canonical | Step 12 GET /parties/:id | `app/(app)/clientes/[partyId]/page.tsx` | IMPLEMENTED | ui-2 tests + build | High |
| Multi-role single entity UX | ADR-0004 | `PartyRoleBadges`, `multiRoleHint` | IMPLEMENTED | ui-2 tests | High |
| Contacts read-only | Step 12 | detail contacts section | IMPLEMENTED | fixture test | High |
| Duplicate/merge display | projection DTO | list + detail merged state | IMPLEMENTED | ui-2 tests | High |
| Fiscal identity display | Step 12 store | — | **DEFERRED** | no HTTP field | High |
| Commercial 360 sections | Step 16 | locked placeholders | DEFERRED | parallel safety | High |
| Work subject → Cliente nav | UI-3 | work-list + trabajo filter | IMPLEMENTED | navigation test | High |
| Legacy Account authority | UI_REBUILD | grep clean | VERIFIED | — | High |
| Browser E2E vs Postgres os-api | UI-2 | — | **DEFERRED** | env blocked | High |

**UI-2 gate:** **PASS (CONDITIONAL)** — see `UI_2_CLIENTE_MASTER_IMPLEMENTATION_EVIDENCE.md`.

---

## UI-4 — Cliente 360 Commercial + Historial read surfaces (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Cliente 360 party-scoped commercial reads | Step 16.1 | `lib/cliente/load-cliente-360.ts` | IMPLEMENTED | ui-4 tests + build | High |
| Oportunidades list + detail | Step 16.1 | `opportunity-list.tsx`, nested detail route | IMPLEMENTED | ui-4 tests + build | High |
| Cotizaciones list + detail lines | Step 16.1 | `quote-list.tsx`, quote detail route | IMPLEMENTED | ui-4 tests + build | High |
| Pedidos list + detail (no fulfillment labels) | Step 16.1 | `order-list.tsx`, order detail route | IMPLEMENTED | ui-4 tests + build | High |
| Historial Party + Commercial timeline | Step 16.1A | `party-timeline-list.tsx` | IMPLEMENTED | ui-4 tests | High |
| Historial Work + Approval timeline | Step 16.1B / UI-4B | `timeline-labels.ts`, `party-timeline-list.tsx` | IMPLEMENTED | ui-4b tests | High |
| Raw event payload never in UI | Step 16.1A / UI-4B | timeline-labels + HTTP contract | VERIFIED | assertNoRawPayload test | High |
| contextSnapshot never in UI | Step 16.1B / UI-4B | timeline-labels | VERIFIED | assertNoContextSnapshot test | High |
| Centavo money rendering (BigInt) | Step 16 | `lib/commercial/money.ts` | TESTED | ui-4 tests | High |
| Stale projection banner reuse | Step 15/16.1 | `StaleProjectionBanner` | IMPLEMENTED | fixture test | High |
| Commercial command forms | — | — | **DEFERRED** | read-only slice | High |
| Browser E2E vs Postgres os-api | UI-4 | — | **DEFERRED** | env blocked | High |

**UI-4 gate:** **PASS (CONDITIONAL)** — see `UI_4_CLIENTE_360_COMMERCIAL_READ_IMPLEMENTATION_EVIDENCE.md`.

---

## UI-4B — Cliente Historial Work + Approval enrichment (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Work timeline labels (4 events) | Step 16.1B | `lib/commercial/timeline-labels.ts` | IMPLEMENTED | ui-4b tests | High |
| Approval timeline labels (3 events) | Step 16.1B | same | IMPLEMENTED | ui-4b tests | High |
| Internal IDs / subject metadata hidden | UI-4B | `HIDDEN_FACT_KEYS` | VERIFIED | ui-4b tests | High |
| Historial scope copy updated | UI-4B | `HISTORIAL_SCOPE_COPY` | IMPLEMENTED | ui-4b test | High |
| No UI association logic | Step 16.1B | no browser resolver | VERIFIED | code review | High |
| No Historial mutation actions | UI-4B | display-only | VERIFIED | code review | High |
| Browser E2E vs Postgres os-api | UI-4B | — | **DEFERRED** | env blocked | High |

**UI-4B gate:** **PASS (CONDITIONAL)** — see `UI_4B_CLIENTE_HISTORIAL_WORK_APPROVAL_EVIDENCE.md`.

---

## UI-1 — Workforce Admin read surfaces (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Equipo directory ListMembers | Step 15.2 | `app/(app)/administracion/equipo/page.tsx` | IMPLEMENTED | ui-1 tests + build | High |
| Member detail read | Step 15.2 | `administracion/equipo/[memberId]/page.tsx` | IMPLEMENTED | ui-1 tests + build | High |
| Capacidades from GetCapabilityState | Step 15.2 | `administracion/capacidades/page.tsx` | IMPLEMENTED | ui-1 tests | High |
| Backend-driven nav capability state | Step 15.2 | `resolve-nav.ts`, `app-nav.tsx` | IMPLEMENTED | ui-1 tests | High |
| Static manifest demoted | UI-0 → UI-1 | `presentation.ts` | VERIFIED | no state in presentation | High |
| List N+1 removed | Step 15.2 intent | `buildDirectoryLabelMap` | VERIFIED | ui-1 test | High |
| Suspend vs terminate UX | Step 14 lifecycle | `labels.ts` lifecycle copy | IMPLEMENTED | ui-1 tests | High |
| Admin probe via people.admin | Step 15.2 | `probeAdminAccess` → ListMembers | IMPLEMENTED | build | High |
| Workforce mutation forms | — | — | **DEFERRED** | read-only slice | High |
| UI-3/UI-4 member-resolver N+1 | UI-1 note | `member-resolver.ts` | **STILL PRESENT** | out of scope | High |
| Browser E2E vs Postgres os-api | UI-1 | — | **DEFERRED** | env blocked | High |

**UI-1 gate:** **PASS (CONDITIONAL)** — see `UI_1_WORKFORCE_ADMIN_READ_IMPLEMENTATION_EVIDENCE.md`.

---

## UI-5A — Commercial Opportunity + Quote write (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| CreateOpportunity form | Step 16 | `oportunidades/nueva` | IMPLEMENTED | ui-5a + build | High |
| Opportunity lifecycle commands | Step 16 | `opportunity-actions-panel.tsx` | IMPLEMENTED | ui-5a + build | High |
| CreateQuote + line editor | Step 16 | `quote-editor.tsx` | IMPLEMENTED | ui-5a + build | High |
| SubmitQuote / CancelQuote | Step 16 | `quote-editor.tsx` | IMPLEMENTED | ui-5a + build | High |
| CreateOrder UI | G-02 | — | **NOT EXPOSED** | ui-5a test | High |
| G-02 CreateOrder authorization policy | G-02 decision brief | — | **DESIGN READY / DECISION PENDING** | `G02_CREATEORDER_AUTHORIZATION_DECISION_BRIEF.md` | High |
| Commercial approval UI | G-08 | — | **NOT EXPOSED** | ui-5a test | High |
| Command idempotency header | Step 16 | `executeCommand` + `createId()` | IMPLEMENTED | build | High |
| Money input BigInt parse | Step 16 | `parse-money-input.ts` | TESTED | ui-5a | High |
| Browser command smoke | UI-5A | — | **DEFERRED** | env blocked | High |

**UI-5A gate:** **PASS (CONDITIONAL)** — see `UI_5A_COMMERCIAL_OPPORTUNITY_QUOTE_WRITE_EVIDENCE.md`.

---

## UI-LIVE-1 — Commercial + Cliente 360 live UAT smoke (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Live stack os-api + os-web + Postgres | UI-LIVE-1 | local dev | **VERIFIED** | smoke script | High |
| Dev auth employee path | UI-LIVE-1 | dev session + headers | **VERIFIED** | smoke script | High |
| Clientes + Cliente 360 read | UI-4 / UI-LIVE-1 | `/clientes`, `/clientes/[partyId]` | **VERIFIED** | API + SSR | High |
| Opportunity + Quote write path | UI-5A / UI-LIVE-1 | commands via os-api | **VERIFIED** | live commands | High |
| Historial Work + Approval display | UI-4B / UI-LIVE-1 | party timeline | **VERIFIED** | live timeline | High |
| Workforce Admin read | UI-1 / UI-LIVE-1 | `/administracion/equipo` | **VERIFIED** | API + SSR | High |
| Projection refresh after writes | Step 16 / UI-LIVE-1 | outbox worker | **VERIFIED** | ~10s convergence | High |
| CreateOrder not exposed | G-02 / UI-LIVE-1 | — | **VERIFIED** | SSR negative | High |
| Commercial approval not exposed | G-08 / UI-LIVE-1 | — | **VERIFIED** | SSR negative | High |
| Interactive Playwright browser | UI-LIVE-1 | — | **DEFERRED** | SSR-only smoke | High |

**UI-LIVE-1 gate:** **PASS (CONDITIONAL)** — see `UI_LIVE_1_COMMERCIAL_UAT_SMOKE_EVIDENCE.md`.

---

## UI-LIVE-2 — Interactive commercial browser UAT (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Playwright browser employee path | UI-LIVE-2 | `scripts/ui-live-2-playwright.mjs` | **VERIFIED** | Playwright smoke | High |
| Login → Clientes → Cliente 360 click-through | UI-LIVE-2 | shell + section nav | **VERIFIED** | Playwright | High |
| Opportunity create/edit/stage/owner (browser) | UI-LIVE-2 | opportunity forms | **VERIFIED** | Playwright | High |
| Quote create/lines/submit (browser) | UI-LIVE-2 | quote editor | **VERIFIED** | Playwright | High |
| Historial safe render (browser) | UI-4B / UI-LIVE-2 | `#historial` | **VERIFIED** | Playwright | High |
| Workforce Admin (browser) | UI-1 / UI-LIVE-2 | `/administracion/equipo` | **VERIFIED** | Playwright | High |
| Browser projection convergence | UI-LIVE-2 | outbox worker | **VERIFIED** | ~3.9s max poll | High |
| CreateOrder not exposed (browser) | G-02 / UI-LIVE-2 | — | **VERIFIED** | Playwright negative | High |
| Commercial approval not exposed (browser) | G-08 / UI-LIVE-2 | — | **VERIFIED** | Playwright negative | High |
| Owner dropdown active members only | UI-LIVE-2 fix | `member-options.ts` | **VERIFIED** | member-options.test.ts | High |
| Supabase / production browser auth | UI-LIVE-2 | — | **DEFERRED** | DEV auth only | High |

**UI-LIVE-2 gate:** **PASS** — see `UI_LIVE_2_INTERACTIVE_COMMERCIAL_UAT_EVIDENCE.md`. Artifacts: `.ui-live-2-evidence/`.

---

## UI-2B — Workforce admin mutation UI (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| ChangeDepartment/Role/Manager UI | UI-2B | `member-admin-actions-panel.tsx` | **IMPLEMENTED** | ui-2b.test.ts | High |
| Suspend / Reactivate / Terminate UI | UI-2B | lifecycle-ui + actions | **IMPLEMENTED** | ui-2b.test.ts | High |
| Open-work terminate UX | Step 14.7 / UI-2B | command-errors.ts | **IMPLEMENTED** | ui-2b.test.ts | High |
| Grant/Revoke delegation UI | UI-2B | actions + panel | **IMPLEMENTED** | ui-2b.test.ts | High |
| RequestMemberEmailChange self-only | UI-2B | lifecycle-ui | **IMPLEMENTED** | ui-2b.test.ts | High |
| Invite/Rehire/ChangeMemberEmail blocked | Step 14.7 / UI-2B | command-types.ts | **VERIFIED** | ui-2b.test.ts | High |
| RetryAuthProviderSync absent from HR UI | UI-2B | — | **VERIFIED** | ui-2b.test.ts | High |
| Live browser admin mutation smoke | UI-2B | — | **DEFERRED** | build only | High |

**UI-2B gate:** **PASS (CONDITIONAL)** — see `UI_2B_WORKFORCE_ADMIN_MUTATION_EVIDENCE.md`.

---

## UI-LIVE-3 — Workforce admin mutation browser smoke (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Live browser ChangeDepartment/Role/Manager | UI-LIVE-3 | `member-admin-actions-panel.tsx` | **VERIFIED** | Playwright | High |
| Live browser Suspend / Reactivate | UI-LIVE-3 | workforce actions | **VERIFIED** | Playwright | High |
| Live browser Terminate + open-work block | UI-LIVE-3 | command-errors + panel | **VERIFIED** | Playwright | High |
| Live browser Grant/Revoke delegation | UI-LIVE-3 | actions + panel | **VERIFIED** | Playwright | High |
| Blocked commands absent (browser) | UI-LIVE-3 | admin detail scan | **VERIFIED** | Playwright | High |
| RequestMemberEmailChange (browser) | UI-LIVE-3 | — | **DEFERRED** | self route missing in DEV | High |
| Supabase / production browser auth | UI-LIVE-3 | — | **DEFERRED** | DEV auth only | High |
| DEV session → API → Postgres mutation path | UI-LIVE-3 | server actions + os-api | **VERIFIED** | Playwright + API | High |

**UI-LIVE-3 gate:** **PASS (CONDITIONAL)** — see `UI_LIVE_3_WORKFORCE_ADMIN_MUTATION_EVIDENCE.md`. Artifacts: `.ui-live-3-evidence/`.

---

## UI-LIVE-3B — ChangeDepartment error-contract regression (2026-08-27)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Invalid departmentId → 400 VALIDATION_FAILED (live) | UI-LIVE-3B / Step14.7 | ChangeDepartment command | **VERIFIED** | Playwright + API | High |
| UI shows Spanish validation, not FK/500 | UI-LIVE-3B | command-errors + FormFeedback | **VERIFIED** | Playwright | High |
| Member dept unchanged after invalid attempt | UI-LIVE-3B | Postgres assignment | **VERIFIED** | Playwright | High |
| Valid same-org ChangeDepartment still works | UI-LIVE-3B | member detail | **VERIFIED** | Playwright | High |
| Foreign-tenant departmentId live UI path | UI-LIVE-3B | — | **NOT RUN** | single-org Step17 seed | High |
| Foreign-tenant API contract (no leak) | Step14.7 | workforce-admin-mutation-http.test | **VERIFIED** (backend) | Step14.7 log | High |

**UI-LIVE-3B gate:** **PASS (CONDITIONAL)** — append section in `UI_LIVE_3_WORKFORCE_ADMIN_MUTATION_EVIDENCE.md`. Artifacts: `.ui-live-3-evidence/ui-live-3b-*`.

---

## UI-PREUAT-1 — Cliente 360 null freshness (2026-08-27)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| `freshness: null` is valid query contract | os-query port | `getFreshness → ProjectionFreshness \| null` | **VERIFIED** | live API + port type | High |
| Cliente 360 null-safe stale aggregate | UI-PREUAT-1 | `load-cliente-360.ts`, `projection-freshness.ts` | **FIXED** | load-cliente-360.test.ts | High |
| Empty commercial sections load without crash | UI-PREUAT-1 | Cliente 360 page | **VERIFIED** | live Step17 party | High |

**UI-PREUAT-1 gate:** **CLOSED** — see `PRE_UAT_CLIENTE_360_NULL_FRESHNESS_FIX_EVIDENCE.md`.

---

## Step 16 — Commercial Core (Lane G, 2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Opportunity / Quote / Order authority | Step 16 | `packages/os-commercial`, `os_opportunities`, `os_quotes`, `os_orders` | IMPLEMENTED + VERIFIED | commercial-prisma.integration.test | High |
| PartyGraph customer reference (no duplicate master) | ADR-0004 | `partyId`, `commercialAccountId` FKs | VERIFIED | happy path test | High |
| Commercial command registry | Step 9 / D lane | `commercial-commands.ts`, `command-registry.ts` | IMPLEMENTED | schema + API build | High |
| Commercial BusinessEvents + outbox | Step 11 pattern | `CommercialCommandService.emit` | VERIFIED | postgres integration | High |
| Money in integer centavos (BOB) | Step 9 | `packages/os-commercial/src/money.ts` | TESTED | money.test.ts | High |
| Command HTTP surface | API_SERVICE_CONTRACT | `POST /v1/commands/*` commercial names | INTEGRATED | os-api build | High |
| No invented discount / credit policy | COMMERCIAL readiness | no auto RequestApproval | VERIFIED | code review | High |
| Commercial projections / search reads | Lane F | `packages/os-query/src/commercial/*` | **VERIFIED** | Step 16.1 | High |
| Commercial product UI | Agent 4 | `apps/os-web` Cliente 360 read | **IMPLEMENTED (CONDITIONAL)** | UI-4 tests + build | High |

**Step 16 gate:** **PASS (CONDITIONAL)** — see `STEP_16_COMMERCIAL_CORE_IMPLEMENTATION_EVIDENCE.md`. Log: `.step16-evidence/verify-20260824T130638Z.log`.

---

## Step 16.1 — Commercial projections + authorized read queries (Lane F, 2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Opportunity summary read model | Step 16.1 | `os_opportunity_read_models`, `CommercialProjectionConsumer` | VERIFIED | 6 postgres tests | High |
| Quote summary + line detail read model | Step 16.1 | `os_quotes_read_models`, `os_quote_line_read_models` | VERIFIED | line add/update/remove tests | High |
| Order summary read model | Step 16.1 | `os_order_read_models` | VERIFIED | order create projection | High |
| Hydrate-after-event (no second authority) | Step 15 pattern | `CommercialProjectionConsumer` | VERIFIED | read-only mutation test | High |
| ListOpportunities / GetOpportunity | handoff manifest | `GET /v1/opportunities` | INTEGRATED + HTTP | commercial-runtime.test | High |
| ListQuotes / GetQuote | handoff manifest | `GET /v1/quotes` | INTEGRATED + HTTP | commercial-runtime.test | High |
| ListOrders / GetOrder | handoff manifest | `GET /v1/orders` | INTEGRATED + HTTP | commercial-runtime.test | High |
| Owner/admin authorization scope | SECURITY | `commercial-auth.ts` | VERIFIED | tenant + owner negative tests | High |
| Money centavo parity | Step 16 | bigint projection + string API | VERIFIED | totals equality test | High |
| Replay rebuild from event history | Step 15 pattern | `replayCommercialProjectionForOrg` | VERIFIED | rebuild test | High |
| Duplicate delivery idempotency | Step 11 | consumer dedup + upsert ordering | VERIFIED | duplicate event test | High |
| Party timeline query | CLR-06 | — | **DEFERRED** | no `ListPartyTimeline` contract | High |
| Manager/team commercial visibility | Pilot V1 — not final policy | `commercial.team.read` / `commercial.org.read` | **PILOT** | `leadership-visibility.test.ts` | High |
| Cliente 360 composed endpoint | Agent 4 | — | **NOT VERIFIED** | filter-by-partyId only | High |

**Step 16.1 gate:** **PASS (CONDITIONAL)** — see `STEP_16_1_COMMERCIAL_PROJECTION_EVIDENCE.md`. Log: `.step16-1-evidence/verify-20260824T131442Z.log`.

---

## Step 16.1A — Commercial hardening + Party timeline (Lane F, 2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Order cancel projection | Step 16.1A | `CommercialProjectionConsumer` | VERIFIED | postgres | High |
| Commercial freshness stale/current | Step 15 pattern | `getFreshness` + pending outbox | VERIFIED | postgres | High |
| Commercial HTTP security negatives | SECURITY | `commercial-runtime.test.ts` | VERIFIED | 7 HTTP tests | High |
| Party timeline projection | CLR-06 partial | `os_party_timeline_entries`, `PartyTimelineProjectionConsumer` | VERIFIED | 6 postgres tests | High |
| ListPartyTimeline query | CLR-06 | `GET /v1/parties/:partyId/timeline` | INTEGRATED + HTTP | runtime test | High |
| Timeline allowlisted facts (no raw payload) | SECURITY | `party-timeline-facts.ts` | VERIFIED | HTTP + unit path | High |
| Work/Approval timeline events | CLR-06 | `party-timeline-association.ts` | **VERIFIED** | 7 postgres + 2 HTTP | High |
| `terminated` member query gate | FG auth | canonical `revoked` + `employmentStatus: terminated` | **CLOSED (J-12)** | Step 15.2 corrected tests | High |

**Step 16.1A gate:** **PASS (CONDITIONAL)** — see `STEP_16_1A_COMMERCIAL_TIMELINE_HARDENING_EVIDENCE.md`. Log: `.step16-1a-evidence/verify-20260824T132323Z.log`.

---

## Step 16.1B — Work + Approval Party timeline (Lane F, 2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Work events in Party timeline | CLR-06 | `party-timeline-association.ts` | VERIFIED | 7 postgres | High |
| Approval events in Party timeline | CLR-06 | safe subject resolver | VERIFIED | postgres + HTTP | High |
| commercial_account → Party work link | WORK subject | `getCommercialAccountInOrg` | VERIFIED | postgres | High |
| org_member work/approval excluded | CLR-06 | association resolver | VERIFIED | postgres | High |
| No contextSnapshot in timeline | Step 14.4 | facts allowlist | VERIFIED | HTTP | High |
| Approval security regression | Step 14.4 | unchanged Lane E | VERIFIED | 17 tests | High |
| CLR-06 Lead/Finance timeline | CLR-06 | — | **OPEN** | — | High |

**Step 16.1B gate:** **PASS (CONDITIONAL)** — see `STEP_16_1B_WORK_APPROVAL_TIMELINE_EVIDENCE.md`. Log: `.step16-1b-evidence/verify-20260824T134200Z.log`.

---

## Step 17-Prep — Technical handoff (2026-08-24)

| CLAIM | SOURCE | STATUS | NOTES |
|-------|--------|--------|-------|
| Operations runbooks | `docs/operations/*` | **DOCUMENTED** | Provider-neutral |
| Backup/restore drill | `verify-step-17-backup-restore.sh` | **TESTED** | Local isolated DB |
| Health check script | `scripts/os-health-check.sh` | **IMPLEMENTED** | Liveness only |
| Production hosting | — | **PLANNED** (not deployed) | See Production provider plan section |

**Step 17-Prep gate:** **CONDITIONAL PASS** — see `STEP_17_PREP_TECHNICAL_HANDOFF_EVIDENCE.md`. Log: `.step17-evidence/verify-20260824T130709Z.log`. Hosting selection is **PLANNED** only (`PRODUCTION_STAGING_IMPLEMENTATION_PLAN.md`) — not PRODUCTION-VERIFIED.

---

## Step 17.0 — Production safety preconditions (2026-08-24)

| CLAIM | SOURCE | STATUS | NOTES |
|-------|--------|--------|-------|
| Central env validation | Step 17.0 | **IMPLEMENTED + VERIFIED** | `env-validation.ts` |
| Dev route fail-closed | Step 17.0 | **VERIFIED** | app.module + controller guard |
| Auth mode fail-closed | Step 17.0 | **VERIFIED** | staging/production requires supabase |
| OS_DATABASE_URL boundary | Step 17.0 | **VERIFIED** | no DATABASE_URL fallback |
| Liveness vs readiness | Step 17.0 | **IMPLEMENTED** | `/v1/health`, `/v1/health/ready` |
| Pre-deploy preflight | Step 17.0 | **IMPLEMENTED + VERIFIED** | `os-production-preflight.sh` |
| HG-17-04 dev bootstrap | Step 17.0 | **CLOSED** | |
| HG-17-05 DB URL boundary | Step 17.0 | **CLOSED** | |

**Step 17.0 gate:** **PASS** — see `STEP_17_0_PRODUCTION_SAFETY_PRECONDITIONS_EVIDENCE.md`. Log: `.step17-0-evidence/verify-20260824T131308Z.log`.

---

## Step J-09 — Verify script build reproducibility (2026-08-24)

| CLAIM | SOURCE | CODE LOCATION | STATUS | TEST | CONFIDENCE |
|-------|--------|---------------|--------|------|------------|
| Turbo `^build` graph is correct | turbo.json | `dependsOn: ["^build"]` | VERIFIED | turbo cold build | High |
| os-database → os-query dependency | package.json | `@isalwa/os-query` in os-database deps | VERIFIED | — | High |
| Manual verify lists bypass graph | J-09 finding | affected verify scripts | **CLOSED** | cold 14.4/14.5 | High |
| Shared verify build helper | J-09 fix | `scripts/lib/verify-build.sh` | IMPLEMENTED | sourced by 5 scripts | High |
| verify-step-12 same pattern | J-09B | `verify-step-12.sh` | **CLOSED** | cold verify log | High |

**J-09 gate:** **PASS** — see `STEP_J09_VERIFICATION_REPRODUCIBILITY_EVIDENCE.md`. Cold logs: `.step14-4-evidence/verify-20260824T134610Z.log`, `.step14-5-evidence/verify-20260824T134620Z.log`.

---

## Step J-12 — Terminated member test accuracy (2026-08-24)

| CLAIM | SOURCE | STATUS | TEST | CONFIDENCE |
|-------|--------|--------|------|------------|
| Invalid `accessStatus: terminated` test removed | J-12 | **CLOSED** | Step 15.2 verify | High |
| Canonical terminate denied at query + HTTP | WORKFORCE lifecycle | **VERIFIED** | postgres + HTTP | High |
| J-13 employmentStatus guard | **CLOSED** | Step 14.7 | `activateMember` rejects revoked/terminated | domain + HTTP | High |

**J-12 gate:** **CLOSED** — see `STEP_J12_TERMINATED_MEMBER_TEST_EVIDENCE.md`. Log: `.step15-2-evidence/verify-20260824T134841Z.log`.

---

## Step J-09B — Step 12 verify reproducibility (2026-08-24)

| CLAIM | SOURCE | STATUS | TEST | CONFIDENCE |
|-------|--------|--------|------|------------|
| verify-step-12 turbo build | J-09B | `verify_turbo_build @isalwa/os-api` | VERIFIED | cold log | High |
| J-09 manual-build follow-ups complete | J-09 audit | all identified scripts | **CLOSED** | — | High |

**J-09B gate:** **PASS** — see `STEP_J09B_STEP12_VERIFY_REPRODUCIBILITY_EVIDENCE.md`. Log: `.step12-evidence/verify-20260824T135029Z.log`.

---

## Step F-TEST-01 — Projection test hygiene / Step 14.1 gate ownership (2026-08-24)

| CLAIM | SOURCE | STATUS | TEST | CONFIDENCE |
|-------|--------|--------|------|------------|
| query-runtime.test.ts owned by Step 15.1 | F-TEST-01 classification | **VERIFIED** | `describeHttp('os-api query runtime (Step 15.1)')` | High |
| Step 14.1 os-api scope = tenant isolation only | F-TEST-01 fix | **VERIFIED** | `verify-step-14-1.sh` → `tenant-isolation.test.ts` 2/2 | High |
| query-runtime removed from Step 14.1 gate (not deleted) | F-TEST-01 | **CLOSED** | still in `verify-step-15-1.sh` | High |
| Projection flake = misscoped full-suite contention | F-TEST-01 | **CLOSED** | 3× Step 14.1 PASS post-fix | High |
| Runtime event loss | F-TEST-01 investigation | **NOT FOUND** | Step 15.1 isolated PASS | High |

**F-TEST-01 gate:** **PASS** — see `STEP_F_TEST_01_PROJECTION_TEST_HYGIENE_EVIDENCE.md`. Logs: `.step14-1-evidence/verify-20260824T135335Z.log`, `.step14-1-evidence/verify-20260824T135407Z.log`, `.step14-1-evidence/verify-20260824T135427Z.log`, `.step15-1-evidence/verify-20260824T135457Z.log`.

**Step 14.1 gate (updated):** **PASS** — os-api smoke scoped to workforce tenant isolation; projection HTTP coverage unchanged in Step 15.1.

---

## Production provider / staging plan (2026-08-27; reconciled 2026-09-02)

| CLAIM | SOURCE | STATUS | NOTES |
|-------|--------|--------|-------|
| Production provider architecture | `PRODUCTION_PROVIDER_ARCHITECTURE_REVIEW.md` | **PLANNED** | Recommendation only; no accounts/deploy |
| Staging + production implementation plan | `PRODUCTION_STAGING_IMPLEMENTATION_PLAN.md` | **PLANNED** | Executable topology; not implemented; reconciled for current UAT stage |
| Hosting = Render os-web + os-api | Implementation plan §2 | **PLANNED** | Worker remains co-hosted; no third service |
| OS SoR = managed Postgres 16 | Implementation plan §3 | **PLANNED** | Not Supabase Postgres; not Carmen XL |
| OS Auth = dedicated Supabase projects | Implementation plan §4 | **PLANNED** | Isolated staging vs prod; not Architect |
| GitHub Environments staging/production | Implementation plan §6 | **PLANNED** | Production requires human approval |
| HG-17-01 hosting | Step 17.0 | **OPEN** (plan selected) | Not deployed |
| HG-17-03 monitoring | Step 17.0 | **OPEN** | Sentry + Better Stack planned |
| HG-17-06 backups | Step 17.0 | **OPEN** | PITR + off-host dump planned |

**PRODUCTION/STAGING PLAN = PLANNED** — do **not** treat as IMPLEMENTED or PRODUCTION-VERIFIED.

**Product stage (2026-09-02):** Workforce Admin CONDITIONAL safe for human DEV UAT; Commercial human UAT READY; G-02 DECISION PENDING; first human UAT package READY.

---

## Isa / Álvaro demo + real-data fit (2026-09-02)

| CLAIM | SOURCE | STATUS | NOTES |
|-------|--------|--------|-------|
| Synthetic demo for Isa/Álvaro | UAT guide + Step17 seed | **READY NOW** (DEV) | Not production auth |
| Real workbook load | `DATOS CLIENTES (1).xls` | **NOT YET** | Outside repo; no import |
| Party/contact mapping fit | Intake mapping plan | **CONDITIONAL** | Core maps; GPS gap |
| Location/GPS canonical home | OS schema + Location slice | **IMPLEMENTED** | `os_locations`; evidence: `LOCATION_CANONICAL_SLICE_IMPLEMENTATION_EVIDENCE.md`. Map UI and XLS import still deferred. |
| Auth from spreadsheet | Policy | **FORBIDDEN / NOT CREATED** | — |
| Staging repo prep (PORT/CORS/CI) | Staging plan § | **PLANNED** | Not implemented this session |

See `ISA_ALVARO_DEMO_AND_REAL_DATA_READINESS.md`, `docs/data/CLIENT_DATA_INTAKE_MAPPING_PLAN.md`.
---

## Evidence methodology

1. Read `docs/architecture/*`, `docs/adr/*`, `handoff-manifest.yaml`.  
2. Read `packages/database/prisma/schema.prisma` for ground truth on persistence.  
3. Read `packages/domain/src/events/*` and `packages/database/src/timeline/emit.ts` for event implementation.  
4. Read Planificación derive modules and `planificacion-derive.test.ts`.  
5. Did **not** mark IMPLEMENTED without matching code symbol.
