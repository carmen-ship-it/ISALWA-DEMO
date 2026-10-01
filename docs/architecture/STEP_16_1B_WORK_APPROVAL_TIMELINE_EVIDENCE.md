# Step 16.1B — Work + Approval Party Timeline Evidence

**Date:** 2026-08-24  
**Lane:** F — CLR-06 completion (Work/Approval association)  
**Verification log:** `.step16-1b-evidence/verify-20260824T134200Z.log`  
**Verify script:** `scripts/verify-step-16-1b.sh`

---

## Gate summary

| Area | Status |
|------|--------|
| Work events in Party timeline (safe association) | **VERIFIED** |
| Approval events in Party timeline (safe association) | **VERIFIED** |
| Party + Commercial regression | **VERIFIED** |
| Approval security regression (Step 14.4) | **VERIFIED** (17/17) |
| Tenant isolation | **VERIFIED** |
| Duplicate idempotency + replay rebuild | **VERIFIED** |
| No raw payload / contextSnapshot exposure | **VERIFIED** |
| HTTP runtime | **VERIFIED** |

**Step 16.1B gate:** **PASS (CONDITIONAL)** — contracted historial domains closed; explicit exclusions documented.

---

## CLR-06 status

**CLOSED** for supported Cliente historial domains:

- PartyGraph
- Commercial
- Work (deterministic Party association only)
- Approval (deterministic Party association only)

**Not claimed:** complete company history. Lead, Finance, Messaging, and unassociated Work remain excluded.

---

## Safe Party association rules

### Work events (`work.created`, `task.reassigned`, `work.completed`, `work.cancelled`)

1. Hydrate canonical `WorkItem` by `primaryEntityId` (work item id).
2. Resolve Party from `WorkItem.subjectType` + `subjectId`:
   - `party` → `subjectId` (verified in org)
   - `commercial_account` → `OsCommercialStore.getCommercialAccountInOrg` → `partyId`
   - `organization_member`, `work_item` → **excluded** (no deterministic Party link)

### Approval events (`approval.requested`, `approval.approved`, `approval.rejected`)

1. Read bounded payload fields `subjectType` + `subjectId` only.
2. Fail closed unless `isApprovalSubjectType(subjectType)`.
3. Resolve:
   - `party` → direct (verified in org)
   - `work_item` → hydrate WorkItem → apply Work rules above
   - `organization_member` → **excluded**

### Never used for association

- `contextSnapshot` / `contextSnapshotJson`
- free-form reason text
- arbitrary payload keys
- names, emails, heuristics

Implementation: `packages/os-query/src/party/party-timeline-association.ts`

---

## Events included

### Work

| Event | Included when |
|-------|---------------|
| `work.created` | WorkItem resolves to Party |
| `task.reassigned` | WorkItem resolves to Party |
| `work.completed` | WorkItem resolves to Party |
| `work.cancelled` | WorkItem resolves to Party |

### Approval

| Event | Included when |
|-------|---------------|
| `approval.requested` | subject resolves to Party |
| `approval.approved` | subject resolves to Party |
| `approval.rejected` | subject resolves to Party |

---

## Events / subjects excluded

| Exclusion | Reason |
|-----------|--------|
| Work `subjectType=organization_member` | No Party relationship |
| Work `subjectType=work_item` | No deterministic Party chain |
| Approval `subjectType=organization_member` | Not Party-associated per architecture |
| Approval commercial subjects (`quote`, `order`, `opportunity`, `commercial_account`) | Blocked at command layer (Step 14.4) — not enabled |
| Lead lifecycle events | No safe Party association in v1 |
| Finance / Messaging / Territory | Not implemented |

---

## Facts allowlist (no raw payload)

Work/Approval facts added to `party-timeline-facts.ts` — bounded scalar fields only. Approval decision events use Step 14.4 canonical payload fields; **no** `contextSnapshot`.

---

## Code changes (Lane F only)

| File | Change |
|------|--------|
| `packages/os-contracts/src/party-timeline-events.ts` | Include `OS_WORK_EVENT_TYPES` |
| `packages/os-query/src/party/party-timeline-association.ts` | Work/Approval resolver + work store hydration |
| `packages/os-query/src/party/party-timeline-facts.ts` | Work/Approval fact allowlists |
| `packages/os-query/src/party/party-timeline-projection-consumer.ts` | `workStore` dep |
| `packages/os-commercial/src/os-commercial-store.ts` | `getCommercialAccountInOrg` read lookup |
| `packages/os-database/src/prisma-commercial-store.ts` | Prisma implementation |
| `apps/os-api/src/os-store.module.ts` | Wire `workStore` into timeline consumer |

**Not modified:** `packages/os-work` commands, Approval subject registry, `apps/os-web`, workforce auth.

---

## Postgres verification

