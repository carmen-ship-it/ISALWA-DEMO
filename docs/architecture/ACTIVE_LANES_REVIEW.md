# Active Lanes Review — Lane E / Lane F / Lane G (Step 16)

**Reviewer:** Lane J (independent QA / security / architecture guardian)  
**Date:** 2026-08-24  
**Mode:** Review only — no implementation changes  
**Rule:** Other agents’ PASS labels are not accepted. Status below is from source, migrations, tests, verify logs, and package imports.

**Status labels:** DOCUMENTED · IMPLEMENTED · TESTED · INTEGRATED · VERIFIED · PRODUCTION-AUTH VERIFIED  
A claim is VERIFIED only when this review can point at runnable code **and** a captured postgres/runtime log that exercised it.

**Current authority:** Prior reconciliation sections preserved. **RECONCILIATION — UI-LIVE-3 WORKFORCE ADMIN** (below) is current for Workforce Admin browser mutation UAT. **G-02 DECISION BRIEF REVIEW** remains **DECISION PENDING**. Commercial UAT: **UI-LIVE-1**. Mutation API: **STEP 14.7**.

---

## Independent gate (do not copy from evidence docs)

| Lane | Agent-claimed gate | Independent result | Blocks merge of that lane? | Blocks Lane G (Commercial)? |
|------|--------------------|--------------------|----------------------------|-----------------------------|
| **E — Work / Approval / Attention** | Step 14 + 14.4 PASS | **CONDITIONAL PASS** | No for approval postgres security slice | **No** for Commercial core; **yes** for Commercial→Approval until subject extension |
| **F — Query / Projection** | Step 15 + 15.1 PASS | **CONDITIONAL PASS** | No for read slice | Work/attention **VERIFIED** (15.1 log); manager scope + dev-auth HTTP remain |
| **G — Commercial (Step 16)** | Step 16 + 16.1 PASS | **CONDITIONAL PASS** | No for Phase 1 write + read slice | **Yes for approval integration, fiscal handoff, and product UI** until gaps below are closed |
| **F ext — Commercial projection (16.1 / 16.1A)** | Step 16.1 + 16.1A PASS | **CONDITIONAL PASS** | No for commercial read slice | N/A |

---

## Claim ledger (evidence-first)

### Lane E — Work / Approval

| Claim | Classification | Evidence | Independent status |
|-------|----------------|----------|-------------------|
| Single WorkItem authority (`os_work_items`), not legacy `Task` | IMPLEMENTED | `packages/os-work`; `packages/os-database/prisma/schema.prisma` `OsWorkItem`; legacy `packages/database` `Task` untouched | **VERIFIED** (no OS writes to legacy Task) |
| Commands: Create / Reassign / Complete / Cancel / RequestApproval / Approve / Reject | IMPLEMENTED | `packages/os-contracts/src/work-commands.ts`; `WorkCommandService.execute` | **TESTED** (postgres); **INTEGRATED** (`POST /v1/commands/:name`); HTTP work cases **not** in `os-api` tenant tests |
| Transactional BusinessEvent + audit + outbox | IMPLEMENTED | `WorkCommandService.emit` → `appendEventAndAudit`; step 14 log work suite | **VERIFIED** for create path in `.step14-evidence/verify-20260824T124359Z.log` |
| Ownership history | IMPLEMENTED | `os_work_item_ownership_history`; reassign test | **VERIFIED** (step 14 log: “reassigns work with ownership history”) |
| Approval terminal outcome | IMPLEMENTED | `os_approval_requests`; approve/reject set status | **TESTED**; **not VERIFIED** against concurrent Approve+Reject (no OCC) |
| Delegation `approval.act` at decision time | IMPLEMENTED | `canDecideApproval`; integration test “approval flow with delegation authority” | **VERIFIED** for **active** delegation; expired/revoked **not** asserted on Approve in work tests |
| Terminate blocked while open work exists | IMPLEMENTED | `WorkforceCommandService.terminateMember` + `listOpenWorkItemsForMember` | **VERIFIED** (step 14 log) |
| Attention not authoritative in Lane E | IMPLEMENTED | No attention writes in `os-work` | **VERIFIED** |
| ReassignWork moved out of workforce | IMPLEMENTED | Not in `WORKFORCE_COMMAND_NAMES`; owned by `os-work` | **EXPECTED CROSS-LANE** (documented) |
| All work commands HTTP-tested for tenant isolation | — | `apps/os-api/src/tenant-isolation.test.ts` only InviteMember + GetMember | **NOT TESTED** |
| Subject integrity (party / member / commercial_account / work_item) | DOCUMENTED (`WORK_SUBJECT_TYPES`) | `validateSubject` only checks `party`; `RequestApprovalPayloadSchema.subjectType` is `z.string()` | **FAIL vs spec** — see E-01 |
| Suspend/open-work policy | DOCUMENTED as deferred in Step 14 evidence | `suspendMember` does not inspect open work | **DOCUMENTED gap** — see E-04 |

### Lane F — Query / Projection

| Claim | Classification | Evidence | Independent status |
|-------|----------------|----------|-------------------|
| Party search projection from outbox | IMPLEMENTED | `PartyProjectionConsumer`; `os_party_read_models`; migration `20260824180000` | **VERIFIED** — `.step15-evidence/verify-20260824T124808Z.log` (5 postgres tests) |
| Query path does not write | IMPLEMENTED | `PartyQueryService` / work query services are reads; party test asserts row count unchanged | **VERIFIED** (party); work queries **TESTED** in `work-projection-prisma.integration.test.ts` **not** in official step 15 log |
| Tenant isolation on party search | IMPLEMENTED | org-scoped `searchParties`; step 15 test | **VERIFIED** |
| Duplicate event does not duplicate party rows | IMPLEMENTED | step 15 test | **VERIFIED** |
| Checkpoint + rebuild | IMPLEMENTED | `replayPartyProjectionForOrg`; step 15 test | **VERIFIED** (party) |
| Staleness metadata | IMPLEMENTED | `os_projection_freshness`; pending outbox threshold | **VERIFIED** (party) |
| GetParty | IMPLEMENTED | `GET /v1/parties/:id` reads **`OsPartyStore` (write model)**, not projection | **INTEGRATED**; dual read path — see F-03 |
| Work / approval / attention read models | IMPLEMENTED | migration `20260824190000`; `WorkProjectionConsumer`; query services; API controllers | **TESTED** in `work-projection-prisma.integration.test.ts`; **NOT VERIFIED** by `scripts/verify-step-15.sh` |
| Attention is derived, not a second task system | IMPLEMENTED | `deriveAttentionReadModels` + `os_attention_read_models` cache | **TESTED** (file exists); **not VERIFIED** officially |
| Authz on work list/get (non-admin cannot read others’ work / spoof owner filter) | IMPLEMENTED | `canViewWork` / `assertWorkListScope`; work-projection test | **TESTED**; **not VERIFIED** officially |
| Projection rebuilt from events alone | DOCUMENTED as event-driven | Consumers **hydrate from `OsPartyStore` / `OsWorkStore`** then upsert read models | **IMPLEMENTED as write-model cache**, not pure event projection — see F-02 |
| Member/workforce query endpoints | DOCUMENTED in contracts `OS_QUERY_NAMES` | Not implemented as Lane F query services | **DEFERRED** |
| Official Step 15 gate covers work projections | Claimed PASS | Verify script runs **only** `projection-prisma.integration.test.ts` | **FAIL as a gate claim** — see F-01 |

### Lane G — Commercial (Step 16 core)

| Claim | Classification | Evidence | Independent status |
|-------|----------------|----------|-------------------|
| Authoritative commercial entities (Opportunity / Quote / QuoteLine / Order) | IMPLEMENTED | `packages/os-commercial`; migrations `20260824200000`; `os_opportunities` / `os_quotes` / `os_quote_lines` / `os_orders` | **VERIFIED** — `.step16-evidence/verify-20260824T130638Z.log` (6 postgres tests) |
| PartyGraph customer identity (no duplicate master) | IMPLEMENTED | All rows `partyId` FK; optional `commercialAccountId` from PartyGraph lens; `requireActiveParty` on create | **VERIFIED** (postgres happy path + cross-tenant party rejection) |
| BusinessEvent + audit + outbox on every command | IMPLEMENTED | `CommercialCommandService.emit` → `appendEventAndAudit`; event count assertions in integration test | **VERIFIED** (representative path + rollback test) |
| Idempotency inside command transaction | IMPLEMENTED | `saveIdempotency` inside `runInTransaction` after command | **VERIFIED** — duplicate key test; **better than Lane E E-05** |
| Money as integer centavos | IMPLEMENTED | `bigint` store fields; `parseCentavos` / `computeQuoteTotals`; `money.test.ts` | **VERIFIED** |
| Finance / fiscal boundary respected | IMPLEMENTED | No invoice, ledger, AR, payment, tax, or SIN fields in schema or commands | **VERIFIED** — commercial amounts only |
| Work / Approval not duplicated | IMPLEMENTED | No `RequestApproval`, `WorkItem`, or `ApprovalRequest` usage in `packages/os-commercial` | **VERIFIED** — Commercial does **not** auto-trigger approvals |
| Auto-approval on discount / amount thresholds | — | Not implemented (explicit deferral in Step 16 evidence) | **VERIFIED absent** (no invented policy) |
| CreateOrder authorization policy | IMPLEMENTED | `member_active` only; no quote-owner check | **POLICY GAP** — see G-02 |
| ownerMemberId validation | IMPLEMENTED | Existence in org only on assign | **GAP** — see G-03 |
| `sourceMetadata` on opportunity | IMPLEMENTED | `z.record(z.unknown())` in contracts; stored in `sourceMetadataJson` column | **NOT in event payloads**; DB accepts arbitrary JSON — see G-01 |
| HTTP command + query wiring | IMPLEMENTED | `commercial.controller.ts`; `commercial-runtime.test.ts` | **DEVELOPMENT VERIFIED** only — dev session headers; see G-07 |
| Product UI (`apps/os-web` clientes) | — | Not part of Step 16 backend gate | **NOT VERIFIED** |

### Lane F extension — Commercial projection (Step 16.1)

| Claim | Classification | Evidence | Independent status |
|-------|----------------|----------|-------------------|
| Commercial read models + consumer | IMPLEMENTED | `commercial-projection-consumer.ts`; migration `20260824210000`; `os_*_read_models` tables | **TESTED** in `commercial-projection-prisma.integration.test.ts` |
| Query path read-only | IMPLEMENTED | `CommercialQueryService` reads projection store only | **TESTED** (integration file) |
| Rebuild from replay | IMPLEMENTED | `replayCommercialProjectionForOrg`; integration test | **TESTED** |
| Duplicate delivery idempotency | IMPLEMENTED | integration test | **TESTED** |
| Tenant + owner scope on queries | IMPLEMENTED | `commercial-auth.ts`; integration test | **TESTED** |
| Hydrate from authoritative write store | IMPLEMENTED | Consumer calls `OsCommercialStore.get*InOrg` after event | **IMPLEMENTED** (same F-02 pattern as party/work) |
| Official Step 16.1 gate log in repo | Claimed VERIFIED | `STEP_16_1_COMMERCIAL_PROJECTION_EVIDENCE.md` cites `.step16-1-evidence/verify-20260824T131442Z.log` | **NOT VERIFIED** — log file **not present** in repo; see G-06 |
| Money parity in projections | IMPLEMENTED | centavos serialized as strings in payloads; bigint in read models | **TESTED** |

---

## Lane E — CONDITIONAL PASS

### What is actually sound

- One OS work authority: `packages/os-work` + `os_work_items` / `os_approval_requests` / `os_work_item_ownership_history`.
- Commands go through session-scoped `WorkCommandService`; tenant is taken from session, not from a client-supplied role.
- Same BusinessEvent / audit / outbox spine as Steps 11–12 (`capabilityKey: 'work'`).
- Optimistic concurrency on **work item** updates (`expectedVersion`).
- Terminate cannot leave a terminated member as owner of open work (must reassign first).
- Legacy commercial `Task` / `AttentionItem` were not extended as OS authority.
- Step 14 verify log (2026-08-24T12:43:59Z): 7 work postgres tests + workforce/party/outbox regression + 2 os-api tenant tests — **PASS as captured**. That log does **not** prove HTTP work/approval commands or concurrent approval.

### Issues

#### E-01 — Unconstrained approval subject (integrity / future finance)

| | |
|--|--|
| **Type** | **FOUNDATION_GAP** (also security-relevant) |
| **Severity** | **High** |
| **Owning lane** | E |
| **Blocks E merge?** | No, if G is forbidden from using approvals |
| **Blocks G / fiscal?** | **Yes** |

`RequestApprovalPayloadSchema.subjectType` is `z.string()`, not `z.enum(WORK_SUBJECT_TYPES)`. `validateSubject` only exists for `party`. A caller can persist an approval against any `subjectType`/`subjectId` (including future commercial/finance IDs) with **no existence or tenant check**. That is an orphan-reference hole and a merge-with-financial-history hole.

**Lane E must:** constrain `subjectType` to `WORK_SUBJECT_TYPES`; validate party / member / work_item (and refuse `commercial_account` until Lane G exists); reject unknown types.

#### E-02 — Approval row has no optimistic concurrency

| | |
|--|--|
| **Type** | FOUNDATION_GAP |
| **Severity** | **High** |
| **Owning lane** | E |
| **Blocks merge?** | No for parallel work; **Yes** before any real approval traffic |

`updateApprovalRequest` patches by id only. Concurrent `Approve` + `Reject` can both pass the in-memory `status === 'pending'` check. Terminal outcome is not actually immutable under race.

