-- In-app notice when a conversation is taken. No email, push, or provider.
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
      'commitment_assigned',
      'conversation_assigned'
    )
  );

ALTER TABLE os_internal_notifications DROP CONSTRAINT os_internal_notifications_source_type_chk;
ALTER TABLE os_internal_notifications ADD CONSTRAINT os_internal_notifications_source_type_chk
  CHECK (
    source_record_type IN (
      'work_item',
      'approval_request',
      'party',
      'commitment',
      'quote',
      'order',
      'opportunity',
      'organization_member',
      'payment_report',
      'conversation'
    )
  );
