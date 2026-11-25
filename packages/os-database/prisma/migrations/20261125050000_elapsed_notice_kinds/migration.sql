-- Elapsed-time internal notices (V2). No email, push, or provider.
-- 60 minutes before a dated commitment; 48 elapsed hours waiting for the customer;
-- 15 elapsed minutes unclaimed. Does not claim business hours.
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
      'conversation_assigned',
      'commitment_due_soon',
      'follow_up_elapsed',
      'conversation_unclaimed'
    )
  );
