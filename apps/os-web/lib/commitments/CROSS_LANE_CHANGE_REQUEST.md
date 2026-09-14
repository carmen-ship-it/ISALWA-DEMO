CROSS_LANE_CHANGE_REQUEST

From: Worker 4 — commitments + notifications
To: Agent 0
Lock holder: Worker 5 owns schema and migrations this pass. Do not apply this request while that lock is held.
Blocked lane: persistence of commitments and internal notifications only. Derivation, dedup, resolution, copy, and unmounted UI are not blocked.
Unblock: after Worker 5 releases the schema lock, a schema owner adds the tables below. Do not reuse `packages/database` model `Notification` (`notifications`). That table is user-scoped, has no source record, no dedup key, and no resolution.

## Requested, not implemented

### os_commitments

- id
- organization_id
- party_id nullable
- owner_member_id
- text
- due_at nullable
- origin (`employee_entered` | `human_confirmed_suggestion`)
- related_subject_type nullable
- related_subject_id nullable
- lifecycle (`open` | `fulfilled` | `cancelled`) — do not store pending / due_today / overdue; those are derived on the Bolivia calendar day
- created_by_member_id
- created_at
- fulfilled_at nullable
- cancelled_at nullable
- provenance_suggestion_id nullable
- index (organization_id, owner_member_id, lifecycle, due_at)

### os_internal_notifications

- id
- organization_id
- recipient_member_id
- kind
- dedup_key
- title
- body nullable
- source_record_type
- source_record_id
- party_id nullable
- channel literal `internal` — no email, no push, no provider token
- read_at nullable
- resolved_at nullable
- resolved_because nullable, only `source_condition_gone`
- created_at
- partial unique (organization_id, recipient_member_id, dedup_key) WHERE resolved_at IS NULL

No event-type registration is requested. No nav item is requested. No page route is requested.
