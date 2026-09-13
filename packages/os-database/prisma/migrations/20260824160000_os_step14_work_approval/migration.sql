-- Step 14 — Work / Approval foundation (Lane E)

ALTER TABLE os_work_items
  ADD COLUMN created_by_member_id TEXT,
  ADD COLUMN description TEXT,
  ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN due_at TIMESTAMPTZ,
  ADD COLUMN completed_at TIMESTAMPTZ,
  ADD COLUMN cancelled_at TIMESTAMPTZ;

UPDATE os_work_items SET created_by_member_id = owner_member_id WHERE created_by_member_id IS NULL;
ALTER TABLE os_work_items ALTER COLUMN created_by_member_id SET NOT NULL;

CREATE INDEX os_work_items_org_owner_status_idx ON os_work_items (organization_id, owner_member_id, status);

CREATE TABLE os_work_item_ownership_history (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  work_item_id TEXT NOT NULL REFERENCES os_work_items(id),
  from_member_id TEXT,
  to_member_id TEXT NOT NULL,
  changed_by_member_id TEXT NOT NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX os_work_item_ownership_history_item_idx ON os_work_item_ownership_history (work_item_id, changed_at);

CREATE TABLE os_approval_requests (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  work_item_id TEXT REFERENCES os_work_items(id),
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  requested_by_member_id TEXT NOT NULL,
  approver_member_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  context_snapshot_json JSONB NOT NULL,
  decision_by_member_id TEXT,
  decision_reason TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX os_approval_requests_org_status_idx ON os_approval_requests (organization_id, status);
CREATE INDEX os_approval_requests_approver_status_idx ON os_approval_requests (approver_member_id, status);