**Lane E must:** conditional update `WHERE status = 'pending'` (or version) and treat 0 rows as `CONFLICT`.

#### E-03 — Approval context copied into BusinessEvent payload

| | |
|--|--|
| **Type** | **SECURITY_BLOCKER** (production data) |
| **Severity** | **High** |
| **Owning lane** | E |
| **Blocks merge?** | No for empty/dev tenants; **Yes** before real PII/fiscal context |

`approve` emits `contextSnapshot: approval.contextSnapshotJson`. `RequestApproval.context` is `z.record(z.unknown())`. Clients can put NIT, credentials, or message bodies into the event log / outbox.

**Lane E must:** store context on the approval row only; emit ids + type, not the free-form snapshot; document a denylist for event payloads.

#### E-04 — Suspend leaves open work assigned

| | |
|--|--|
| **Type** | HANDOFF_GAP |
| **Severity** | Medium |
| **Owning lane** | E + B |
| **Blocks merge?** | No |

`suspendMember` does not inspect open work. Suspended members fail `assertMemberActive` on later commands, so work is stranded until `people.admin` reassigns. Terminate is protected; suspend is not.

**Lane E/B must:** either block suspend while open work exists, or require reassignment (same as terminate).

#### E-05 — Idempotency lookup outside the transaction

| | |
|--|--|
| **Type** | FOUNDATION_GAP |
| **Severity** | Medium |
| **Owning lane** | E (pattern shared with other command services) |
| **Blocks merge?** | No |

`findIdempotency` runs before `runInTransaction`. Two concurrent identical keys can both miss and insert duplicate work.

**Lane E must:** perform idempotency get-or-insert inside the same transaction (unique constraint already implied by key table).

#### E-06 — ReassignWork is `people.admin` only

| | |
|--|--|
| **Type** | HANDOFF_GAP |
| **Severity** | Low–Medium |
| **Owning lane** | E |
| **Blocks merge?** | No |

Handoff / UI principles expect manager reassignment. Implementation requires `people.admin`. Managers cannot reassign team work without that scope.

#### E-07 — No Lane E unit tests; no HTTP work tests

| | |
|--|--|
| **Type** | HANDOFF_GAP |
| **Severity** | Medium |
| **Owning lane** | E |
| **Blocks merge?** | No |

`packages/os-work` has **zero** `*.test.ts`. `apps/os-api` tenant tests do not POST work/approval commands or GET work-items.

---

## Lane F — CONDITIONAL PASS

### What is actually sound

- Party search is a **read model**, not a second Party master. Writes remain Lane C commands.
- Query services do not mutate authority tables.
- Party projection: duplicate delivery, checkpoint/rebuild, tenant search, stale freshness — **VERIFIED** in the Step 15 log.
- Work query ACL (owner / creator / `people.admin`; list filter cannot target another member unless admin) is **implemented** and covered by `work-projection-prisma.integration.test.ts`.
- Attention is derived from work/approval read models (ADR-0005), persisted only as a projection cache.
- `GET /v1/work-items` and `GET /v1/approvals` go through query services, not the write store.

### Issues

#### F-01 — Official Step 15 verify does not run work/attention tests

| | |
|--|--|
| **Type** | HANDOFF_GAP |
| **Severity** | **High** (gate honesty) |
| **Owning lane** | F |
| **Blocks merge?** | Party search: no. **Command Center / os-web attention: yes until re-verified** |

`scripts/verify-step-15.sh` runs only `projection-prisma.integration.test.ts` (5 party tests). Work/attention exist in `work-projection-prisma.integration.test.ts` and migration `20260824190000_os_step15_1_work_attention_projection`, which is **after** the captured 12:48Z party verify. Agent PASS for “Step 15” does **not** cover work projections.

`apps/os-web` already calls `listAttention`. That UI is ahead of the official gate.

**Lane F must:** add work-projection tests to `verify-step-15.sh` (or a Step 15.1 script), capture a new log, and stop claiming Step 15 PASS for attention/work.

#### F-02 — Projections hydrate from write stores (cross-lane coupling)

| | |
|--|--|
| **Type** | CROSS_LANE_CHANGE_REQUEST (coupling) / mild **ARCHITECTURE DRIFT** vs “project from events” |
| **Severity** | Medium |
| **Owning lane** | F |
| **Blocks merge?** | No |

`PartyProjectionConsumer` and `WorkProjectionConsumer` treat outbox events as **triggers**, then re-read `OsPartyStore` / `OsWorkStore`. Rebuild cannot succeed from the event log if the write row is gone. `os-query` depends on `os-work` and `os-party`.

Classification: **EXPECTED EXTENSION** for a current-state cache, **not** a second authority — **if** documented. Today Step 15 evidence still describes a purer event projection than the code.

**Lane F must:** document “event-triggered hydrate from write model” in the evidence/handoff; do not let query services grow write methods.

#### F-03 — Dual Party read path; fiscal data on write-model GET

| | |
|--|--|
| **Type** | ARCHITECTURE DRIFT (mild) + future AI/PII |
| **Severity** | Medium |
| **Owning lane** | F + C (API) |
| **Blocks merge?** | No |

`GET /v1/parties` = projection. `GET /v1/parties/:id` = authoritative store including contacts/fiscal. Search index `searchText` includes NIT. Same `member_active` gate as search — entire tenant party list + fiscal tokens in the index.

**Lane F must:** keep GetParty honest (authority vs projection); strip or ACL fiscal fields before any AI retrieval; do not put NIT in unconstrained search text for `member_active`.

#### F-04 — Projection rebuild is not an admin operation

| | |
|--|--|
| **Type** | HANDOFF_GAP |
| **Severity** | Medium |
| **Owning lane** | F |
| **Blocks merge?** | No |

`OperationsController` exposes outbox health/dead-letter retry. Party/work **rebuild** is `replayPartyProjectionForOrg` / `replayWorkProjectionForOrg` (engineer functions). Worker runs **inside** `apps/os-api` (`OS_PROJECTION_WORKER`, poll interval). Stale data is still returned (flagged).

**Lane F must:** document operator steps; add an admin rebuild command or accept “engineer-only rebuild” explicitly in handoff.

#### F-05 — No `packages/os-query` unit tests

| | |
|--|--|
| **Type** | HANDOFF_GAP |
| **Severity** | Low |
| **Owning lane** | F |
| **Blocks merge?** | No |

All query tests live in os-database integration files. Auth filter logic in `work-auth.ts` has no isolated tests besides postgres.

---

## Security attack review

| Attack | Result | Evidence |
|--------|--------|----------|
| Cross-tenant work/party IDs | Commands load by `(organizationId, id)`. Party/work searches filter `organizationId`. | Work postgres “rejects cross-tenant work command”; party search tenant test **VERIFIED**. HTTP work/query **not** in os-api tests. |
| Revoked / terminated member | `assertMemberActive` on command + `buildQueryContext`. | Terminate + open work **VERIFIED**. Query context uses same access status. |
| Expired / revoked delegation | Decision path checks `revokedAt`, `startsAt`, `expiresAt`, `approval.act`, delegator match. Query ACL builds `delegatedApproverFor` the same way. | Active delegate **VERIFIED**. Expired **Approve** not in work suite. |
| Unauthorized approval | Only designated approver or `approval.act` delegate. | Implementation + delegation test. |
| Replayed command | Idempotency key replay returns stored result. | CreateWorkItem idempotency **VERIFIED**; race remains (E-05). |
| Duplicate event | Party **VERIFIED**. Work projection test file covers double `runOnce`. | Work duplicate **TESTED**, not in step 15 log. |
| Malicious query filters | Non-admin `ownerMemberId` ≠ self → `PERMISSION_DENIED`. | **TESTED** in work-projection file. |
| Stale projection | `isStale` + pending outbox; data still served. GetWork is projection (can be stale). GetParty is write model (fresh). | Party stale **VERIFIED**. |
| Direct API | Session required. Default `OS_AUTH_MODE` **dev** trusts validated headers. | Production must use supabase JWT (Step 10.3). |
| Client-supplied tenant/role | JWT path does not trust client member id. Roles from assignments, not body. Dev headers still client-chosen org/member after store check. | Known Step 10 residual. |
| Secrets in events | Approval snapshot in `approval.approved` payload. | **E-03** |
| Merge + financial history | No work/approval handling of party merge; unconstrained approval subject. | **E-01** |
| Future AI retrieval | No `os-ai` yet. Party search + NIT in `searchText` would be the default retrieval surface. | **F-03** |

No **tenant-leak SECURITY_BLOCKER** was demonstrated in the captured postgres tests. The production blockers are **E-01/E-03** (integrity + event PII) and **dev auth** if `OS_AUTH_MODE=dev` is deployed.

---

## Architecture drift

| Change | Classification |
|--------|----------------|
| Work commands/events/query DTOs added to `os-contracts` | **EXPECTED EXTENSION** (Lane E/F owned surface; still shared — PR review required) |
| `ReassignWork` removed from workforce command surface | **EXPECTED CROSS-LANE** (documented in Step 14 evidence) |
| `task.reassigned` vs `work.*` event names | Cosmetic inconsistency, not a second event system |
| Event-triggered hydrate from write stores | **EXPECTED EXTENSION** if documented; otherwise **ARCHITECTURE DRIFT** vs “projections = event log” |
| `GET /parties/:id` from write store vs search from projection | **EXPECTED** split (detail vs search); must stay documented |
| `os_attention_read_models` | Derived **cache**, not a second task authority — **EXPECTED** |
| `os-contracts` already exports `commercial-commands` / `commercial-events`; `os-database` depends on `@isalwa/os-commercial` | **Lane G has started**. Not a silent E/F fork, but **shared-contract contention**. |
| Legacy `Task` / `AttentionItem` | Frozen — **no drift into OS** observed |

No second identity system, second Party master, or second event bus was found in Lanes E/F.

---

## Cross-lane conflicts

| Item | Lanes | Action |
|------|-------|--------|
| `os-query` → `os-work` + `os-party` write ports | F → E, C | Document hydrate contract; F must not add writes |
| Terminate open-work check lives in **workforce** (B) using work store port | B ↔ E | Keep; do not re-add ReassignWork to B |
| Attention UI (`apps/os-web` `listAttention`) | UI ahead of F official gate | **F-01** before treating UI as production |
| Commercial package on shared contracts/database | G ↔ J | G must not use Approval/WorkItem until E-01 + E-03 (G-08); amounts are non-fiscal (G-04) |
| Commercial projection hydrate | F → G | Same F-02 contract; commit 16.1 verify log (G-06) |
| Shared `os-contracts` edits | E, F, G, J | Any further command/event/query change needs **CROSS-LANE CHANGE REQUEST** |

---

## Handoff review (if Carmen disappears tomorrow)

| Question | Lane E | Lane F | Lane G (Step 16) |
|----------|--------|--------|------------------|
| Can normal company users operate this? | **CONDITIONAL** — API only; no admin product UI for reassign-before-terminate | **CONDITIONAL** — party search API exists; os-web attention depends on worker | **CONDITIONAL** — commands/queries via API; no os-web commercial UI |
| Can an admin do ordinary lifecycle? | Terminate/reassign via commands if they have `people.admin` and an API client | Rebuild projections: **engineer-only** | Create quote/order via API; `CreateOrder` policy unclear (G-02) |
| Can another engineer deploy/test/debug? | **CONDITIONAL** — `scripts/verify-step-14.sh` works if Postgres up | **CONDITIONAL** — official verify **misses** work projections | **CONDITIONAL** — `scripts/verify-step-16.sh` works; 16.1 log missing |
| Manual script becoming permanent ops? | Verify scripts are gates, not ops | Projection poll inside API process — **acceptable at current scale** | Same projection worker; verify scripts are gates |
| New service unnecessarily? | No | No (worker in os-api) | No |
| Failure/recovery documented? | Step 14 evidence lists error codes | Outbox retry is API-operable; **projection rebuild is not** | Step 16 evidence documents commands; rebuild via `replayCommercialProjectionForOrg` — **engineer-only** |
| Config admin-operable or developer-only? | `OS_AUTH_MODE`, DB URL — **developer** | `OS_PROJECTION_WORKER`, poll ms — **developer** | Same; commercial HTTP **dev-auth only** in tests |

**Handoff class:** **CONDITIONAL** all three lanes (not FAIL: another engineer can run verify scripts; not PASS: ordinary ISALWA admin cannot run the company from product UI, projection repair is engineering, commercial policy and 16.1 log gaps remain).

---

## Required corrections (owning agent)

### Lane E agent

1. **E-01** Constrain and validate approval/work subjects.  
2. **E-02** Atomic pending→terminal approval update.  
3. **E-03** Stop putting `contextSnapshot` on BusinessEvent/outbox.  
4. **E-04** Align suspend with open-work policy (with Lane B).  
5. **E-05** Idempotency inside the command transaction.  
6. Add HTTP tests for work/approval tenant + unauthorized Approve.  
7. Add expired-delegation **Approve** denial test.

### Lane F agent

1. **F-01** Put `work-projection-prisma.integration.test.ts` on the official verify path; recapture log.  
2. **F-02** Document write-model hydrate; no query writes.  
3. **F-03** Plan fiscal field / searchText ACL before AI.  
4. **F-04** Document rebuild/recovery; do not pretend admin UI exists.  
5. Do not treat `GET /parties/:id` as a projection.

Do **not** implement those in this review.

---

## STEP 16 COMMERCIAL REVIEW

**Scope:** Lane G write path (Step 16) + Lane F commercial projection extension (Step 16.1)  
**Independent result:** **CONDITIONAL PASS** — Phase 1 Opportunity → Quote → Order is real on the OS spine; approval integration, production HTTP auth, and handoff logs are not closed.

