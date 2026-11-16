-- Batch 7 / T08-T09: commitment change history and notification acknowledgement.
-- Additive. Does not rewrite os_commitments rows; the deadline and owner stay where they are
-- and each change appends a row here so the previous deadline and actor are never lost.

-- 1. Append-only change history for commitments.
CREATE TABLE os_commitment_changes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  commitment_id TEXT NOT NULL REFERENCES os_commitments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  kind TEXT NOT NULL,
  actor_member_id TEXT NOT NULL,
  reason TEXT,
  previous_due_at TIMESTAMPTZ,
  new_due_at TIMESTAMPTZ,
  previous_owner_member_id TEXT,
  new_owner_member_id TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_commitment_changes_kind_chk
    CHECK (kind IN ('rescheduled', 'reassigned', 'cancelled', 'fulfilled')),
  CONSTRAINT os_commitment_changes_reason_chk
    CHECK (reason IS NULL OR length(btrim(reason)) > 0),
  CONSTRAINT os_commitment_changes_shape_chk
    CHECK (
      (kind = 'rescheduled'
        AND reason IS NOT NULL
        AND new_due_at IS NOT NULL
        AND previous_due_at IS DISTINCT FROM new_due_at
        AND previous_owner_member_id IS NULL AND new_owner_member_id IS NULL)
      OR (kind = 'reassigned'
        AND reason IS NOT NULL
        AND previous_owner_member_id IS NOT NULL
        AND new_owner_member_id IS NOT NULL
        AND previous_owner_member_id <> new_owner_member_id
        AND previous_due_at IS NULL AND new_due_at IS NULL)
      OR (kind = 'cancelled'
        AND reason IS NOT NULL
        AND previous_due_at IS NULL AND new_due_at IS NULL
        AND previous_owner_member_id IS NULL AND new_owner_member_id IS NULL)
      OR (kind = 'fulfilled'
        AND previous_due_at IS NULL AND new_due_at IS NULL
        AND previous_owner_member_id IS NULL AND new_owner_member_id IS NULL)
    )
);

CREATE INDEX os_commitment_changes_commitment_idx
  ON os_commitment_changes (commitment_id, changed_at);

CREATE FUNCTION os_commitment_changes_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'COMMITMENT_CHANGE_APPEND_ONLY';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER os_commitment_changes_append_only_trg
  BEFORE UPDATE OR DELETE ON os_commitment_changes
  FOR EACH ROW EXECUTE FUNCTION os_commitment_changes_append_only();

-- 2. Notifications: acknowledgement is its own state (read and resolved stay separate).
ALTER TABLE os_internal_notifications ADD COLUMN acknowledged_at TIMESTAMPTZ;

ALTER TABLE os_internal_notifications DROP CONSTRAINT os_internal_notifications_kind_chk;
ALTER TABLE os_internal_notifications ADD CONSTRAINT os_internal_notifications_kind_chk
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
      'data_issue_review',
      'payment_to_verify',
      'payment_outcome',
      'commitment_assigned'
    )
  );

-- The bell reads one recipient's open and recently resolved notices.
CREATE INDEX os_internal_notifications_recipient_idx
  ON os_internal_notifications (organization_id, recipient_member_id, created_at DESC);
