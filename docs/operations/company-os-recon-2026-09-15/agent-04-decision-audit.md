# Agent 04 — Decision Memory vs Approval / Coordination / BusinessEvent / Audit

**Lane:** AGENT 4 ONLY · read-only recon · no implementation  
**Repo:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Date:** 2026-09-15  
**States used:** `LIVE` | `LIVE BUT PARTIAL` | `BACKEND ONLY` | `PLANNED` | `MISSING` | `INTENTIONALLY DEFERRED` | `NO LONGER NEEDED`

---

## Verdict

There is **no unified “Decision Memory” product surface**. Decision-like truth is split across Approval, Coordination Decision, Operational Release Decision, BusinessEvent, AuditLog, and domain-specific append-only correction rows. Several lanes preserve prior state; several overwrite current rows and rely on audit/event payloads for before-images. **Audit Viewer UI is MISSING.** Party Historial is a **party-scoped** cross-record timeline (commercial + work + approval), not a universal cross-entity audit browser. **APPROVE ≠ CONVERT** is enforced and guided; PAY/SHIP are separate capabilities and are not side-effects of Approve.

---

## 1. Decision Memory vs primitives

| Surface | What it is | State | Evidence |
|---|---|---|---|
| **Decision Memory (unified product)** | Single memory of who decided what/why/before across the OS | **MISSING** | No module, route, query service, or doc named Decision Memory under `docs/` or `apps/os-web` |
| **Approval** | Governed yes/no on a subject; stores reason + decision actor | **LIVE** | Schema `OsApprovalRequest` — `packages/os-database/prisma/schema.prisma`; command `Approve`/`Reject` — `packages/os-work/src/work-command-service.ts`; UI `/aprobaciones` — `apps/os-web/app/(app)/aprobaciones/page.tsx`, `apps/os-web/components/work/approval-list.tsx`; API `apps/os-api/src/approvals.controller.ts` |
| **Coordination Decision** | Append-only recorded/resolved operating decisions; not meeting minutes | **LIVE BUT PARTIAL** | Contract + append-only ledger — `packages/os-contracts/src/coordination-decision.ts` (“Resolution is a new row. Previous rows stay”); UI `/coordinacion` — `apps/os-web/app/(app)/coordinacion/page.tsx`, `apps/os-web/components/coordination/coordination-panel.tsx`; Prisma fragment + port — `packages/os-database/prisma/fragments/coordination-decision.prisma`, `packages/os-coordination-read/src/prisma-decision-writer.ts` (`COORDINATION_DECISION_MIGRATION_APPLIED = false`, live write marked `prisma_port` / contract `UNPROVEN`). **Does not** write `OsBusinessEvent` / `OsAuditLog` in coordination-read |
| **BusinessEvent** | Append-only domain event stream (command provenance, projections) | **LIVE** | `OsBusinessEvent` — `packages/os-database/prisma/schema.prisma`; writers via `appendEventAndAudit` in `packages/os-database/src/prisma-{work,party,commercial,workforce}-store.ts`; builders — `packages/os-events/src/append.ts` |
| **Audit** | Per-command before/after resource snapshot tied to correlation | **BACKEND ONLY** (writes **LIVE**; operator UI **MISSING**) | `OsAuditLog` (`beforeJson`/`afterJson`) — schema above; `buildAuditEntry` — `packages/os-events/src/append.ts` — **no `reason`/`why` column**; no `/auditoria` UI under `apps/os-web` |
| **Operational Release Decision** | Append-only release / correction / reversal for pedido cases | **LIVE BUT PARTIAL** | Contract — `packages/os-contracts/src/operational-case.ts` (`correctsDecisionId`, reverse keeps prior); schema release rows with correction FKs in `packages/os-database/prisma/schema.prisma` / `fragments/operational-case.prisma` |

**Separation (do not collapse):**

- **Approval** = authority gate on a subject; emits `approval.approved` / `approval.rejected` + audit before `{status}` → after `{status, decisionByMemberId}` (`work-command-service.ts` `decideApproval`).
- **Coordination** = operating decision ledger; explicitly does **not** grant production/finance/warehouse authority (`coordination-decision.ts` `FORBIDDEN_MUTATION_KEYS`, tests in `coordination-decision.test.ts`).
- **BusinessEvent** = projection/outbox truth; **Audit** = resource mutation snapshot. Same transaction via `appendEventAndAudit`, different tables/jobs.
- **Decision Memory** as a single read model over all of the above: **MISSING**.

---

## 2. Governed Correction / Override — PREVIOUS STATE PRESERVED?

Invariant asked: *wrong responsible, contact, phone, location, manual fact, relationship, role, manager, decision metadata, status, duplicate linkage, ownership — previous state preserved?*