### Review-area verdicts

| Area | Verdict | Notes |
|------|---------|-------|
| Commercial → Approval safety | **PASS (isolated)** | No `RequestApproval` / WorkItem coupling today. Future wiring **blocked** until E-01 + E-03. |
| Fiscal / Finance boundary | **PASS** | Commercial centavos only; no ledger, invoice, AR, payment, or tax authority. |
| PartyGraph ownership | **PASS (with merge caveat)** | `partyId` FK + optional `CommercialAccount`; no hidden customer master. |
| Transaction integrity | **VERIFIED** | Common `emit` path; idempotency inside transaction; rollback test captured. |
| Commercial authorization | **CONDITIONAL** | Actor tenant + `member_active` sound; CreateOrder scope and owner assignment gaps remain. |
| Projection safety (16.1) | **CONDITIONAL** | Tests exist; official 16.1 verify log missing from repo (G-06). Hydrate-from-write-store (F-02). |
| Event payload safety | **PASS (with G-01)** | Structured serializers; notes/sourceMetadata not copied into BusinessEvent payloads. |
| Dev auth residual | **DEVELOPMENT VERIFIED** | HTTP commercial tests use `x-os-*` dev headers; no Supabase-mode HTTP evidence. |
| Low-maintenance handoff | **CONDITIONAL** | Engineer can run `verify-step-16.sh`; 16.1 log absent; no product UI; rebuild engineer-only. |

### What is actually sound

- One commercial authority: `packages/os-commercial` + `os_opportunities` / `os_quotes` / `os_quote_lines` / `os_orders` — not legacy `apps/api` commerce.
- Commands route through `CommercialCommandService` with session-scoped tenant (`assertTenantMatch`); cross-tenant party on create returns `NOT_FOUND`.
- Same BusinessEvent / audit / outbox spine as prior steps (`capabilityKey: 'commercial'`).
- Idempotency record saved **inside** `runInTransaction` (contrast Lane E E-05).
- PartyGraph respected: `requireActiveParty` blocks inactive/merged parties on new commercial writes; `commercialAccountId` resolved from PartyGraph lens when active.
- **No** auto-triggered approvals, discount thresholds, or second approval engine — Lane E `RequestApproval` is not called from Commercial.
- **No** fiscal drift: schema and events carry commercial quote/order totals only (bigint centavos).
- Step 16 verify log (2026-08-24T13:06:38Z): 6 postgres commercial tests — **PASS as captured**.
- Step 16.1 code path: projection consumer hydrates from `OsCommercialStore`, rebuild + tenant/owner tests in `commercial-projection-prisma.integration.test.ts`.

### Issues

#### G-01 — Unconstrained `sourceMetadata` in write model

| | |
|--|--|
| **Type** | **DATA_INTEGRITY** |
| **Severity** | **Low** |
| **Owner** | Lane G |
| **Evidence** | `packages/os-contracts/src/commercial-commands.ts` (`sourceMetadata: z.record(z.unknown())`); `CommercialCommandService.createOpportunity` / `updateOpportunity` persist to `sourceMetadataJson` |
| **Impact** | Arbitrary JSON can be stored in authoritative row; not emitted in `serializeOpportunity` / BusinessEvent payloads today, but DB column is unconstrained. |
| **Required fix** | Constrain schema (typed keys + size limit) or document column as internal-only, non-event, non-projection. |
| **Blocks what** | Production promotion of opportunity import/metadata features |
| **Retest** | Postgres test: oversized / secret-bearing `sourceMetadata` rejected or stripped |

#### G-02 — `CreateOrder` lacks quote-owner scope

| | |
|--|--|
| **Type** | **AUTHORIZATION_POLICY** |
| **Severity** | **Medium** |
| **Owner** | Lane G (+ Carmen product policy) |
| **Evidence** | `createOrder` calls `authorize(ctx, 'CreateOrder', …)` only (`member_active`); no `assertCanEditQuote` / owner check; `COMMAND_REQUIRED_SCOPES.CreateOrder` = `member_active` |
| **Impact** | Any active org member can convert any **submitted** quote to an order, not only quote owner or `people.admin`. |
| **Required fix** | Product decision: if order conversion is owner-governed, require owner or admin (mirror `CancelOrder`). If org-wide conversion is intended, document in handoff manifest. |
| **Blocks what** | Production order-conversion policy sign-off |
| **Retest** | Postgres + HTTP: non-owner `CreateOrder` denied or accepted per documented policy |

#### G-03 — `ownerMemberId` assignment skips member access status

| | |
|--|--|
| **Type** | **AUTHORIZATION_GAP** |
| **Severity** | **Low** |
| **Owner** | Lane G (+ Lane B for member lifecycle) |
| **Evidence** | `createOpportunity` / `createQuote` / `assignOpportunityOwner`: `getMemberInOrg` existence check only; no `accessStatus === 'active'` on assignee |
| **Impact** | Suspended/terminated members can be recorded as commercial owners; they cannot act (actor `assertMemberActive`), but ownership records and query filters become inconsistent. |
| **Required fix** | Reject assignment when assignee `accessStatus !== 'active'`. |
| **Blocks what** | Clean workforce/commercial lifecycle handoff |
| **Retest** | Postgres: assign to suspended member → `VALIDATION_FAILED` |

#### G-04 — Commercial totals not contractually labeled non-fiscal

| | |
|--|--|
| **Type** | **BOUNDARY_DOCUMENTATION** |
| **Severity** | **Low** |
| **Owner** | Lane G + architecture docs |
| **Evidence** | `order.created` / quote payloads expose `totalCentavos`; no `authority: commercial_estimate` marker in contracts or API responses |
| **Impact** | Downstream lanes (Finance, UI, AI) may treat order total as billable/fiscal truth without explicit guardrail. |
| **Required fix** | Add explicit non-fiscal labeling in `os-contracts` query types and handoff manifest (amounts are commercial estimates until Finance lane owns invoice). |
| **Blocks what** | Finance lane integration and Cliente 360 fiscal displays |
| **Retest** | Doc + contract review; no code regression required |

#### G-05 — Party merge leaves historical `partyId` on commercial rows

| | |
|--|--|
| **Type** | **DOCUMENTED_BEHAVIOR** (not a bug if documented) |
| **Severity** | **Low** |
| **Owner** | Lane G + Lane C (PartyGraph) |
| **Evidence** | `requireActiveParty` blocks new writes to merged/inactive parties; existing `os_opportunities.party_id` unchanged on merge; FK preserved |
| **Impact** | Historical commercial records point at pre-merge party id; queries must resolve lineage via PartyGraph merge graph for Cliente 360. |
| **Required fix** | Document in handoff manifest: commercial rows are immutable party references; merge does not rewrite commercial FKs. |
| **Blocks what** | Cliente 360 / timeline composed UI |
| **Retest** | Integration test: merge party → old commercial row still readable; new create on merged party rejected |

#### G-06 — Step 16.1 official verify log not in repository

| | |
|--|--|
| **Type** | **EVIDENCE_GAP** |
| **Severity** | **Medium** |
| **Owner** | Lane F (commercial projection) + Lane G |
| **Evidence** | `STEP_16_1_COMMERCIAL_PROJECTION_EVIDENCE.md` cites `.step16-1-evidence/verify-20260824T131442Z.log`; file **not present** in repo; `scripts/verify-step-16-1.sh` exists and would run projection + HTTP tests |
| **Impact** | Lane J cannot independently confirm 16.1 gate the way Step 16 core is confirmed; same class of overclaim as F-01. |
| **Required fix** | Run `scripts/verify-step-16-1.sh`; commit captured log under `.step16-1-evidence/`. |
| **Blocks what** | Promoting commercial read path to **VERIFIED** |
| **Retest** | Lane J re-review of committed log |

#### G-07 — HTTP commercial evidence is dev-auth only

| | |
|--|--|
| **Type** | **SECURITY_EVIDENCE** (pre-existing OS auth residual) |
| **Severity** | **Medium** |
| **Owner** | Lane J / platform + Lane G |
| **Evidence** | `apps/os-api/src/commercial-runtime.test.ts` uses `x-os-organization-id` / `x-os-member-id` headers; `os-store.module.ts` defaults `OS_AUTH_MODE` to `dev`; no commercial HTTP tests under `OS_AUTH_MODE=supabase` |
| **Impact** | HTTP integration proves routing and projection drain, **not** production Supabase JWT boundary for commercial endpoints. |
| **Required fix** | Capture at least one commercial HTTP path under `OS_AUTH_MODE=supabase` (or document as postgres-only gate until Supabase test harness exists). |
| **Blocks what** | **VERIFIED** label on commercial HTTP / production deploy |
| **Retest** | HTTP test log with `OS_AUTH_MODE=supabase` |

#### G-08 — Future Commercial → Approval integration blocked by Lane E gaps

| | |
|--|--|
| **Type** | **CROSS_LANE_BLOCKER** |
| **Severity** | **High** (gate, not current defect) |
| **Owner** | Lane G (when integrating) + Lane E (E-01, E-03) |
| **Evidence** | Commercial has no approval wiring today; Lane E `RequestApproval` still accepts arbitrary `subjectType` (E-01) and copies `contextSnapshot` to events (E-03) |
| **Impact** | First PR that wires quote/order approval to Work/Approval will inherit E-01/E-03 unless fixed first. |
| **Required fix** | **Do not merge** Commercial approval integration until E-01 + E-03 closed; use typed commercial subject refs only. |
| **Blocks what** | Discount approval, quote sign-off, fiscal-adjacent workflows |
| **Retest** | Lane J review of first approval-integration PR |

### Lane G — CONDITIONAL PASS

Phase 1 commercial write path is **architecturally aligned** and **postgres-verified**. Not promoted to PASS because of G-02 policy gap, G-06 missing 16.1 log, G-07 dev-auth HTTP evidence, and explicit future blocker G-08 on approval wiring.

### Lane F commercial extension — CONDITIONAL PASS

Implementation matches documented hydrate pattern and has integration tests. Not **VERIFIED** until G-06 log is committed (parallel to F-01 for work projections).

---

### Required corrections (owning agent) — Lane G

1. **G-02** Resolve and enforce `CreateOrder` scope (owner/admin vs org-wide).  
2. **G-03** Reject `ownerMemberId` when assignee not `accessStatus: active`.  
3. **G-01** Constrain or document `sourceMetadata`.  
4. **G-04** Label commercial amounts non-fiscal in contracts/handoff.  
5. **G-05** Document party-merge immutability on commercial FKs.  
6. **G-06** Run `scripts/verify-step-16-1.sh` and commit log.  
7. **G-07** Add Supabase-mode HTTP evidence or accept postgres-only HTTP gate explicitly.  
8. **G-08** Do **not** wire `RequestApproval` until E-01 + E-03 are fixed.

Do **not** implement those in this review.

---

### OVERALL STATUS

**CONDITIONAL PASS** on Lanes E, F, and G (Step 16). Party search, work commands (postgres), and commercial Phase 1 write path are real. Agent Step 14/15/16 PASS labels overclaim HTTP Supabase coverage, approval concurrency, subject integrity, work-projection gate evidence, and Step 16.1 captured log.

### LANE E STATUS

**CONDITIONAL PASS**

### LANE F STATUS

**CONDITIONAL PASS** (party search **VERIFIED**; work/attention **TESTED**, official gate **incomplete**; commercial projection **TESTED**, 16.1 log **missing**)

### LANE G STATUS (STEP 16)

**CONDITIONAL PASS** (core write path **VERIFIED** postgres; read path **TESTED**; HTTP **DEVELOPMENT VERIFIED**; approval integration **not started** — correctly isolated)

### SECURITY BLOCKERS

1. **E-03** — free-form approval context in event/outbox payloads (production PII/secrets).  
2. **E-01** — unconstrained approval subjects (integrity; blocks Commercial approval wiring per G-08).  
3. **Deploy `OS_AUTH_MODE=dev`** — client-chosen member/org headers (pre-existing Step 10 residual; commercial HTTP tests still use it per G-07).

No demonstrated cross-tenant read/write in captured commercial postgres tests. Cross-tenant GET quote returns 404 in dev-auth HTTP test.

### ARCHITECTURE DRIFT

Mild: event-triggered **hydrate-from-write-store** vs event-only projection (party, work, **and commercial**); Party GET vs search split; `task.reassigned` naming. **No** second identity, Party, event, task, or **customer** authority in OS. Commercial correctly references PartyGraph without duplicate master.

### CROSS-LANE CONFLICTS

F coupled to E/C/G stores for hydrate. B terminate checks E work. G on `os-contracts` / `os-database` with commercial event types registered. UI consumes attention before F-01. **G-08:** Commercial must not wire Approval until E-01 + E-03. None are silent dual-masters; they need explicit contracts.

### HANDOFF GAPS

No product admin UI for reassign-before-terminate. Projection rebuild engineer-only. Official Step 15 script outdated vs work projections. Step 16.1 verify log not committed (G-06). os-web attention depends on in-process worker. No `apps/os-web` commercial UI verified. `CreateOrder` policy undocumented (G-02).

### SAFE TO CONTINUE IN PARALLEL?

**YES** — with gates:

- Lane G **must not** wire `RequestApproval` / WorkItem to commercial until **E-01 + E-03** are fixed (G-08).  
- Lane G **must not** write through query APIs.  
- Lane G **must not** expose commercial totals as fiscal truth (G-04).  
- Command Center / attention UI **must not** be called VERIFIED until **F-01**.  
- Commercial read path **must not** be called VERIFIED until **G-06** (and F-01 for work reads).  
- No further silent `os-contracts` command/event changes without CROSS-LANE CHANGE REQUEST.