| Suite | Tests | Result |
|-------|-------|--------|
| party timeline regression (16.1A) | 6 | PASS |
| work + approval timeline (16.1B) | 7 | PASS |
| approval security regression (14.4) | 17 | PASS |

---

## HTTP verification

| Test | Result |
|------|--------|
| Timeline includes work + approval entries | PASS |
| No raw `payload` in response | PASS |
| No `contextSnapshot` in facts | PASS |
| Cross-tenant timeline blocked | PASS |

---

## Extension procedure

To add a new Work/Approval → Party association safely:

1. Confirm subject type is in governed registry (`WORK_SUBJECT_TYPES` / `APPROVAL_SUBJECT_TYPES`).
2. Implement deterministic lookup in `party-timeline-association.ts` (canonical store hydration only).
3. Add bounded fact keys to `party-timeline-facts.ts`.
4. Add Postgres + HTTP negative tests proving no payload leakage and no guessing.
5. Run `scripts/verify-step-16-1b.sh`.

Rebuild: `replayPartyTimelineForOrg({ projectionStore, commercialStore, workStore }, orgId, consumer)`

---

## Carmen handoff

### WHERE WE ARE

CLR-06 Party timeline now includes **PartyGraph + Commercial + Work + Approval** where association is deterministic. Cliente Historial backend is ready for Agent 4 wiring.

### CLR-06 STATUS
**CLOSED** (contracted domains; explicit exclusions below)

### TIMELINE DOMAINS NOW INCLUDED
PartyGraph, Commercial, Work (party/commercial_account subjects), Approval (party / work_item→party)

### WORK EVENTS INCLUDED
`work.created`, `task.reassigned`, `work.completed`, `work.cancelled`

### APPROVAL EVENTS INCLUDED
`approval.requested`, `approval.approved`, `approval.rejected`

### SAFE PARTY ASSOCIATION RULES
See **Safe Party association rules** section above.

### EVENTS / SUBJECTS EXCLUDED
Work: `organization_member`, `work_item` subjects. Approval: `organization_member`. All commercial approval subjects. Lead/Finance/Messaging.

### COMMERCIAL APPROVAL SUBJECTS ENABLED
**NO**

### RAW BUSINESS EVENT PAYLOAD EXPOSED
**NO**

### CONTEXTSNAPSHOT EXPOSED
**NO**

### WHAT POSTGRES PROVED
Work lifecycle on party subject; commercial_account resolution; unrelated work excluded; approval party + work_item chain; org_member approval excluded; duplicate idempotency; replay rebuild; Party/Commercial regression; 14.4 security regression.

### WHAT HTTP RUNTIME PROVED
Live `GET /v1/parties/:partyId/timeline` with work + approval entries; bounded response; cross-tenant 404.

### SECURITY NEGATIVE TESTS
Cross-tenant blocked; unrelated work excluded; org_member approval excluded; no payload/contextSnapshot; approval subject registry unchanged (14.4 regression green).

### PROJECTION REBUILD
**PASS**

### WHAT IS NOT VERIFIED
- Lead timeline association
- Browser E2E Historial UI (Agent 4)
- Work with `work_item` subject chaining
- Terminated member timeline query (foundation gap — Agent 1)

### TERMINATED MEMBER AUTH DEPENDENCY
**OPEN** (CROSS_LANE_DEPENDENCY — does not block timeline implementation)

### CROSS-LANE CHANGE REQUESTS
None for 16.1B. Prior: Agent 1 — extend `assertMemberActive` for `terminated`.

### ARCHITECTURE DRIFT
**NO**

### LOW-MAINTENANCE HANDOFF
**PASS** — association rules codified in `party-timeline-association.ts`; verify script documented.

### CARMEN-DISAPPEARANCE TEST
**PASS (CONDITIONAL)** — backend historial complete for contracted domains; UI wiring remains Agent 4.

### WHAT AGENT 4 CAN NOW ADD TO HISTORIAL
Factual entries for: party lifecycle, commercial lifecycle, work created/reassigned/completed/cancelled (when party-linked), approval requested/approved/rejected (when party-linked). Use `eventType` + allowlisted `facts` only; labels in `timeline-labels.ts`.

### EXACT NEXT BACKEND GAP
Lead lifecycle → Party timeline association (when Lead resolve contract exists).

### EXACT NEXT ACTION
Agent 4: wire Cliente Historial tab to existing `GET /v1/parties/:partyId/timeline` including Work/Approval entry types in label map.

### EXACT NEXT CURSOR PROMPT

For Agent 4 only:

```
Cliente Historial — extend party-timeline-list + timeline-labels.ts for work.created, task.reassigned, work.completed, work.cancelled, approval.requested, approval.approved, approval.rejected using GET /v1/parties/:partyId/timeline facts only. Do NOT modify os-api. Evidence: docs/architecture/STEP_16_1B_WORK_APPROVAL_TIMELINE_EVIDENCE.md
```