| Correction target | Mechanism | Previous state preserved? | State | Paths |
|---|---|---|---|---|
| **Wrong responsible (commercial owner)** | `ReassignCommercialAccountOwner` overwrites account row; event + audit carry previous/current owner | **Partial** — current row replaced; prior owner in event payload + `beforeJson` | **LIVE** | `packages/os-commercial/src/commercial-command-service.ts` (`commercial_account.owner_reassigned`); guidance `REASSIGN_OWNER_CONSEQUENCE` — `apps/os-web/lib/guidance/catalog.ts` |
| **Wrong opportunity owner** | `AssignOpportunityOwner` overwrites; payload includes `previousOwnerMemberId` | **Partial** (payload, not history table) | **LIVE** | same commercial command service |
| **Work ownership** | `ReassignWork` + `OsWorkItemOwnershipHistory` append | **Yes** (dedicated history rows) | **LIVE** | `packages/os-database/prisma/schema.prisma` `OsWorkItemOwnershipHistory`; `packages/os-work/src/work-command-service.ts` |
| **Contact / phone** | `UpdateContact` updates contact row in place; emit **without** before/after audit args | **Weak** — after-image in event payload only; no contact version history table; audit before often empty | **LIVE BUT PARTIAL** | `packages/os-party/src/party-command-service.ts` `updateContact` |
| **Location** | `UpdateLocation` updates row; emit **with** before/after | **Partial** — before in audit/event; row overwritten (not append-only location history) | **LIVE** | `packages/os-party/src/location-command-service.ts` |
| **Manual fact** | `OsReportedOperationalFact` reverse / `correctsFactId`; confirmation stays pending | **Yes** (append / reverse; does not mutate party/quote/order/location) | **LIVE BUT PARTIAL** (contract + schema; confirmation never completed here) | `packages/os-contracts/src/reported-operational-fact.ts`; schema `OsReportedOperationalFact` |
| **Relationship (party role)** | `AssignPartyRole` / `EndPartyRole` — end prior, insert new; rows kept with `endedAt` | **Yes** | **LIVE** | `party-command-service.ts`; role assignment model in schema |
| **Role (workforce)** | `ChangeRole` ends active assignments, inserts new; prior rows retained with `endedAt` | **Yes** | **LIVE** | `packages/os-workforce/src/workforce-command-service.ts` `changeRole` |
| **Manager** | `ChangeManager` ends active manager assignments, inserts new | **Yes** | **LIVE** | same file `changeManager` |
| **Decision metadata (coordination)** | Resolve = **new row** with `resolvesDecisionId`; prior decision unchanged | **Yes** | **LIVE BUT PARTIAL** (hosted write UNPROVEN) | `coordination-decision.ts`; fragment `coordination-decision.prisma` (“Do not UPDATE a prior decision”) |
| **Decision metadata (approval)** | Pending → approved/rejected on **same** request row; before status in audit | **Partial** — request row mutated; reason on row; no separate decision version table | **LIVE** | `OsApprovalRequest.decisionReason` / `decidedAt`; `decideApproval` |
| **Operational release decision** | New correction row via `correctsDecisionId` / reverse append | **Yes** | **LIVE BUT PARTIAL** | `packages/os-contracts/src/operational-case.ts` |
| **Status (party)** | `DeactivateParty` / `ReactivateParty` / merge status overwrite versioned party | **Partial** — event emitted; no party status history table | **LIVE** | `party-command-service.ts` |
| **Status (work)** | Complete/cancel mutates work item; events emitted | **Partial** | **LIVE** | `work-command-service.ts` |
| **Duplicate linkage** | `OsPartyDuplicateCandidate` + merge request; merge keeps source party as `merged` + `lineageSnapshotJson` | **Yes** for merge lineage; candidate status mutable | **LIVE** | `party-command-service.ts` `approvePartyMerge`; schema `OsPartyDuplicateCandidate`, `OsPartyMergeRequest` |
| **Ownership (warehouse allocation)** | Correction appends; `deletesAllocation: false`; original quantity kept | **Yes** | **LIVE BUT PARTIAL** (desk/in-memory + tests; prove hosted separately) | `apps/os-web/lib/warehouse/warehouse-allocation.test.ts` (“governed correction does not delete the original allocation”) |
| **Production / quema / finished-goods corrections** | New rows with `corrects*` + `correctionReason`; superseded filtered for current view | **Yes** | **LIVE BUT PARTIAL** | schema production/finished-goods fragments; `packages/os-production/src/store.ts` superseded filter; UI “Se conserva” — `apps/os-web/components/production/production-panel.tsx` |