### WHAT CARMEN NEEDS TO DO

1. Treat published Step 14/15/16 PASS as **postgres-slice** (and dev-auth HTTP for 16.1), not production/handoff PASS.  
2. **Decide G-02:** who may run `CreateOrder` — quote owner only, or any active member?  
3. Refuse Lane G approval/fiscal integration until **E-01 + E-03** are closed.  
4. Keep `OS_AUTH_MODE` off `dev` in any shared environment (already a Step 10 rule).  
5. Request Lane F/G capture **G-06** log before treating commercial queries as verified.  
6. No other Carmen operational work required for Phase 1 API slice; product UI still absent.

### EXACT NEXT REVIEW POINT

Re-review when **all** of the following exist in-repo:

1. Lane E PR (or patch) for **E-01 + E-02 + E-03** with postgres tests (unknown subjectType rejected; concurrent approval CONFLICT; event payload without context snapshot).  
2. Lane F **Step 15.1** verify log that includes `work-projection-prisma.integration.test.ts`.  
3. Lane G/F **Step 16.1** verify log committed (G-06) + Carmen decision on **G-02** documented.  
4. First Lane G PR that touches `RequestApproval`, `WorkItem`, or shared approval subject types — **stop and review before merge**.

Until then, Lane J does not promote E, F, or G to PASS.

---

## RECONCILIATION — Step 14.4 + Commercial Gates (2026-08-24 PM)

**Reviewer:** Lane J (independent re-review)  
**Trigger:** Step 14.4 approval remediation + Step 16.1 / 16.1A completion  
**Method:** Source inspection, captured logs, `./scripts/verify-step-14-4.sh` re-run attempt

### Finding reconciliation ledger

| ID | Previous verdict | New evidence | Current verdict |
|----|------------------|--------------|-----------------|
| **E-01** | OPEN — `z.string()` subjectType | `APPROVAL_SUBJECT_TYPES` enum; `validateApprovalSubject()`; tests 1–5 in `approval-security-prisma.integration.test.ts`; log `.step14-4-evidence/verify-20260824T131833Z.log` (17/17) | **CLOSED** |
| **E-02** | OPEN — read-then-write race | `decidePendingApprovalRequest` → `updateMany WHERE status='pending'`; concurrent test 10; immutability test 11 | **CLOSED** |
| **E-03** | OPEN — `contextSnapshot` in events | Bounded row snapshot only; event payloads canonical; tests 6–8 assert no `contextSnapshot` in BusinessEvent/outbox | **CLOSED** |
| **E-05** | OPEN — idempotency outside tx (work) | `saveIdempotency` now inside `runInTransaction` in `WorkCommandService.execute` (same pattern as Commercial) | **CLOSED** (not previously re-reviewed; observed during 14.4 pass) |
| **G-01** | OPEN — `sourceMetadata` unconstrained | Still `z.record(z.unknown())` in contracts; stored in DB; **not** in event serializers | **STILL OPEN** (Low) |
| **G-02** | CLIENT POLICY — CreateOrder scope | Still `member_active` only; 16.1A HTTP negatives do not test CreateOrder actor policy | **CLIENT POLICY** (unchanged) |
| **G-03** | OPEN — owner assignee accessStatus | Still existence-only on `ownerMemberId` assign | **STILL OPEN** (Low) |
| **G-04** | OPEN — non-fiscal labeling | No contract marker on commercial amounts | **DEFERRED** (docs/contracts) |
| **G-05** | OPEN — party merge FK immutability | Unchanged; `requireActiveParty` blocks new writes to merged parties | **INFO ONLY** — document in handoff |
| **G-06** | OPEN — 16.1 log missing | Logs **present**: `.step16-1-evidence/verify-20260824T131442Z.log` (6 projection + 6 core + 2 HTTP); `.step16-1a-evidence/verify-20260824T132323Z.log` (11 projection + 6 timeline + 6 core + 7 HTTP) | **CLOSED** |
| **G-07** | OPEN — dev-auth HTTP only | Step 16/16.1/16.1A HTTP tests use `x-os-*` headers; Step 10.3 Supabase JWT verified globally (`.step10-3-evidence/verify-20260824T120200Z.log`) | **PARTIAL** — domain verified; HTTP routing dev-auth; Supabase commercial E2E not verified |
| **G-08** | STILL BLOCKED — E-01 + E-03 | E-01/E-03 **closed**; `quote`/`order`/`opportunity`/`commercial_account` **not** in `APPROVAL_SUBJECT_TYPES` | **PARTIAL** — foundation security cleared; **explicit subject-type extension required** before Commercial→Approval |
| **J-09** | — (new) | `./scripts/verify-step-14-4.sh` re-run **failed** `@isalwa/os-database` build: `MemberQueryStorePort` import from `@isalwa/os-query` without building `os-query` first (`prisma-member-query-store.ts`). Captured 14.4 log passed earlier same day (likely warm `dist/`). | **OPEN** (Medium — verify reproducibility) |

### Lane E — Step 14.4 re-verdict

**E-01 — APPROVAL SUBJECT SAFETY — CLOSED**

| Check | Result | Evidence |
|-------|--------|----------|
| `subjectType` enum constrained | **YES** | `RequestApprovalPayloadSchema.subjectType: z.enum(APPROVAL_SUBJECT_TYPES)` |
| Arbitrary string rejected | **YES** | Test: `invoice` → `VALIDATION_FAILED` |
| `commercial_account` blocked | **YES** | In `APPROVAL_SUBJECT_TYPES_BLOCKED`; not in enum; test rejects at Zod |
| Existence validated | **YES** | `validateApprovalSubject()` per type |
| Tenant validated | **YES** | Cross-tenant party → `NOT_FOUND` |
| Lifecycle enforced | **YES** | `organization_member` requires `accessStatus === 'active'`; `work_item` requires `status === 'open'` |

**Safe approval subject types now (enabled):** `party`, `organization_member`, `work_item`

**Not enabled (require explicit extension):** `commercial_account` (explicitly blocked), `quote`, `order`, `opportunity`, any string outside enum

**Coverage gap (not reopening E-01):** Dedicated happy-path postgres tests exercise `party` only; `organization_member` and `work_item` validators implemented but not separately asserted in 14.4 suite.

**E-02 — DECISION CONCURRENCY — CLOSED**

- `PrismaOsWorkStore.decidePendingApprovalRequest` uses `updateMany({ where: { status: 'pending' } })` — DB-conditional, not check-then-write alone.
- Concurrent `Approve` + `Reject`: exactly one fulfills, one `CONFLICT`; row terminal not pending.
- Second terminal attempt: `CONFLICT`; decision fields not overwritten.
- Duplicate `Approve` with same idempotency key: single `approval.approved` event.

**E-03 — EVENT PAYLOAD SAFETY — CLOSED**

**`approval.requested` fields:** `approvalRequestId`, `approverMemberId`, `workItemId`, `subjectType`, `subjectId`

**`approval.approved` / `approval.rejected` fields:** `approvalRequestId`, `subjectType`, `subjectId`, `requestedByMemberId`, `approverMemberId`, `decision`, `decisionByMemberId`, `decidedAt`, optional `reason` (max 500)

**Excluded from events/outbox:** `contextSnapshot`, arbitrary request body, secrets

**Row-only bounded context:** optional `note` (max 500) + system-derived fields in `contextSnapshotJson` on `os_approval_requests`

**AuditLog on decision:** `{ status }` before / `{ status, decisionByMemberId }` after — not arbitrary dump

### G-08 — Commercial→Approval gate (recalculated)

| Layer | Status |
|-------|--------|
| Foundation security (E-01/E-03) | **CLOSED** — Approval spine is safe for governed subjects |
| Commercial core today | **UNBLOCKED** — Commercial does not call Approval |
| Commercial→Approval integration | **STILL BLOCKED** as **explicit subject-type extension**, not security defect |
| Required before quote/order approval | Add subject to `APPROVAL_SUBJECT_TYPES`, register validator (tenant + existence + lifecycle), postgres tests, evidence update |

### G-06 — Commercial projection evidence — CLOSED

| Log | Postgres | HTTP |
|-----|----------|------|
| `.step16-1-evidence/verify-20260824T131442Z.log` | 6 projection + 6 core regression | 2 dev-auth |
| `.step16-1a-evidence/verify-20260824T132323Z.log` | 11 projection (incl. order cancel, freshness, schema reject) + 6 timeline + 6 core | 7 dev-auth (cross-tenant, filter abuse, suspended, timeline) |

Projection rebuild, tenant negatives, freshness, and order cancellation: **VERIFIED** in 16.1A log.

### G-07 — Auth evidence (refined)

| Layer | Status |
|-------|--------|
| **COMMERCIAL DOMAIN** | **VERIFIED** — postgres integration tests (Step 16 + 16.1 + 16.1A) |
| **COMMERCIAL HTTP ROUTING** | **VERIFIED** (dev-auth) — commands, queries, timeline wiring |
| **SUPABASE-AUTH COMMERCIAL E2E** | **NOT VERIFIED** — no commercial path under `OS_AUTH_MODE=supabase` |
| **Platform auth architecture** | **PRODUCTION-AUTH VERIFIED** (Step 10.3) — JWT session + terminated rejection; does not extend automatically to commercial HTTP tests |

### G-02 — CreateOrder policy (unchanged — client decision)

Current implementation: any `member_active` may `CreateOrder` from a **submitted** quote. This is a **valid technical default pending business policy**, not a demonstrated security defect against an approved authorization contract.

| Option | Consequence |
|--------|-------------|
| **A — quote owner only** | Tighter sales accountability; non-owners cannot convert; mirror `CancelOrder` owner/admin pattern |
| **B — any authorized Commercial user** | Faster ops handoff; any active member can close submitted quotes; document explicitly |
| **C — role/scope gated** | e.g. `commercial.convert_order` scope; supports delegated back-office without full admin |

**Carmen/ISALWA must choose** — Lane J does not select.

### Step 16.1A — Party + Commercial timeline

| Check | Result |
|-------|--------|
| Canonical BusinessEvent only | **YES** — timeline consumer reads outbox envelopes |
| No ActivityEvent | **YES** — not used |
| Raw payload not exposed | **YES** — `extractTimelineFacts` allowlist; HTTP test asserts no raw `payload` |
| Party association deterministic | **YES** — `resolvePartyIdForTimeline` |
| Tenant isolation | **YES** — postgres + HTTP 404 |
| Timeline non-authoritative | **YES** — projection table `os_party_timeline_entries` |
| Work/Approval timeline | **DEFERRED** — correctly not in v1 consumer |
| Terminated member query auth | **CLOSED** for canonical path — see **RECONCILIATION — TERMINATED MEMBER AUTH / STEP 15.2**; J-11 **WITHDRAWN**; J-12 invalid postgres test remains |

### Updated gate summary (supersedes OVERALL STATUS block above)

| Lane / Step | Status |
|-------------|--------|
| Lane E (approval security) | **CONDITIONAL PASS** — E-01/E-02/E-03 **CLOSED**; HTTP work coverage + J-09 verify reproducibility remain |
| Step 16 core | **CONDITIONAL PASS** — postgres **VERIFIED**; G-02 policy open |
| Step 16.1 read side | **CONDITIONAL PASS** — postgres **VERIFIED** (log captured); HTTP dev-auth only |
| Step 16.1A timeline | **CONDITIONAL PASS** — Party/Commercial timeline **VERIFIED** postgres; Work/Approval deferred |

### Security blockers (current)

1. **Deploy `OS_AUTH_MODE=dev` in non-dev environments** — pre-existing; commercial HTTP tests still dev-auth (G-07).  
2. **J-09** — `verify-step-14-4.sh` may not reproduce from clean build after member-query store addition.

**Removed from blockers:** E-01, E-02, E-03 (closed Step 14.4).

### Exact next review point

1. Carmen decision on **G-02** documented.  
2. Lane F **F-01** — Step 15.1 work-projection verify log.  
3. **J-09** — fix verify script build order or document warm-build requirement.  
4. First PR wiring Commercial→Approval with new subject type — stop for Lane J review.  
5. Optional: commercial HTTP test under `OS_AUTH_MODE=supabase` (G-07 closure).

---

## RECONCILIATION — F-01 / E-04 / J-09 (2026-08-24 PM)

**Reviewer:** Lane J  
**Trigger:** Step 15.1 work/attention gate, Step 14.5 suspend lifecycle, J-09 reproducibility investigation  
**Method:** Evidence docs, captured logs, source inspection, `./scripts/verify-step-14-5.sh` re-run (with pre-built `os-query`), clean-build experiment (`rm packages/os-query/dist && pnpm --filter @isalwa/os-database build`)

### Finding reconciliation ledger

