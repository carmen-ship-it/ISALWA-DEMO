-- Batch 5: "Registrar atención" and conversation assignment. Additive, then one CHECK replacement.
-- Does not connect WhatsApp, call a provider, or send a message.
-- channel: call / visit / in_person join whatsapp / manual (all company-entered records).
-- reason: required by the contract for call / visit / in_person; legacy rows stay NULL.
-- assigned_*: who took the conversation. NOT the account owner and NOT a commitment owner.
--   Written only by the take command, which claims with `WHERE assigned_member_id IS NULL`.
-- next_step_commitment_id: opaque link to os_commitments, no foreign key (like the other links).

ALTER TABLE os_customer_conversations
  ADD COLUMN reason TEXT,
  ADD COLUMN assigned_member_id TEXT,
  ADD COLUMN assigned_label TEXT,
  ADD COLUMN assigned_at TIMESTAMPTZ,
  ADD COLUMN next_step_commitment_id TEXT;

ALTER TABLE os_customer_conversations
  DROP CONSTRAINT os_customer_conversations_channel_chk;
ALTER TABLE os_customer_conversations
  ADD CONSTRAINT os_customer_conversations_channel_chk
    CHECK (channel IN ('whatsapp', 'manual', 'call', 'visit', 'in_person'));

ALTER TABLE os_customer_conversations
  ADD CONSTRAINT os_customer_conversations_reason_chk
    CHECK (reason IS NULL OR length(btrim(reason)) > 0),
  ADD CONSTRAINT os_customer_conversations_attention_reason_chk
    CHECK (channel NOT IN ('call', 'visit', 'in_person') OR reason IS NOT NULL),
  ADD CONSTRAINT os_customer_conversations_assignment_chk
    CHECK (
      (assigned_member_id IS NULL AND assigned_label IS NULL AND assigned_at IS NULL)
      OR (
        assigned_member_id IS NOT NULL AND length(btrim(assigned_member_id)) > 0
        AND assigned_label IS NOT NULL AND length(btrim(assigned_label)) > 0
        AND assigned_at IS NOT NULL
      )
    ),
  ADD CONSTRAINT os_customer_conversations_next_step_chk
    CHECK (next_step_commitment_id IS NULL OR length(btrim(next_step_commitment_id)) > 0);

CREATE INDEX os_customer_conversations_org_assigned_idx
  ON os_customer_conversations (organization_id, assigned_member_id);