**Invariant summary:** PREVIOUS STATE PRESERVED is **not globally true**. It is **strong** for coordination decisions, role/manager assignments, work ownership history, merge lineage, reported-fact reverse, operational release corrections, production/allocation correction patterns. It is **weak/partial** for contact/phone in-place updates and any path that only mutates the current row without a history table (party display fields, approval request status, commercial account owner current pointer).

---

## 3. Conflicting Truth handling

| Capability | State | Evidence |
|---|---|---|
| Detect customer-said vs current truth (qty / payment / amount / location) without mutating canonical | **BACKEND ONLY** (pure contract; not a dedicated Conflict UI product) | `detectEvidenceConflict` — `packages/os-contracts/src/evidence.ts` (“Surfaces a difference. Does not change the order, quote, payment, or location”) |
| Keep dismissed interpretation; do not delete original | **BACKEND ONLY** | `applyEvidenceCorrection` revisions array; test “keeps a dismissed interpretation and does not delete the original” — `packages/os-contracts/src/evidence.test.ts` |
| Manual report ≠ confirmed payment / dispatch / stock | **LIVE BUT PARTIAL** (guidance + contract) | `reported-operational-fact.ts`; guidance `CUSTOMER_MESSAGE_IS_NOT_PAYMENT`, `REPORTED_PAYMENT_DOES_NOT_CONFIRM` — `apps/os-web/lib/guidance/catalog.ts` |
| Party duplicate as identity conflict candidate | **LIVE** (data + events); operator merge UX maturity not fully audited here | `party.duplicate.suggested`, merge request/approve |
| Unified “Conflicting Truth” desk / resolution workflow | **MISSING** | No dedicated route or component found |

---

## 4. Audit Viewer UI (who / what / when / before / why without SQL)

| Need | State | Evidence |
|---|---|---|
| Who | **BACKEND ONLY** | `OsAuditLog.actorMemberId` |
| What | **BACKEND ONLY** | `action`, `resourceType`, `resourceId` |
| When | **BACKEND ONLY** | `createdAt` |
| Before | **BACKEND ONLY** / **LIVE BUT PARTIAL** (only when command passes `before`) | `beforeJson`; e.g. location/party update pass before; `UpdateContact` often does not |
| Why | **MISSING** as first-class audit field | No reason column on `OsAuditLog`; “why” only on some domain rows/payloads (`decisionReason`, correction `reason`, approval event payload `reason`) |
| Operator UI without SQL | **MISSING** | No audit viewer page/component under `apps/os-web`; no audit list query service under `packages/os-query` |
| Closest employee-facing substitute | **LIVE BUT PARTIAL** | Party Historial — who/when/what-summary, not full before/why audit |

---

## 5. Cross-record Timeline

| Capability | State | Evidence |
|---|---|---|
| Party-scoped timeline across party + commercial + work + approval events | **LIVE** | Projection — `packages/os-query/src/party/party-timeline-projection-consumer.ts`, facts allowlist — `party-timeline-facts.ts`; API `GET /v1/parties/:partyId/timeline` — `apps/os-api/src/parties.controller.ts`; UI Historial — `apps/os-web/components/commercial/party-timeline-list.tsx`, `apps/os-web/app/(app)/clientes/[partyId]/page.tsx`; copy — `HISTORIAL_SCOPE_COPY` in `timeline-labels.ts` |
| Includes approvals on party-associated subjects | **LIVE** | Event types `approval.*` in `packages/os-contracts/src/work-events.ts` + allowlist; runtime test `apps/os-api/src/party-timeline-work-approval-runtime.test.ts` |
| Universal cross-record timeline (order↔warehouse↔production↔coordination↔audit) | **MISSING** | Timeline event set is party-associated commercial/work only (`party-timeline-events.ts`); **no** `location.*`, coordination decisions, production corrections, or raw audit entries |
| Cross-tenant isolation | **LIVE** | Same runtime test blocks foreign org timeline |

---

## 6. Nothing Disappears (corrections / merge / decision correction)