| ID | Previous status | New evidence | Current status | Owner | Blocks what | Retest |
|----|-----------------|--------------|----------------|-------|-------------|--------|
| **F-01** | OPEN — Step 15 script omitted work projections | `scripts/verify-step-15-1.sh` runs `work-projection-prisma.integration.test.ts` (7), party regression (5), `query-runtime.test.ts` (4), `tenant-isolation.test.ts` (2); log `.step15-1-evidence/verify-20260824T125720Z.log` all PASS; script builds `os-query` before `os-database` | **CLOSED** | Lane F | Nothing — legitimate Step 15.1 gate exists | Re-run `verify-step-15-1.sh` on material Lane F changes |
| **E-04** | OPEN — suspend/open-work undocumented gap | Step 14.5: 11/11 lifecycle tests; log `.step14-5-evidence/verify-20260824T132828Z.log`; `handoff-manifest.yaml` only `TerminateMember` requires `open_work_reassignment`; `WORKFORCE_ORGANIZATION_LIFECYCLE.md` documents hold/delegate/reassign; Step 14.6 auth revoke on suspend (8 tests, log `.step14-6-evidence/verify-20260824T133913Z.log`) | **CLOSED** (architecture + security) | Lane E/B | Nothing for suspend hold model | Re-run `verify-step-14-5.sh` + `verify-step-14-6.sh` on workforce changes |
| **O-05** | (tracked in discovery matrix) | `INCREMENT_7_DISCOVERY_MATRIX.md` — leave-type access rules | **CLIENT POLICY** | Carmen / ISALWA | HR-sensitive leave workflows only — **not** Commercial core | Client workshop |
| **J-09** | OPEN — 14.4 verify failed without warm `dist/` | `os-database/package.json` correctly depends on `@isalwa/os-query`; turbo `build.dependsOn: ["^build"]` is correct; verify scripts use manual `pnpm --filter` and **skip** `os-query` in Lane E gates; clean build without `os-query/dist` fails `tsc` on `prisma-member-query-store.ts` | **OPEN** — **J-09A** (verify script) + **J-09C** (scripts bypass turbo graph) | Platform / lane owners | Reproducibility of captured logs from clean checkout — **not** runtime correctness | Fix scripts + cold-checkout re-capture |

### F-01 — Step 15.1 evidence (independent)

**Question:** Does repository evidence reproducibly verify Lane F Work/Approval/Attention?

**Answer: YES** — via `verify-step-15-1.sh`, not legacy `verify-step-15.sh` (party-only, historical).

| Criterion | In 15.1 script? | In captured log? |
|-----------|-----------------|------------------|
| Work projection postgres | **YES** — 7 tests | PASS |
| Approval projection | **YES** — within work projection suite | PASS |
| Attention derivation | **YES** — within work projection suite | PASS |
| Tenant isolation (postgres) | **YES** | PASS |
| Authorization negatives (postgres) | **YES** — owner scope, filter abuse | PASS |
| Rebuild/replay | **YES** | PASS |
| HTTP query runtime | **YES** — 4 tests (dev-auth) | PASS |
| Party projection regression | **YES** — 5 tests | PASS |

**Not in F-01 scope (separate deferrals):** manager hierarchy visibility, Supabase-auth HTTP E2E, terminated-member HTTP negative.

**Legacy note:** `verify-step-15.sh` remains party-only — informational only; does not reopen F-01.

### E-04 — Suspend / open work (independent)

**Architectural safety: YES**

| # | Claim | Verified |
|---|-------|----------|
| 1 | Only termination requires mandatory open-work reassignment | **YES** — `handoff-manifest.yaml`; terminate test in work regression |
| 2 | Suspend preserves open Work ownership (hold) | **YES** — test 2, 14.5 |
| 3 | No silent delete/reassign on suspend | **YES** — ownership unchanged |
| 4 | Suspended owner cannot act | **YES** — complete/reassign blocked |
| 5 | Suspended member cannot approve/request | **YES** — test 5 |
| 6 | Suspended delegate cannot exercise authority | **YES** — test 6 |
| 7 | Reactivation restores access without ownership rewrite | **YES** — test 8 |
| 8 | Transaction/idempotency | **YES** — tests 9–10 |
| 9 | Tenant isolation | **YES** — test 11 |
| 10 | Auth provider session revoke on suspend | **YES** — Step 14.6 test 1 + `suspendMember` schedules `scheduleProviderRevokeSessions` |

**Suspend ≠ terminate** is **contracted architecture**, not a security gap. Mandatory reassignment-before-suspend would be a **client HR policy choice**, not required for safety.

### O-05 — Actual impact

| Area | Blocked by O-05? |
|------|------------------|
| A. Generic Workforce foundation (invite, activate, suspend, terminate, roles) | **NO** |
| B. Commercial core (Opportunity / Quote / Order write path) | **NO** |
| C. Commercial read projections / timeline | **NO** |
| D. HR-sensitive production workflows (differentiated unpaid / medical / suspension access rules, `on_leave` vs `suspend` semantics) | **YES** — client must decide before production HR workflows |

Discovery matrix label `REQUIRED BEFORE COMMERCIAL` is **over-broad** for Phase 1 commercial objects; O-05 does not create a real dependency on quote/order mechanics.

### J-09 — Reproducibility root cause

| Sub-class | Finding |
|-----------|---------|
| **J-09A — VERIFY SCRIPT DEFECT** | Lane E scripts build `@isalwa/os-database` without building `@isalwa/os-query` first |
| **J-09B — PACKAGE DEPENDENCY** | **NOT A DEFECT** — `os-database` correctly declares `@isalwa/os-query` in `package.json` |
| **J-09C — BUILD GRAPH BYPASS** | Turbo `^build` is correct; verify scripts use isolated `pnpm --filter X build` and do not invoke turbo graph |

**Scripts missing `os-query` build (confirmed):** `verify-step-14.sh`, `verify-step-14-1.sh`, `verify-step-14-4.sh`, `verify-step-14-5.sh`, `verify-step-16.sh`

**Scripts that include `os-query` build:** `verify-step-14-6.sh`, `verify-step-15.sh`, `verify-step-15-1.sh`, `verify-step-15-2.sh`, `verify-step-16-1.sh`, `verify-step-16-1a.sh`, `verify-step-17-0.sh`

**Runtime implementation:** **NOT BROKEN** — only verification orchestration and cold-checkout reproducibility.

**Does J-09 invalidate Step 14.4 implementation evidence?** **NO** — source + captured log + tests are valid; failure is cold-build reproduction without warm `packages/os-query/dist`.

### Minimum clean-build verification standard (recommendation — not implemented)

1. **Each gate script must compile all transitive workspace dependencies** of packages it builds — smallest fix: `pnpm exec turbo run build --filter=@isalwa/os-database...` (uses `^build`) instead of manual per-package lists.
2. **Captured log must record the exact command** and timestamp under `.step*-evidence/`.
3. **Periodic cold-checkout check** (CI weekly or pre-release): fresh clone → single representative gate (`verify-step-15-1.sh`) without prior `dist/` artifacts.
4. **Do not require** full monorepo rebuild for every small lane test — scoped turbo filter is sufficient.

### Updated parallel safety

| Agent | Safe? | Scope |
|-------|-------|-------|
| Agent 1 — auth-provider lifecycle | **YES** | Step 14.6 path verified; J-09 does not affect runtime contracts |
| Agent 2 — member/capability query | **YES** | `os-query` + `prisma-member-query-store` are real; verify-script ordering is separate |
| Agent 4 — Cliente 360 read-only UI | **YES** | Read APIs verified (15.1 + 16.1/16.1A); dev-auth HTTP limitation unchanged |

### Current gate adjustments

| Item | Previous | Current |
|------|----------|---------|
| F-01 | OPEN | **CLOSED** |
| Lane F work/attention projection | TESTED, gate incomplete | **VERIFIED** (Step 15.1 log) |
| Lane F overall | CONDITIONAL PASS | **CONDITIONAL PASS** (manager scope, F-02/F-03 docs, dev-auth HTTP remain) |
| E-04 suspend/open work | OPEN / gap | **CLOSED** (hold model contracted + tested) |
| J-09 | OPEN | **OPEN** (J-09A + J-09C) |

---

## RECONCILIATION — TERMINATED MEMBER AUTH / STEP 15.2 (2026-08-24 PM)

**Reviewer:** Lane J  
**Trigger:** Step 15.2 `CROSS_LANE_CHANGE_REQUEST` for terminated-member query auth vs prior Lane J “revoked blocks terminated” conclusion  
**Resolution:** **No contradiction on canonical lifecycle.** Step 15.2 postgres test uses a **non-canonical** `accessStatus: 'terminated'` value. Canonical `TerminateMember` persists `accessStatus: revoked` + `employmentStatus: terminated`, which **is blocked** by `assertMemberActive`, `os-session`, and HTTP tests.

### Finding reconciliation

| ID | Previous status | New evidence | Current status | Owner | Blocks what |
|----|-----------------|--------------|----------------|-------|-------------|
| **J-11** (terminated query auth) | OPEN — defense-in-depth | Canonical path re-verified; HTTP test denies `revoked` + `employmentStatus: terminated` (403) | **WITHDRAWN** — prior concern addressed at HTTP; postgres gap test invalid | — | — |
| **J-12** (Step 15.2 postgres test) | — (new) | `member-capability-query-prisma.integration.test.ts` sets `accessStatus: 'terminated'` — **not** a valid `accessStatus` enum value (`invited` / `active` / `suspended` / `revoked` per `handoff-manifest.yaml`, STEP_9, WORKFORCE_ORGANIZATION_LIFECYCLE) | **OPEN** (test/evidence accuracy) | Agent 2 | Misleading gate evidence — not runtime security |
| **J-13** (ActivateMember guard) | — (new) | `activateMember` has no guard rejecting `accessStatus: revoked` or `employmentStatus: terminated`; could flip member row to `active` without `RehireMember`, but auth identity stays `revoked` → HTTP session still denied | **INFO** — recommended hardening | Agent 1 | Not blocking current gates |

### Q1 — Canonical termination invariant

**`TerminateMember` persists (atomic transaction + post-commit provider effects):**

| Field | Before (typical) | After |
|-------|------------------|-------|
| `employmentStatus` | `active` | `terminated` |
| `accessStatus` | `active` | `revoked` |
| `employmentEndedAt` | null | `effectiveAt` |
| `AuthIdentity` | `active` | `revoked` (+ `revokedAt`) |
| Provider | — | credential revoke scheduled (post-commit) |
| Event | — | `member.terminated` + audit + outbox |

**Intended invariant (canonical commands):** IF `employmentStatus = terminated` THEN `accessStatus MUST = revoked` → **YES**

### Q2 — Can `employmentStatus=terminated` + `accessStatus=active` exist?

| Path | Possible? |
|------|-----------|
| `TerminateMember` | **NO** — always sets both |
| `SuspendMember` / `ActivateMember` (suspend path) | **NO** — suspend → `suspended`; activate → `active` + `active` employment |
| `RehireMember` | **NO** — creates **new** member row (`invited` / `active` employment) |
| Direct SQL / test factory | **YES** — no DB CHECK constraint on status pairs |
| Authoritative command leaving `terminated` + `active` access | **NO** |

**SECURITY_BLOCKER:** **NONE** — inconsistent pair is not produced by governed commands.

### Q3 — Defense in depth (`employmentStatus` in `assertMemberActive`)

| Classification | Rationale |
|----------------|-----------|
| **RECOMMENDED HARDENING** (not required) | Canonical path uses `accessStatus: revoked`. Extra `employmentStatus === 'terminated'` check would protect against SQL corruption and document intent. Low maintenance cost. Not required for current production safety because HTTP `os-session` also requires `accessStatus === 'active'` and `authIdentity.status === 'active'`. |

### Q4 — Activate vs Rehire

| Path | Verdict |
|------|---------|
| `suspended` → `ActivateMember` → `active` | **PASS** — contracted + tested (Step 14.5 test 8, 14.6) |
| `terminated` → `RehireMember` → new member period | **PASS** — tested (14.6 rehire test) |
| `terminated` → `ActivateMember` bypassing Rehire | **CONDITIONAL** — command lacks explicit guard (J-13); **HTTP still denied** (auth `revoked`); not a query-context bypass for canonical terminate |

### Q5 — Step 15.2 terminated test validity

**Postgres test (`terminated member can still build query context`):**

```206:209:packages/os-database/src/member-capability-query-prisma.integration.test.ts
    await prisma.osOrganizationMember.update({
      where: { id: rep.member.id },
      data: { accessStatus: 'terminated' },
    });
```

**Classification: INVALID SYNTHETIC STATE** — writes `accessStatus: 'terminated'`, which canonical lifecycle never produces. This is **not** `employmentStatus=terminated` + `accessStatus=active`. Agent 2 misclassified the finding.

**HTTP test (current source):** uses canonical pair `accessStatus: 'revoked', employmentStatus: 'terminated'` → **403** — **VALID CANONICAL LIFECYCLE TEST**.

### Q6 — Provider / session layer (Step 14.6)

| Layer | Role |
|-------|------|
| OS `accessStatus` + `assertMemberActive` | **Primary** for commands/queries |
| `os-session` (`accessStatus === 'active'` + `authIdentity.status === 'active'`) | **Primary** for HTTP |
| Provider session/credential revoke | **Secondary** — does not mask OS weakness |

**Old JWT after canonical termination:** **DENIED** — `authIdentity.status !== 'active'` (Supabase path) and `member.accessStatus !== 'active'` (both paths).

### Step 15.2 — Member directory + capability state

| Area | Verdict | Evidence |
|------|---------|----------|
| **ListMembers** | **PASS** | `people.admin` required; tenant-scoped; bounded fields; postgres + HTTP negatives |
| **GetCapabilityState** | **PASS** | Registry + optional `os_capability_states` override; `member_active` only; does not grant authorization |
| **Capability drift** | **NO** | `OS_CAPABILITY_REGISTRY` is factual read model; finance LOCKED; messaging/integrations NOT_CONFIGURED |
| **Step 15.2 gate log** | **VERIFIED** | `.step15-2-evidence/verify-20260824T133229Z.log` — 7 postgres + 8 HTTP + 2 tenant |
| **J-09 impact on 15.2** | **NOT AFFECTED** | `verify-step-15-2.sh` builds `os-query` before `os-database` |

**Step 15.2 overall:** **CONDITIONAL PASS** — queries verified; manager-hierarchy directory widening deferred; J-12 **CLOSED**.

### Contradiction resolved

