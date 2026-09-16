-- Issue memory: OS Issues, journal entries, references, work links, relations, resolution cycles.
-- Also: product feedback, issue ownership history.
-- Additive CREATE only. No DROP, no column type changes, no destructive operations.

-- os_issues: Root issue table
CREATE TABLE os_issues (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  version INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  title TEXT,
  description TEXT NOT NULL,
  reported_by_member_id TEXT NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL,
  current_owner_member_id TEXT,
  confirmed_cause TEXT,
  confirmed_cause_by_member_id TEXT,
  confirmed_cause_at TIMESTAMPTZ,
  resolution TEXT,
  resolved_by_member_id TEXT,
  resolved_at TIMESTAMPTZ,
  outcome TEXT,
  outcome_recorded_by_member_id TEXT,
  outcome_recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_issues_status_chk CHECK (length(btrim(status)) > 0),
  CONSTRAINT os_issues_description_chk CHECK (length(btrim(description)) > 0),
  CONSTRAINT os_issues_reported_by_chk CHECK (length(btrim(reported_by_member_id)) > 0)
);

CREATE INDEX os_issues_org_status_idx ON os_issues (organization_id, status);
CREATE INDEX os_issues_org_owner_idx ON os_issues (organization_id, current_owner_member_id);
CREATE INDEX os_issues_org_reporter_idx ON os_issues (organization_id, reported_by_member_id);
CREATE INDEX os_issues_org_created_idx ON os_issues (organization_id, created_at);

-- os_issue_references: External entity references for issues
CREATE TABLE os_issue_references (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  issue_id TEXT NOT NULL REFERENCES os_issues(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_member_id TEXT NOT NULL,
  CONSTRAINT os_issue_references_type_chk CHECK (length(btrim(reference_type)) > 0),
  CONSTRAINT os_issue_references_ref_chk CHECK (length(btrim(reference_id)) > 0),
  CONSTRAINT os_issue_references_created_by_chk CHECK (length(btrim(created_by_member_id)) > 0)
);

CREATE UNIQUE INDEX os_issue_references_unique_idx
  ON os_issue_references (organization_id, issue_id, reference_type, reference_id);

CREATE INDEX os_issue_references_lookup_idx
  ON os_issue_references (organization_id, reference_type, reference_id);

-- os_issue_journal_entries: Append-only journal for issue activity
CREATE TABLE os_issue_journal_entries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  issue_id TEXT NOT NULL REFERENCES os_issues(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  entry_type TEXT NOT NULL,
  content TEXT NOT NULL,
  author_member_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  provenance TEXT,
  CONSTRAINT os_issue_journal_entries_type_chk CHECK (length(btrim(entry_type)) > 0),
  CONSTRAINT os_issue_journal_entries_content_chk CHECK (length(btrim(content)) > 0),
  CONSTRAINT os_issue_journal_entries_author_chk CHECK (length(btrim(author_member_id)) > 0)
);

CREATE INDEX os_issue_journal_entries_issue_recorded_idx
  ON os_issue_journal_entries (issue_id, recorded_at);

-- os_issue_work_links: Links issues to OsWorkItem
CREATE TABLE os_issue_work_links (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  issue_id TEXT NOT NULL REFERENCES os_issues(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  work_item_id TEXT NOT NULL,
  linked_by_member_id TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT os_issue_work_links_work_chk CHECK (length(btrim(work_item_id)) > 0),
  CONSTRAINT os_issue_work_links_linked_by_chk CHECK (length(btrim(linked_by_member_id)) > 0)
);

CREATE UNIQUE INDEX os_issue_work_links_unique_idx
  ON os_issue_work_links (organization_id, issue_id, work_item_id);

-- os_issue_relations: Issue-to-issue relationships (blocks, duplicates, etc.)
CREATE TABLE os_issue_relations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  from_issue_id TEXT NOT NULL REFERENCES os_issues(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  to_issue_id TEXT NOT NULL REFERENCES os_issues(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  relation_type TEXT NOT NULL,
  created_by_member_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_issue_relations_type_chk CHECK (length(btrim(relation_type)) > 0),
  CONSTRAINT os_issue_relations_created_by_chk CHECK (length(btrim(created_by_member_id)) > 0),
  CONSTRAINT os_issue_relations_self_chk CHECK (from_issue_id <> to_issue_id)
);

CREATE UNIQUE INDEX os_issue_relations_unique_idx
  ON os_issue_relations (organization_id, from_issue_id, to_issue_id, relation_type);

-- os_issue_resolution_cycles: Append-only reopen/resolve history
CREATE TABLE os_issue_resolution_cycles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  issue_id TEXT NOT NULL REFERENCES os_issues(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  cycle_index INTEGER NOT NULL,
  confirmed_cause TEXT,
  confirmed_cause_by_member_id TEXT,
  confirmed_cause_at TIMESTAMPTZ,
  resolution TEXT,
  resolved_by_member_id TEXT,
  resolved_at TIMESTAMPTZ,
  outcome TEXT,
  outcome_recorded_by_member_id TEXT,
  outcome_recorded_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  closed_by_member_id TEXT,
  reopened_at TIMESTAMPTZ,
  reopened_by_member_id TEXT,
  recorded_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT os_issue_resolution_cycles_index_chk CHECK (cycle_index >= 0)
);

CREATE INDEX os_issue_resolution_cycles_issue_idx
  ON os_issue_resolution_cycles (issue_id, cycle_index);

-- os_product_feedback: In-app product feedback from members
CREATE TABLE os_product_feedback (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  member_id TEXT NOT NULL,
  route TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_product_feedback_member_chk CHECK (length(btrim(member_id)) > 0),
  CONSTRAINT os_product_feedback_route_chk CHECK (length(btrim(route)) > 0),
  CONSTRAINT os_product_feedback_message_chk CHECK (length(btrim(message)) > 0)
);

CREATE INDEX os_product_feedback_org_created_idx
  ON os_product_feedback (organization_id, created_at);

-- os_issue_ownership_history: Audit trail for issue ownership changes
CREATE TABLE os_issue_ownership_history (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  issue_id TEXT NOT NULL REFERENCES os_issues(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  from_member_id TEXT,
  to_member_id TEXT NOT NULL,
  changed_by_member_id TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  CONSTRAINT os_issue_ownership_history_to_chk CHECK (length(btrim(to_member_id)) > 0),
  CONSTRAINT os_issue_ownership_history_changed_by_chk CHECK (length(btrim(changed_by_member_id)) > 0)
);

CREATE INDEX os_issue_ownership_history_issue_idx
  ON os_issue_ownership_history (issue_id, changed_at);

-- Additive column on os_commitments: fulfilled_by_member_id
-- Only ADD COLUMN, no DROP or ALTER TYPE.
ALTER TABLE os_commitments ADD COLUMN IF NOT EXISTS fulfilled_by_member_id TEXT;