| Scenario | Disappears? | State | Evidence |
|---|---|---|---|
| Coordination record → resolve | Prior decision row stays | **LIVE BUT PARTIAL** (write proof UNPROVEN) | `coordination-decision.test.ts` “does not delete a prior decision…” |
| Party merge | Source party kept as `status: merged` + `mergedIntoPartyId`; lineage snapshot on merge request | **LIVE** | `approvePartyMerge` in `party-command-service.ts` |
| Contact reassignment on merge | Contacts moved; lineage includes source contacts | **LIVE** | same |
| Approval decide | Request row updated, not deleted; event/audit retained | **LIVE** | `decidePendingApprovalRequest` + emit |
| Warehouse allocation correct | Original allocation row remains | **LIVE BUT PARTIAL** | warehouse allocation test cited above |
| Production correction | Original entry retained; UI “Se conserva” | **LIVE BUT PARTIAL** | `production-panel.tsx` |
| Evidence dismiss/correct | Revisions append; original interpretation kept in revision | **BACKEND ONLY** | `evidence.ts` |
| Contact/phone overwrite | Prior contact field values **not** kept as rows; recovery depends on event/audit completeness | **LIVE BUT PARTIAL** / gap | `updateContact` without before snapshot |

**Nothing Disappears as a global product guarantee:** **LIVE BUT PARTIAL** — intentional in append-only lanes; **not** guaranteed for in-place contact/party field updates.

---

## 7. Approval governance — APPROVE ≠ CONVERT / PAY / SHIP

| Rule | State | Evidence |
|---|---|---|
| Approve does not create an order | **LIVE** | Test — `packages/os-work/src/commercial-approval.test.ts` (“does not create an order”); guidance `APPROVE_DOES_NOT_CREATE_ORDER` — `apps/os-web/lib/guidance/catalog.ts`; shown via `apps/os-web/lib/guidance/select.ts` |
| Convert is a separate commercial command / authority | **LIVE** | `canConvertQuoteToOrder` + `createOrder` — `packages/os-commercial/src/commercial-command-service.ts`; ADR — `docs/architecture/QUOTE_CONVERSION_AUTHORITY_DECISION.md`; guidance `CONVERT_CREATES_ORDER` |
| Send quote ≠ approval | **LIVE** | `SEND_QUOTE_DOES_NOT_GRANT_APPROVAL` — guidance catalog |
| Approve ≠ pay | **LIVE** (capability separation) | Payment exception / confirmed payment require separate scopes and reported-fact rules — `packages/os-contracts/src/operations-scopes.ts`, `reported-operational-fact.ts`, `operational-case.ts` (“A release decision does not confirm a payment”); Approve path only flips approval request status |
| Approve ≠ ship / delivery / warehouse exit | **LIVE** (capability separation) | Delivery / outbound / allocate scopes distinct — `operations-scopes.ts`, delivery boundary tests; Approve does not call delivery writers |
| AI may not approve/convert | **LIVE** (deny list) | `AI_DENIED_INTENTS` includes `approve`, `convert` — `apps/os-web/lib/ai/limits.ts`; `docs/operations/AI_PILOT_BOUNDARY.md` |

---

## 8. Scorecard (Agent 4)

| Item | State |
|---|---|
| Unified Decision Memory product | **MISSING** |
| Approval memory + UI | **LIVE** |
| Coordination decision memory | **LIVE BUT PARTIAL** (UI + contracts; hosted Prisma write UNPROVEN) |
| BusinessEvent stream | **LIVE** |
| Audit write path | **LIVE** |
| Audit Viewer UI (who/what/when/before/why) | **MISSING** |
| Why on audit rows | **MISSING** |
| Conflicting Truth detector | **BACKEND ONLY** |
| Conflicting Truth operator desk | **MISSING** |
| Cross-record Party Historial | **LIVE** |
| Universal cross-record / audit timeline | **MISSING** |
| Nothing Disappears (global) | **LIVE BUT PARTIAL** |
| PREVIOUS STATE PRESERVED (global) | **LIVE BUT PARTIAL** (strong in some lanes, weak on contact overwrite) |
| APPROVE ≠ CONVERT | **LIVE** |
| APPROVE ≠ PAY / SHIP | **LIVE** (separate authority; not Approve side-effects) |

---

## 9. Blockers / parking (non-blocking recon)

| Blocked lane | Type | Evidence | Unblock |
|---|---|---|---|
| Hosted coordination decision insert | `HOSTED_PROOF_BLOCKED` | `COORDINATION_DECISION_MIGRATION_APPLIED = false`; contract `COORDINATION_DECISION_LIVE_WRITE_PROOF = 'UNPROVEN'` | Apply migration + wire API write + browser proof |
| Audit Viewer | Product gap | No UI/query | Product decision + query over `os_audit_logs` with tenant auth |
| Contact correction history | Invariant gap | In-place update without before audit | Governed correction pattern or mandatory beforeJson + reason |

Safe independent lanes continue; this receipt does not implement.

---

## 10. Method

Read-only path search across `packages/os-{contracts,work,party,commercial,workforce,events,database,query,coordination-read}`, `apps/os-web`, `apps/os-api`, and selected `docs/architecture` / guidance. No code changes beyond this receipt file.