| Claim | Verdict |
|-------|---------|
| Prior Lane J: `TerminateMember` → `revoked` → blocked | **CORRECT** |
| Step 15.2: terminated members can query | **MISLEADING** — postgres test used invalid `accessStatus: 'terminated'`, not canonical termination |
| Agent 2 `CROSS_LANE_CHANGE_REQUEST` to Agent 1 | **NOT REQUIRED** for canonical security |

---

## COMMERCIAL PHASE 1 OPERATIONAL READINESS — 2026-08-24

**Reviewer:** Lane J  
**Question:** How close is ISALWA OS Commercial Phase 1 to a real internal/user acceptance test?  
**Scope:** Opportunity → Quote employee path + Cliente 360 read + Workforce Admin read — not production launch.

**Reconciliation note (post-14.6B):** Prior draft listed **Live provider = PENDING**. Step 14.6B now verifies **live Supabase suspend + terminate** on pilot `efolotcrdaqdixfiqbek`. Live rehire `createInvite` remains **DEFERRED**.

**Reconciliation note (post-UI-LIVE-1):** Prior verdict **CONDITIONAL FOR UAT** cited missing live integration smoke. UI-LIVE-1 (`.ui-live-1-evidence/smoke-2026-08-24T13-56-28-695Z.log`) now verifies **dev-auth live stack** (os-web → os-api → Postgres) for Commercial employee path. **Internal UAT verdict elevated to READY** (dev-auth tier). Production readiness unchanged.

### Executive answers (five questions)

| # | Question | Answer |
|---|----------|--------|
| 1 | Architecture safe enough for internal UAT? | **YES (CONDITIONAL)** — backend postgres-verified; boundaries sound; run on documented local/staging stack (`OS_DATABASE_URL` + os-api + os-web). |
| 2 | UI functional enough for internal UAT? | **YES** — UI-LIVE-1 verified dev-auth live stack (API commands + SSR HTML); interactive Playwright not recorded |
| 3 | What blocks CreateOrder? | **G-02 client policy** + **no UI** (by design). API exists (`member_active`); Phase 1 path ends at submitted quote. |
| 4 | What blocks Commercial Approval? | **G-08** — explicit approval subject extension (`quote` / `order` / `opportunity` / `commercial_account`) + validators + tests. Foundation approval (14.4) is safe. |
| 5 | Production vs UAT gap | UAT needs running stack + one walkthrough. Production additionally needs: hosting/TLS, staging `OS_AUTH_MODE=supabase`, **live rehire invite on production tenant** (14.6B suspend/terminate verified on pilot only), monitoring/backup ops, browser E2E evidence, G-02 if orders ship. |

### Phase 1 employee flow assessment

**Path:** Login → Cliente search → Cliente 360 → Create Opportunity → edit/stage/assign → Create Quote → lines → Submit → Historial (Work/Approval read) → Orders read-only

| Step | Backend | UI | Live integration (UI-LIVE-1) |
|------|---------|-----|------------------------------|
| Login | **IMPLEMENTED** — dev + Supabase JWT | **IMPLEMENTED** | **PARTIAL** — dev session used; `/login` SSR not in smoke script |
| Cliente search | **POSTGRES VERIFIED** | UI-2 **TESTED** | **VERIFIED** — API + SSR `/clientes` |
| Cliente 360 read | **POSTGRES VERIFIED** | UI-4 **TESTED** | **VERIFIED** — API party + SSR sections |
| Opportunity write | **POSTGRES VERIFIED** | UI-5A **TESTED** | **VERIFIED** — create + timeline shows `opportunity.updated`/`stage_changed` |
| Quote write + submit | **POSTGRES VERIFIED** | UI-5A **TESTED** | **VERIFIED** — lines + submit + projection convergence |
| Historial Work/Approval | **POSTGRES VERIFIED** | UI-4B **TESTED** | **VERIFIED** — timeline API + SSR labels; no raw payload |
| Orders | **POSTGRES VERIFIED** (read) | UI-4 read-only | **VERIFIED** — SSR; CreateOrder absent |
| Workforce Admin read | **POSTGRES VERIFIED** | UI-1 **TESTED** | **VERIFIED** — API members + SSR `/administracion/equipo` |
| CreateOrder | API exists; **no UI** | **NONE** (G-02) | **VERIFIED absent** — SSR negative |

**Employee flow verdict:** **READY FOR INTERNAL UAT** — dev-auth live stack proven; human walkthrough can start on documented local stack.

### Auth / security status (layered — not collapsed)

| Layer | Suspended | Terminated | Tenant isolation | Commercial |
|-------|-----------|------------|------------------|------------|
| **IMPLEMENTED** | `assertMemberActive` + session | `revoked` + auth revoke | session org + query scoping | commands + projections |
| **POSTGRES VERIFIED** | 14.5 tests | 14.5 + workforce test + J-12 corrected | commercial/work/member tests | Step 16 + 16.1 logs |
| **HTTP VERIFIED** | 403 dev-auth | 403 dev-auth (revoked+terminated) | cross-tenant negatives | 16.1/16.1A/15.2 dev-auth |
| **SUPABASE JWT VERIFIED** | — | terminated → 401 (Step 10.3 curl) | cross-tenant 404 (10.3) | **NOT** on commercial UI path |
| **LIVE PROVIDER VERIFIED** | **PASS** suspend/terminate (14.6B) | credential delete (14.6B) | — | rehire invite **DEFERRED** |
| **LIVE BROWSER VERIFIED** | — | — | — | **PARTIAL** — UI-LIVE-1 SSR + API (dev auth); Playwright click-through **NOT** run |

**Dev-auth vs Supabase:** Backend commercial HTTP tests use `x-os-*` headers (G-07 partial). Foundation JWT path verified via Step 10.3 script — not replayed through os-web commercial UI.

### J-09 / J-12 (reconfirmed)

| ID | Status | Evidence |
|----|--------|----------|
| **J-09** | **CLOSED** | `STEP_J09_VERIFICATION_REPRODUCIBILITY_EVIDENCE.md`; cold logs `.step14-4-evidence/verify-20260824T134610Z.log`, `.step14-5-evidence/verify-20260824T134620Z.log`; `scripts/lib/verify-build.sh` |
| **J-12** | **CLOSED** | `STEP_J12_TERMINATED_MEMBER_TEST_EVIDENCE.md`; log `.step15-2-evidence/verify-20260824T134841Z.log`; no stale terminated-auth production gap |

### Commercial write safety (UI-5A)

| Check | Result |
|-------|--------|
| CreateOrder UI | **NONE** — `COMMERCIAL_COMMANDS_NOT_EXPOSED` + ui-5a tests |
| Commercial Approval UI | **NONE** |
| Inventory / Payment / Credit / Finance UI | **NONE** |
| Invented probability / territory / credit / inventory / payment / approval thresholds | **NONE** — evidence + grep |
| Submitted quote copy | Honest policy-deferral string (G-02) |

### G-02 (client decision — unchanged)

**Current API behavior:** any `member_active` may `CreateOrder` from a **submitted** quote.  
**Current UI:** **no** CreateOrder surface.  
**Blocks:** CreateOrder UI **YES**; Opportunity UI **NO**; Quote UI **NO**; read-only Orders **NO**; Opp/Quote UAT **NO**.

**Decision required (do not choose):** A) quote owner only · B) any authorized Commercial member · C) explicit scope e.g. `commercial.convert_order`

### G-08 (Commercial → Approval)

| Question | Answer |
|----------|--------|
| Approval foundation safe? | **YES** (E-01/E-02/E-03 closed, 14.4) |
| Commercial subjects enabled? | **NO** |
| Extension required per type | Add to `APPROVAL_SUBJECT_TYPES`, `validateApprovalSubject()` case, lifecycle rules, postgres tests, evidence |
| Blocks Phase-1 Opp/Quote UAT? | **NO** — approval integration is out of Phase 1 scope |

### UAT vs production

| Tier | Status |
|------|--------|
| **UAT READY (architecture)** | **PASS** |
| **UAT READY (UI integration)** | **PASS (dev-auth)** — UI-LIVE-1; Supabase commercial browser path not verified |
| **PRODUCTION READY** | **NOT READY** — see P1 |

### Blocker classification

| Tier | Items |
|------|-------|
| **P0 — blocks UAT** | **NONE** |
| **P1 — blocks production** | Supabase commercial browser/auth path not verified; interactive Playwright not recorded; live Supabase rehire invite deferred (14.6B); staging/production host + TLS + `OS_AUTH_MODE=supabase`; backup/monitoring ops not exercised; G-02 before any CreateOrder UI; G-08 before commercial approval features. |
| **P2 — safe after UAT** | Manager-scoped directory; G-01/G-03/G-04 commercial hardening; member-resolver N+1; O-05 leave-type policy (HR workflows only); ActivateMember guard (J-13 info). |

### Agent parallel safety (Phase 1)

| Agent | Verdict | Scope |
|-------|---------|-------|
| **Agent 1** | **YES (narrow)** | Business capability slices per plan. **STOP:** commercial approval subject types until G-08 designed. Rehire/invite live verification is ops config, not runtime blocker. |
| **Agent 2** | **STOP** new features | Verify-script maintenance only if needed. |
| **Agent 4** | **YES** | Internal UAT facilitation; optional UI-LIVE-2 Playwright. **STOP:** CreateOrder UI until G-02 documented. |

---

## RECONCILIATION — STEP 14.6 / 14.6B AUTH PROVIDER

**Reviewer:** Lane J (independent)  
**Date:** 2026-08-24  
**Evidence:** `STEP_14_6_AUTH_PROVIDER_LIFECYCLE_EVIDENCE.md`, `.step14-6-evidence/verify-20260824T133951Z.log`, `.step14-6b-evidence/verify-20260824T135127Z.log`  
**Code inspected:** `auth-provider.ts`, `supabase-auth-provider.ts`, `provider-side-effects.ts`, `workforce-command-service.ts`, `os-session.ts`, `auth-provider-lifecycle.integration.test.ts`, `step14-6b-live-supabase-verify.ts`

### Q1 — Implementation vs Step 9 contract

| Contract point | Implementation | Verdict |
|----------------|----------------|---------|
| Suspend: OS first, revoke sessions, AuthIdentity stays active | `suspendMember` commits `accessStatus: suspended`; post-commit `revokeSessions`; identity unchanged | **MATCH** |
| Terminate: revoke credentials + sessions; identity revoked | Transaction sets `revoked`/`terminated`; `updateAuthIdentity` → `revoked`; post-commit `revokeCredentials` (DELETE) | **MATCH** |
| Reactivate: OS only; no provider relink | `activateMember` — no provider call | **MATCH** |
| Rehire: new invite + new AuthIdentity | `rehireMember` — `createInvite` + new `invited` row; prior `revoked` preserved | **MATCH** (mock-verified) |
| Provider failure after OS commit | 3-attempt retry + `auth.provider.side_effect_failed` audit + `RetryAuthProviderSync` | **MATCH** |

**Overall contract alignment:** **PASS**

### Q2 — Does 14.6B genuinely verify live Supabase suspend + terminate?

**YES** for suspend and terminate on pilot project `efolotcrdaqdixfiqbek`:

| Test | Live evidence | Independent check |
|------|---------------|-------------------|
| Suspend | OS `suspended`; identity `active`; provider user **PRESENT**; old JWT → **403** | Log lines 9–16; script asserts provider GET 200 + HTTP denial |
| Terminate | OS `revoked`/`terminated`; identity `revoked`; provider user **MISSING**; old JWT → **401** | Log lines 24–32; 1.5s wait + GET 404 + HTTP denial |
| Reactivate | OS `active`; old JWT → **200** (documented) | Log lines 17–23 |

Script uses real Supabase Admin API, real JWT via `signInWithPassword`, real os-api `OS_AUTH_MODE=supabase`. Not mock substitution.

### Evidence tiers (kept separate)

| Tier | Status | What it proves |
|------|--------|----------------|
| **DOMAIN / POSTGRES** | **PASS** | 8/8 `auth-provider-lifecycle.integration.test.ts` + Step 14.5 regression |
| **MOCK PROVIDER** | **PASS** | Local port session/credential tracking; failure + retry paths |
| **HTTP OS SESSION** | **PASS** | `os-session.ts` denies non-active members; 14.6B HTTP checks on `/v1/capabilities` |
| **LIVE SUPABASE TEST PROJECT** | **CONDITIONAL PASS** | Suspend + terminate **PASS**; rehire invite **DEFERRED** |

### Suspend review — **PASS**

1. OS commits first (`runInTransaction` before `runScheduledProviderEffects`) ✓  
2. `accessStatus` → `suspended` ✓  
3. `AuthIdentity` remains `active` ✓  
4. Provider = global logout (`POST .../logout` scope `global`), not delete ✓  
5. Provider failure cannot restore OS authority (OS committed; audit on failure) ✓  
6. `RetryAuthProviderSync` replays `revokeSessions` for suspended ✓  

Live: provider user survived; old JWT denied **403** (OS membership gate primary).

### Terminate review — **PASS**

Canonical transaction verified in code + postgres tests:

- `employmentStatus: terminated`, `accessStatus: revoked`, `employmentEndedAt`  
- `AuthIdentity.status: revoked`, `revokedAt`  
- `member.terminated` event + audit + outbox  
- Provider targets linked `providerSubject` from active identity before revoke  

Live: provider user **MISSING** after DELETE; old JWT **401**.

### Old JWT after reactivation — **EXPECTED**

Architecture (Step 14.6 evidence § Reactivate): no provider relink; user re-authenticates on next login; `ActivateMember` restores OS access only.

