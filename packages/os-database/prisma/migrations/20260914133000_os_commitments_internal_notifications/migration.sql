-- Commitments and internal notifications. Additive CREATE only.
-- Does not ALTER existing tables. Does not reuse the legacy notifications table.
-- Does not update os_reported_operational_facts. A reported payment stays pending.
-- Does not resolve shared location provenance. Does not enable the importer.

CREATE TABLE os_commitments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  party_id TEXT,
  owner_member_id TEXT NOT NULL,
  text TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  origin TEXT NOT NULL,
  related_subject_type TEXT,
  related_subject_id TEXT,
  lifecycle TEXT NOT NULL DEFAULT 'open',
  created_by_member_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  provenance_suggestion_id TEXT,
  CONSTRAINT os_commitments_text_chk
    CHECK (length(btrim(text)) > 0),
  CONSTRAINT os_commitments_lifecycle_chk
    CHECK (lifecycle IN ('open', 'fulfilled', 'cancelled')),
  CONSTRAINT os_commitments_origin_chk
    CHECK (origin IN ('employee_entered', 'human_confirmed_suggestion')),
  CONSTRAINT os_commitments_subject_type_chk
    CHECK (
      related_subject_type IS NULL
      OR related_subject_type IN (
        'party',
        'work_item',
        'quote',
        'order',
        'opportunity',
        'commercial_account',
        'approval_request'
      )
    ),
  CONSTRAINT os_commitments_subject_pair_chk
    CHECK (
      (related_subject_type IS NULL AND related_subject_id IS NULL)
      OR (
        related_subject_type IS NOT NULL
        AND related_subject_id IS NOT NULL
        AND length(btrim(related_subject_id)) > 0
      )
    ),
  CONSTRAINT os_commitments_lifecycle_times_chk
    CHECK (
      (lifecycle = 'open' AND fulfilled_at IS NULL AND cancelled_at IS NULL)
      OR (lifecycle = 'fulfilled' AND fulfilled_at IS NOT NULL AND cancelled_at IS NULL)
      OR (lifecycle = 'cancelled' AND cancelled_at IS NOT NULL AND fulfilled_at IS NULL)
    ),
  CONSTRAINT os_commitments_provenance_chk
    CHECK (
      (origin = 'employee_entered' AND provenance_suggestion_id IS NULL)
      OR (
        origin = 'human_confirmed_suggestion'
        AND provenance_suggestion_id IS NOT NULL
        AND length(btrim(provenance_suggestion_id)) > 0
      )
    )
);

-- Pending, due today, and overdue are not columns.
-- Derive them from due_at and the America/La_Paz calendar day.
CREATE INDEX os_commitments_org_owner_lifecycle_due_idx
  ON os_commitments (organization_id, owner_member_id, lifecycle, due_at);

-- party_id, owner_member_id, and related_subject_id are opaque.
-- No foreign key to parties, members, quotes, orders, or work items.

CREATE TABLE os_internal_notifications (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  recipient_member_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  dedup_key TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  source_record_type TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  party_id TEXT,
  channel TEXT NOT NULL DEFAULT 'internal',
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_because TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_internal_notifications_title_chk
    CHECK (length(btrim(title)) > 0),
  CONSTRAINT os_internal_notifications_dedup_chk
    CHECK (length(btrim(dedup_key)) > 0),
  CONSTRAINT os_internal_notifications_source_id_chk
    CHECK (length(btrim(source_record_id)) > 0),
  CONSTRAINT os_internal_notifications_channel_chk
    CHECK (channel = 'internal'),
  CONSTRAINT os_internal_notifications_kind_chk
    CHECK (
      kind IN (
        'approval_assigned',
        'approval_decided',
        'work_due',
        'work_overdue',
        'customer_attention',
        'commitment_due',
        'commitment_overdue',
        'responsibility_changed',
        'data_issue_review'
      )
    ),
  CONSTRAINT os_internal_notifications_source_type_chk
    CHECK (
      source_record_type IN (
        'work_item',
        'approval_request',
        'party',
        'commitment',
        'quote',
        'order',
        'opportunity',
        'organization_member'
      )
    ),
  CONSTRAINT os_internal_notifications_resolution_chk
    CHECK (
      (resolved_at IS NULL AND resolved_because IS NULL)
      OR (resolved_at IS NOT NULL AND resolved_because = 'source_condition_gone')
    )
);

-- One unresolved notice per organization, recipient, and issue.
-- A resolved notice does not block a later one. Read does not resolve.
CREATE UNIQUE INDEX os_internal_notifications_unresolved_dedup_uidx
  ON os_internal_notifications (organization_id, recipient_member_id, dedup_key)
  WHERE resolved_at IS NULL;

-- No email, push, or provider token columns.
-- source_record_id is an opaque record id, not a URL.
-- Does not update the source record when a notice is read or resolved.
