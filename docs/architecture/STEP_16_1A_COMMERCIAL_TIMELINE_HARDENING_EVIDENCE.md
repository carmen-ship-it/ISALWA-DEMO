# Step 16.1A — Commercial Read-Side Hardening + Party Timeline Evidence

**Date:** 2026-08-24  
**Lane:** F extension — hardening + CLR-06 partial  
**Verification log:** `.step16-1a-evidence/verify-20260824T132323Z.log`  
**Verify script:** `scripts/verify-step-16-1a.sh`

---

## Gate summary

| Area | Status |
|------|--------|
| Order cancellation projection | **VERIFIED** |
| Duplicate order.cancelled idempotency | **VERIFIED** |
| Commercial freshness stale/current cycle | **VERIFIED** |
| Rebuild preserves cancelled order | **VERIFIED** |
| Unknown event schema version fail-safe | **VERIFIED** |
| Commercial HTTP security negatives | **VERIFIED** |
| Party + Commercial timeline (CLR-06) | **PARTIAL — CLOSED for Party/Commercial** |
| Work/Approval timeline | **DEFERRED** (Agent 1 remediation) |
| Cliente 360 UI | **NOT VERIFIED** (Agent 4) |

**Step 16.1A gate:** **PASS (CONDITIONAL)**

---

## Part A — Commercial projection hardening

| Test | Result |
|------|--------|
| `order.cancelled` → projection status `cancelled` | PASS |
| Duplicate `order.cancelled` idempotent | PASS |
| Freshness stale when outbox pending | PASS |
| Freshness current after consumer drain | PASS |
| Replay rebuild preserves cancelled order | PASS |
| Schema version 999 → `OUTBOX_SCHEMA_VERSION_UNKNOWN` | PASS |

Postgres: 11/11 commercial projection tests PASS.

---

## Part B — HTTP security hardening

| Test | Result |
|------|--------|
| Cross-tenant GET opportunity → 404 | PASS |
| Cross-tenant GET order → 404 | PASS |
| Cross-tenant GET quote → 404 | PASS |
| Malicious `ownerMemberId` filter → 403 | PASS |
| Suspended member → 403 | PASS |
| Foreign/guessed `partyId` filter → empty (no leak) | PASS |
| GET party timeline authorized | PASS |
| Cross-tenant timeline → 404 | PASS |
| No raw `payload` in timeline response | PASS |

HTTP: 7/7 runtime tests PASS.

**Note:** `assertMemberActive` gates `suspended`/`revoked`, not `terminated` — document as foundation gap FG-Timeline-Auth.

---

## Part C — CLR-06 Party timeline

### Design choice

**Rebuildable projection** (`os_party_timeline_entries`) over direct `os_business_events` query — indexed `(organizationId, partyId, occurredAt DESC)`, idempotent upsert by `entryId = eventId`, matches Lane F patterns.

### Consumer

- Key: `projection.timeline.party.v1`
- File: `packages/os-query/src/party/party-timeline-projection-consumer.ts`
- Replay: `replayPartyTimelineForOrg`

### Event sources (safe now)

| Domain | Events | Association rule |
|--------|--------|------------------|
| PartyGraph | `party.*`, `contact.updated` | `primaryEntityType=party` or payload `partyId` / `organizationPartyId` |
| Commercial | all 14 `OS_COMMERCIAL_EVENT_TYPES` | payload `partyId` or hydrate from `OsCommercialStore` |

### Deferred event sources

| Domain | Status | Reason |
|--------|--------|--------|
| Work | DEFERRED | subjectType/subjectId mapping not safely governed |
| Approval | DEFERRED | Agent 1 subject validation remediation |
| Lead | DEFERRED | party association on resolve only — not in v1 timeline |

### Query contract

- Name: `ListPartyTimeline`
- HTTP: `GET /v1/parties/:partyId/timeline`
- Response: `PartyTimelineEntryReadModel` — allowlisted `facts` only, **no raw payload**

### Postgres timeline tests

6/6 PASS — party creation, commercial events, isolation, duplicate idempotency, replay, freshness.

---

## Cliente 360 backend composition contract

```
GET /v1/parties/:id                    → identity + roles + contacts + commercialAccount
GET /v1/parties/:partyId/timeline      → authorized factual history (NEW)
GET /v1/opportunities?partyId=
GET /v1/quotes?partyId=
GET /v1/orders?partyId=
GET /v1/work-items?subjectType=commercial_account&subjectId=
GET /v1/attention
```

Party remains identity authority. No monolithic joined record.

---

## Rebuild procedures

```bash
# Commercial read models
replayCommercialProjectionForOrg({ projectionStore, commercialStore }, orgId, commercialConsumer)

# Party timeline
replayPartyTimelineForOrg({ projectionStore, commercialStore }, orgId, timelineConsumer)

# Operational drain
GET /v1/operations/outbox  # or outbox worker

# Freshness
os_projection_freshness WHERE consumer_key IN (
  'projection.commercial.summary.v1',
  'projection.timeline.party.v1'
)
```

---

## Policy deferrals

No invented client policy on timeline or commercial reads.

---

## Related docs

- `STEP_16_1_COMMERCIAL_PROJECTION_EVIDENCE.md`
- `STEP_16_COMMERCIAL_PROJECTION_READINESS.md` (updated)