- Supabase global logout revokes refresh/session state; **already-issued access JWTs remain cryptographically valid until TTL expiry** (standard JWT behavior).  
- `sessionFromSupabaseJwt` intentionally authorizes on: valid JWT + `AuthIdentity.status === 'active'` + `member.accessStatus === 'active'`.  
- Reactivation preserves same provider subject (by design).  
- When OS gate reopens, a still-valid pre-suspend token works again.  
- Architecture does **not** require forced fresh authentication before reactivation resumes access — it documents re-auth as the normal user path, not a hard gate.

**Not a security defect:** access was correctly denied during suspension (403). Reuse after reactivate is bounded by JWT TTL and is consistent with stateless JWT + OS gate model.

**Optional hardening (P2):** post-reactivate session revoke or mandatory re-login policy — not contracted today.

### Rehire / createInvite failure — **DEFERRED**

Live Test D caught `PROVIDER_INVITE_FAILED` from `SupabaseAuthProviderPort.createInvite` (`!res.ok` → generic error).

**What evidence shows:** invite failed; adapter request shape is standard `POST /auth/v1/invite` with email (same pattern as working admin create/delete/logout). **HTTP status not logged** — cannot diagnose further from artifact without exposing secrets.

**Classification:** **ENVIRONMENT_CONFIG** (pilot project invite/SMTP/email delivery likely unconfigured). Admin user create/delete worked on same project → **not** an adapter-shape defect. Mock/postgres rehire contract tests pass.

**Does not block:** suspend, terminate, activate, role/dept/manager/delegation mutations.

### Rehire contract (independent)

| Path | Behavior | Verified |
|------|----------|----------|
| `TerminateMember` | `revoked` identity + provider delete | postgres + live |
| `ActivateMember` | Reactivates **suspended** → `active`; links `invited` identity if present | postgres + live (suspend path) |
| `RehireMember` | Same Person; **new** member row + **new** `invited` AuthIdentity; `createInvite` | postgres mock; live invite deferred |
| Terminated identity silently reactivated? | **NO** — `activateMember` only updates `invited` identity; revoked stays revoked | postgres test |

**J-13:** `ActivateMember` on `revoked`/`terminated` member lacks explicit guard but **cannot restore JWT access** (auth stays `revoked`). Creates inconsistent member row if mis-invoked. **OPTIONAL** hardening — not required for 14.6 gate.

### RetryAuthProviderSync — **PASS**

- `people.admin` gated via `COMMAND_REQUIRED_SCOPES`  
- Tenant-safe (`getMemberInOrg`)  
- `providerSubject` from authoritative `findAuthIdentityForProviderSync`, not client payload  
- Suspended → `revokeSessions`; revoked → `revokeCredentials`  
- Secrets not logged in audit (`providerSubject` only)  
- Idempotent enough for operator retry (provider 404 tolerated on delete/logout)

### Secret hygiene — **PASS**

`.step14-6b-evidence/verify-20260824T135127Z.log` scanned: JWT fingerprints only (16-char sha256 prefix), truncated provider subject IDs, no service-role key, no full JWT, no passwords, no Bearer headers.

### Synthetic test cleanup — **PASS**

- Non-production project `efolotcrdaqdixfiqbek` (script enforces ref)  
- Synthetic `isalwa-auth-test+*@isalwa.demo` only  
- User A deleted in cleanup; User B removed by terminate path  
- No pre-existing employee accounts altered  

### Workforce Admin mutation backend readiness

| Action | Classification | Notes |
|--------|----------------|-------|
| ChangeDepartment | **READY FOR UI** | No provider dependency |
| ChangeRole | **READY FOR UI** | No provider dependency |
| ChangeManager | **READY FOR UI** | No provider dependency |
| SuspendMember | **READY FOR UI** | Live verified |
| ActivateMember (from suspended) | **READY FOR UI** | Live verified; old-JWT-on-reactivate documented |
| TerminateMember | **READY FOR UI** | Live verified |
| GrantDelegation / RevokeDelegation | **READY FOR UI** | Postgres verified |
| RequestMemberEmailChange | **READY FOR UI** | OS-only request event |
| InviteMember | **CONDITIONAL** | Same `createInvite` as rehire — live pilot invite failed |
| RehireMember | **CONDITIONAL** | OS contract mock-verified; live provider invite deferred |
| ChangeMemberEmail | **CONDITIONAL** | Provider `updateEmail` not live-verified |

**Backend overall:** **CONDITIONAL** — lifecycle core ready; invite/email provider paths need pilot config or dev-provider UAT.

### Step 14.6 overall gate (independent)

**CONDITIONAL PASS** (elevated from mock-only). Suspend/terminate live tiers close Step 14.5 auth-provider gap. Overall remains conditional until live rehire invite verified or explicitly accepted as ops deferral.

### Production vs internal UAT auth

| Tier | Status |
|------|--------|
| Internal UAT (dev stack + pilot Supabase) | **CONDITIONAL** — suspend/terminate trustworthy; invite/rehire use dev provider or fix pilot SMTP |
| Production auth | **NOT READY** — production Supabase project config, TLS, monitoring, full invite path not verified on production tenant |

---

## RECONCILIATION — STEP 14.6B LIVE SUPABASE AUTH

**Reviewer:** Lane J (independent reconciliation into Commercial Phase 1)  
**Date:** 2026-08-24  
**Evidence:** `STEP_14_6_AUTH_PROVIDER_LIFECYCLE_EVIDENCE.md`, `.step14-6b-evidence/verify-20260824T135127Z.log`  
**Runtime code changed during 14.6B:** **NO**

### Mission answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Live Supabase suspend genuinely verified? | **YES** — real Admin API global logout; OS `suspended`; identity `active`; provider user present; old JWT → **403** |
| 2 | Live Supabase terminate genuinely verified? | **YES** — provider user deleted; OS `revoked`/`terminated`; identity `revoked`; old JWT → **401** |
| 3 | Old JWT after reactivate acceptable? | **YES — EXPECTED** under current architecture (see below) |
| 4 | Why did live rehire `createInvite` fail? | **ENVIRONMENT_CONFIG** — pilot invite/SMTP likely unconfigured; adapter shape standard; HTTP status not logged |
| 5 | Does rehire failure block Commercial UAT? | **NO** — Commercial Phase 1 path does not use rehire |
| 5b | Block Workforce Admin reads? | **NO** |
| 5c | Block unrelated admin mutations? | **NO** — only `InviteMember` / `RehireMember` share `createInvite` |
| 5d | Block production? | **PARTIALLY** — HR onboarding/rehire invite path still unverified live; unrelated to Commercial Phase 1 |
| 6 | Commercial Phase 1 report needs update? | **YES** — live provider was **PENDING**; now **PASS** (suspend/terminate) + **DEFERRED** (rehire invite) |

### Evidence tiers (not conflated)

| Tier | Status | Commercial Phase 1 relevance |
|------|--------|------------------------------|
| POSTGRES / DOMAIN | **PASS** | Commercial commands + projections |
| MOCK PROVIDER | **PASS** | Workforce lifecycle contract |
| HTTP OS SESSION | **PASS** | os-api auth gates (dev + JWT foundation) |
| **LIVE SUPABASE TEST PROJECT** | **CONDITIONAL PASS** | Suspend/terminate **PASS** on pilot; rehire invite **DEFERRED** |
| **LIVE BROWSER COMMERCIAL** | **NOT VERIFIED** | Unchanged — separate from provider tier |

### Commercial Phase 1 live-provider correction

| Prior statement | Corrected status |
|-----------------|------------------|
| Live provider = **PENDING** | **SUPERSEDED** |
| Current | **PASS** — live Supabase suspend + terminate on pilot `efolotcrdaqdixfiqbek` (14.6B) |
| Remaining | **DEFERRED** — live rehire `createInvite` (`PROVIDER_INVITE_FAILED`) |
| Unchanged | **NOT VERIFIED** — live browser Commercial smoke (UI-0 through UI-5A) |

### UAT / production impact

| Gate | Changed? | Verdict |
|------|----------|---------|
| **Commercial UAT readiness** | **NO** (verdict unchanged) | Still **CONDITIONAL FOR UAT** — browser integration smoke still the gap; Commercial path does not depend on rehire |
| **Production readiness** | **YES** (narrower blocker list) | Still **NOT READY** — suspend/terminate live on pilot ≠ production tenant; rehire invite deferred; browser E2E; hosting/TLS/monitoring remain |

### Rehire failure — what blocks what

| Surface | Blocked by rehire invite failure? |
|---------|----------------------------------|
| Commercial Opp/Quote UAT | **NO** |
| Cliente 360 / Historial read | **NO** |
| Workforce Admin read (UI-1) | **NO** |
| Suspend / Terminate / Activate / role / dept / manager / delegation mutations | **NO** |
| InviteMember UI (live Supabase mode) | **YES** — same `createInvite` endpoint |
| RehireMember UI (live Supabase mode) | **YES** |
| ChangeMemberEmail (provider sync) | **SEPARATE** — `updateEmail` not live-verified |

### J-13 (ActivateMember on terminated/revoked)

`ActivateMember` lacks explicit guard on `revoked`/`terminated` member rows. **Cannot restore JWT access** — `activateMember` only promotes `invited` AuthIdentity; revoked identity stays revoked. Mis-invocation could create inconsistent member row only.

**Classification:** **CLOSED** (Step 14.7) — was OPTIONAL pre-14.7; `activateMember` now rejects `revoked`/`terminated` at domain + HTTP.

---

## RECONCILIATION — UI-LIVE-1 COMMERCIAL UAT

**Reviewer:** Lane J (independent)  
**Date:** 2026-08-24  
**Evidence:** `UI_LIVE_1_COMMERCIAL_UAT_SMOKE_EVIDENCE.md`, `scripts/ui-live-1-smoke.mjs`, `.ui-live-1-evidence/smoke-2026-08-24T13-56-28-695Z.log`, `latest-results.json`

### Mission answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Closes prior “no live integration evidence” gap? | **YES** — real HTTP through os-web + os-api + Postgres; not isolated unit helpers |
| 2 | Opp→Quote path operationally UAT-ready? | **YES** — for internal UAT on dev-auth local stack |
| 3 | Unverified because auth = DEV? | Supabase JWT through os-web commercial pages; production `OS_AUTH_MODE=supabase` browser path; auth denial edge cases in real browser |
| 4 | Unverified because SSR not Playwright? | Form submit via UI components, client hydration, click navigation, validation toasts, error UX on failed commands |
| 5 | UI-LIVE-2 required for UAT? | **NO** — desirable stronger evidence, not a gate |
| 6 | New issue blocks internal UAT? | **NONE** |

### Live stack verification (independent)

Script `ui-live-1-smoke.mjs` exercises:

| Check | Method | Verified |
|-------|--------|----------|
| os-api health | `GET /v1/health` | ✓ |
| os-web up | `GET :3200` | ✓ |
| Real commands | `POST /v1/commands/*` with idempotency keys + `x-os-*` headers | ✓ |
| Real reads | `GET /parties`, `/quotes`, `/members`, `/parties/{id}/timeline` | ✓ |
| os-web SSR | `GET` pages with `os_dev_session` cookie | ✓ |
| Projection convergence | 10s wait → `GET /quotes/{id}` status `submitted` | ✓ |

**Classification:** **LIVE INTEGRATION VERIFIED** (dev-auth tier)

**Not isolated test helpers:** commands hit running os-api; SSR hits running Next.js os-web; data persists in Postgres (Step17 seed).

### Flow evidence (log + results.json)

| Flow | Status | Evidence |
|------|--------|----------|
| Clientes search | **PASS** | API `GET /parties` + SSR `/clientes` |
| Cliente 360 | **PASS** | API party detail + SSR Historial/Oportunidades/Cotizaciones/Pedidos needles |
| Opportunity create | **PASS** | `CreateOpportunity` command |
| Opportunity edit/stage/owner | **PASS (timeline)** | Timeline shows `opportunity.updated`, `opportunity.stage_changed`; commands not listed in `latest-results.json` (minor artifact gap) |
| Quote create + lines + submit | **PASS** | Full command chain in results.json |
| Historial | **PASS** | 13 event types incl. commercial + work + approval; no raw payload/contextSnapshot |
| Workforce Admin read | **PASS** | `GET /members` + SSR `/administracion/equipo` |
| CreateOrder | **ABSENT** | SSR negative |
| Commercial Approval | **ABSENT** | SSR negative |
| Finance locked | **NOT IN SCRIPT** | Claimed in evidence doc but `/finanzas` not fetched by smoke script — **unverified this run** |
| Messaging not configured | **NOT IN SCRIPT** | Claimed in evidence doc — **unverified this run** |
| Login dev entry | **NOT IN SCRIPT** | Dev session injected; `/login` SSR not checked |

### Auth tier (not upgraded)

| Tier | Status |
|------|--------|
| DEV live integration (Commercial behavior) | **VERIFIED** — UI-LIVE-1 |
| Supabase commercial E2E | **NOT VERIFIED** |
| Production auth | **NOT VERIFIED** |

DEV-auth live integration is **sufficient for internal Commercial UAT** of business behavior. It is **not** sufficient for production security sign-off.

### SSR vs Playwright

**Verdict:** Internal UAT can start **now** on documented stack (`Postgres + os-api OS_AUTH_MODE=dev + os-web NEXT_PUBLIC_OS_AUTH_MODE=dev`). Playwright is **recommended** evidence, not a UAT gate.

Humans exercise forms, navigation, and error UX that SSR smoke cannot fully substitute.

### Projection convergence (~10s)

Outbox worker ~5s poll; quote read model `submitted` after 10s wait.

**Classification:** **ACCEPTABLE FOR UAT** — eventual consistency with honest wait; not a blocker. Note for UAT testers: allow ~10s after submit before expecting read-model refresh.

### Outbox startup warning

Agent 4 reported non-blocking outbox tick error on stale local rows at os-api startup. Not in UI-LIVE-1 log; smoke completed successfully.

**Classification:** **LOCAL TEST HYGIENE** — pre-existing stale outbox rows after DB reset; did not affect smoke correctness. **Not a UAT blocker.**

### G-02 / G-08 (unchanged)

Do **not** block Opportunity + Quote internal UAT. CreateOrder UI still blocked by G-02 policy. Commercial Approval still blocked by G-08 design.

### Commercial Phase 1 verdict update

| Prior | Current |
|-------|---------|
| **CONDITIONAL FOR UAT** (no live integration) | **READY FOR INTERNAL UAT** (dev-auth live stack proven) |
| Production | **NOT READY** (unchanged) |

---

## RECONCILIATION — STEP 14.7 WORKFORCE ADMIN MUTATIONS

**Reviewer:** Lane J (independent)  
**Date:** 2026-08-24  
**Evidence:** `STEP_14_7_WORKFORCE_ADMIN_MUTATION_API_READINESS_EVIDENCE.md`, `.step14-7-evidence/verify-20260824T140655Z.log`  
**Code inspected:** `workforce-command-service.ts`, `commands.controller.ts`, `workforce-admin-mutation-api.integration.test.ts`, `workforce-admin-mutation-http.test.ts`, `workforce-lifecycle.test.ts`  
**Verify log:** Agent 1 log **PASS** (12 unit + 15 postgres + 19 regression + 19 HTTP). Lane J cold re-run blocked by sandbox; independent review from code + captured log.

### Mission verdict

Agent 4 **may** extend UI-1 Workforce Admin read surfaces with mutation actions for the **UI-safe command set only**. Invite/Rehire/ChangeMemberEmail remain blocked.

### J-13 — **CLOSED**

`activateMember` now enforces (domain + HTTP verified):

| Path | Allowed |
|------|---------|
| `invited` → `active` | Self (first login) or admin |
| `suspended` → `active` | **Admin only** (`people.admin` via `InviteMember` authorize path) |
| `revoked` / `employmentStatus: terminated` | **REJECTED** → `VALIDATION_FAILED` (must use `RehireMember`) |
| `active` | **REJECTED** |
| Self-reactivation from `suspended` | **REJECTED** |

Guard reads authoritative member row from `getMemberInOrg` — **not bypassable** via HTTP payload alone.

### HTTP error mapping — **PASS**

`commands.controller.ts` `mapError`:

| Code | HTTP |
|------|------|
| `AUTH_REQUIRED` / `PROVIDER_NOT_CONFIGURED` | 401 |
| `PERMISSION_DENIED` / `TENANT_FORBIDDEN` / `ACCESS_REVOKED` | 403 |
| `NOT_FOUND` | 404 |
| `VALIDATION_FAILED` / `CONFLICT` | 400 |

**Fix verified:** `ACCESS_REVOKED` → **403** (was 500). HTTP test: suspended actor on `RequestMemberEmailChange` → 403 + `ACCESS_REVOKED`. Terminate with open work → 400 `VALIDATION_FAILED` (not remapped to 403). UI can rely on these codes.

### Per-command classification

| Command | UI classification | Notes |
|---------|-------------------|-------|
| ChangeDepartment | **READY** | `people.admin`; postgres + tenant negative |
| ChangeRole | **READY** | HTTP verified |
| ChangeManager | **READY** | Postgres + cross-tenant manager negative |
| SuspendMember | **READY** | HTTP + 14.6B live provider tier |
| ActivateMember | **READY** | Admin reactivation from `suspended`; J-13 closed; invited→active is onboarding path |
| TerminateMember | **READY** | Open-work block → `VALIDATION_FAILED`; provider revoke post-commit |
| GrantDelegation | **READY** | HTTP verified |
| RevokeDelegation | **READY** | HTTP verified |
| RequestMemberEmailChange | **READY** | Self-only `member_active`; event only — **no** provider mutation |
| RetryAuthProviderSync | **ADMIN-RECOVERY-ONLY** | `people.admin`; ops recovery after provider side-effect failure — not general HR UI |
| InviteMember | **BLOCKED** | Pilot `createInvite` env config (14.6B) |
| RehireMember | **BLOCKED** | Same `createInvite` dependency |
| ChangeMemberEmail | **BLOCKED** | Provider `updateEmail` not live-verified |

### Terminate UX contract — **safe for UI**

- `listOpenWorkItemsForMember` → non-empty → `VALIDATION_FAILED` (400)  
- **No** silent work reassignment or deletion  
- Provider credential revoke remains post-commit + `RetryAuthProviderSync` recovery  
- UI may show: *work must be reassigned first* — matches `WORKFORCE_ORGANIZATION_LIFECYCLE.md` mandatory open-work policy; no invented policy

### RequestMemberEmailChange boundary — **confirmed**

- Emits `member.email.change_requested` only  
- Does **not** call provider or mutate `AuthIdentity.email`  
- `ChangeMemberEmail` (admin completion + provider `updateEmail`) remains **BLOCKED** for UI  
- Admin UI may expose **request** flow for self-service only; not admin-on-behalf email completion

### Provider-dependent blocks (unchanged)

Rehire invite failure does **not** block unrelated mutations (dept/role/manager/suspend/terminate/delegation).

### G-08 / apps/os-web

**G-08 untouched.** **No** `apps/os-web` changes in Step 14.7.

### Agent 4 permitted UI scope

Wire mutation actions for: **ChangeDepartment, ChangeRole, ChangeManager, SuspendMember, ActivateMember (admin reactivate suspended), TerminateMember, GrantDelegation, RevokeDelegation, RequestMemberEmailChange** (self).

Do **not** expose: InviteMember, RehireMember, ChangeMemberEmail. Optional hidden ops: RetryAuthProviderSync (admin recovery only).

---

## G-02 DECISION BRIEF REVIEW

**Reviewer:** Lane J (independent)  
**Date:** 2026-08-24  
**Brief:** `G02_CREATEORDER_AUTHORIZATION_DECISION_BRIEF.md`  
**Code inspected:** `commercial-command-service.ts`, `commercial-auth.ts`, `scopes.ts`, `commercial-commands.ts`  
**G-02 status:** **DECISION PENDING** (unchanged — no policy chosen)

### Brief quality

**PASS with one wording correction.** Brief is accurate, complete, and safe for ISALWA leadership. Preconditions, CancelOrder comparison, read/write asymmetry, and feasibility of A/B/C are correctly described. No implementation recommended.

### Verified current CreateOrder rule

| Check | Actual behavior |
|-------|-----------------|
| Scope contract | `COMMAND_REQUIRED_SCOPES.CreateOrder` = `member_active` |
| Runtime authorize | Tenant match + `assertMemberActive` only — **no** scope beyond active membership |
| Owner gate | **None** — `assertCanEditQuote()` **not** called |
| Admin override on command | **None** (unlike `CancelOrder`) |
| Payload | `{ quoteId }` only — cannot forge owner via body |
| Quote status | Must be `submitted` |
| Duplicate | `getOrderForQuote` → `CONFLICT` if order exists |
| Lines | Empty → `VALIDATION_FAILED` |
| Order `ownerMemberId` | Copied from quote |
| Audit/event actor | `ctx.actorMemberId` on `order.created` |
| Quote after success | `accepted` |

**Effective rule:** any **active organization member** in the same tenant may `CreateOrder` on any submitted quote if they know `quoteId`.

### Option feasibility (independent)

| Option | Technically sound | Notes |
|--------|-------------------|-------|
| **A — Quote owner + `people.admin`** | **YES** | `assertCanEditQuote()` already exists; used on SubmitQuote/CancelQuote; mirrors CancelOrder pattern |
| **B — Broad (current API)** | **YES** as documented behavior | **Not** a Commercial-role boundary — see wording correction |
| **C — Explicit scope** | **YES** | Requires new scope key in contracts + `COMMAND_REQUIRED_SCOPES` + role/delegation grants + UI capability check — architecture exists (delegation, `memberHasScope`) |

### Wording correction for leadership

**Option B title should not say “authorized Commercial member.”** Today there is **no** Commercial-specific authorization on `CreateOrder`. Rule is **any active org member** (`member_active`) — including non-sales roles with active membership. Brief body states this correctly; **title/summary should be corrected** before leadership review.

### Read/write asymmetry — **POLICY RISK** (not security defect)

| Layer | Rule |
|-------|------|
| **Read** (`getQuote`, lists) | Owner or `people.admin` (`canViewCommercialRecord`) |
| **Write** (`CreateOrder`) | Any active member with `quoteId` |

A non-owner active member **cannot** discover another member's quote in normal UI/lists but **can** convert via direct API if they obtain the UUID. Same tenant; authenticated; not cross-tenant leakage.

| Option | Asymmetry outcome |
|--------|-------------------|
| A | Aligns write with read/edit pattern |
| B | Preserves asymmetry (intentional if chosen) |
| C | Scoped members may convert quotes they cannot read unless combined with owner check |

### Fourth option needed?

**NO.** Variants are covered:

- Owner + `people.admin` = **Option A**
- Explicit role/scope = **Option C**
- Manager/team conversion would require **manager hierarchy on commercial commands** — not implemented; would be new architecture beyond A/B/C, not a missing fourth business model in the brief

### G-08 compatibility — **PASS with CONCERN (Option B only)**

None of A/B/C **requires** G-08. Future approval can layer as additional gate on `CreateOrder` or `SubmitQuote`. **Option B** creates the highest risk of **organizational bypass** if G-08 is implemented only in UI without command-level enforcement. Options A and C compose more cleanly.

### Reassign quote ownership

**No** `AssignQuoteOwner` command. Quote `ownerMemberId` set at `CreateQuote` (default actor or payload). `UpdateQuote` does not change owner. Back-office under Option A needs `people.admin` or new ownership command (out of G-02 scope).

### Leadership decision (plain language)

See Carmen handoff below. **Purely business policy** — engineering can implement any chosen option.

---

## RECONCILIATION — UI-LIVE-3 WORKFORCE ADMIN

**Reviewer:** Lane J (independent)  
**Date:** 2026-08-27  
**Evidence:** `UI_LIVE_3_WORKFORCE_ADMIN_MUTATION_EVIDENCE.md`, `scripts/ui-live-3-playwright.mjs`, `.ui-live-3-evidence/results-2026-08-24T14-38-52-500Z.json`, screenshots `2026-08-24T14-38-52-500Z-*.png`  
**Auth tier:** **DEV** (`os_dev_session` cookie)

### Mission verdict

**CONDITIONAL INTERNAL UAT READY** for Workforce Admin mutation surfaces on the documented **DEV** stack.

Does **not** upgrade to Supabase/production auth readiness. Human internal UAT may proceed on the verified UI-safe command set.

### Evidence authenticity (independent)

| Check | Result |
|-------|--------|
| Browser-driven interaction | **YES** — Playwright Chrome; form fills/clicks; success/status waiters; screenshots show UI-LIVE-3 Playwright session |
| Path | **os-web server actions** (`lib/workforce/actions.ts` → `createOsApiClient` → `POST /v1/commands/*`) → **os-api** → **Postgres** |
| Fake/sample UI | **NO** — real member detail forms; directory reflects “General” after ChangeDepartment |
| Setup-only API | Open-work item created via API `CreateWorkItem` / completed via `CompleteWork` — **setup only**; terminate attempt is browser UI |
| DEV auth honest | **YES** — results + evidence state `authMode: DEV`; Supabase/production **NOT VERIFIED** |

### PASS / FAIL by action

| Action | Result | Evidence |
|--------|--------|----------|
| Team directory | **PASS** | Screenshot + results |
| ChangeDepartment | **PASS** | Valid Step17 dept; directory shows General |
| ChangeRole | **PASS** | results.json |
| ChangeManager | **PASS** | results.json |
| SuspendMember | **PASS** | Screenshot: Reactivar offered; terminate copy distinct |
| ActivateMember (reactivate) | **PASS** | Status → Activo; no Rehire |
| GrantDelegation + RevokeDelegation | **PASS** | Grant ID + revoke by ID |
| Terminate open-work block | **PASS** | Screenshot: Spanish alert + “Ver trabajo abierto”; no silent reassign |
| Terminate (no open work) | **PASS** | Acceso revocado; Reactivar/Rehire absent |
| RequestMemberEmailChange | **NOT VERIFIED** | Explicitly `NOT RUN` — not silently PASS |
| Invite / Rehire / ChangeMemberEmail / RetryAuthProviderSync | **ABSENT** | Browser body scan on admin detail |

### Lifecycle / open-work

Suspend → Reactivate semantics correct (not terminate/rehire). Terminate blocked while open work remains; work completed via API then terminate succeeds. **No** silent work deletion/reassignment in UI path.

### Invalid departmentId → HTTP 500

`changeDepartment` inserts assignment without existence check; unknown FK → unhandled 500 instead of `VALIDATION_FAILED` → 400.

| Classification | **P2 HARDENING DEFECT** |
|----------------|-------------------------|
| Blocks normal internal UAT? | **NO** — valid seeded department path PASS |
| Production | Fix before production for honest error contract (Agent 1) |
| Note | `latest-results.json` `backendBugs: []` omits this — recorded in evidence doc only |

### Auth / production limits (unchanged)

- Supabase browser auth: **NOT VERIFIED**
- Production auth: **NOT VERIFIED**
- Next DEV mutation re-run: Step17 **reseed** required (María terminated)

### New security blockers

**NONE**

### Classification

| Gate | Verdict |
|------|---------|
| Workforce Admin internal UAT (DEV) | **CONDITIONAL READY** |
| Production Workforce Admin | **NOT READY** |

STOP.
