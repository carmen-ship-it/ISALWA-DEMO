-- Batch 5B: attention state and team-only notes on a conversation. Additive.
-- Does not connect WhatsApp, call a provider, or send anything. A note is never a message:
-- the notes table has no channel, direction, provider id, phone or delivery column.
--
-- attention_state: Nueva / En atención / Esperando al cliente / Esperando al equipo / Resuelta.
--   It is NOT an AI state (no AI state is stored: none is configured).
-- automation_paused_at: a human took over; automated replies stay paused. No automation exists yet.

-- 1. State on the conversation.
ALTER TABLE os_customer_conversations
  ADD COLUMN attention_state TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN attention_state_changed_at TIMESTAMPTZ,
  ADD COLUMN automation_paused_at TIMESTAMPTZ;

ALTER TABLE os_customer_conversations
  ADD CONSTRAINT os_customer_conversations_attention_state_chk
    CHECK (attention_state IN ('new', 'in_attention', 'waiting_customer', 'waiting_team', 'resolved')),
  -- "En atención" always has someone holding the conversation.
  ADD CONSTRAINT os_customer_conversations_in_attention_holder_chk
    CHECK (attention_state <> 'in_attention' OR assigned_member_id IS NOT NULL);

-- Conversations that were already taken before this batch are in attention, with a human in charge.
UPDATE os_customer_conversations
  SET attention_state = 'in_attention',
      attention_state_changed_at = assigned_at,
      automation_paused_at = assigned_at
  WHERE assigned_member_id IS NOT NULL;

-- The inbox reads state per tenant.
CREATE INDEX os_customer_conversations_org_state_idx
  ON os_customer_conversations (organization_id, attention_state);

-- 2. Append-only state history.
CREATE TABLE os_customer_conversation_state_changes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES os_customer_conversations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  cause TEXT NOT NULL,
  actor_member_id TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_conversation_state_changes_from_chk
    CHECK (from_state IN ('new', 'in_attention', 'waiting_customer', 'waiting_team', 'resolved')),
  CONSTRAINT os_conversation_state_changes_to_chk
    CHECK (to_state IN ('new', 'in_attention', 'waiting_customer', 'waiting_team', 'resolved')),
  CONSTRAINT os_conversation_state_changes_distinct_chk CHECK (from_state <> to_state),
  CONSTRAINT os_conversation_state_changes_cause_chk CHECK (cause IN ('take', 'manual', 'inbound')),
  -- A person causes take and manual changes.
  CONSTRAINT os_conversation_state_changes_actor_chk
    CHECK (cause = 'inbound' OR (actor_member_id IS NOT NULL AND length(btrim(actor_member_id)) > 0))
);

CREATE INDEX os_conversation_state_changes_conversation_idx
  ON os_customer_conversation_state_changes (organization_id, conversation_id, changed_at);

CREATE FUNCTION os_customer_conversation_state_changes_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'CONVERSATION_STATE_CHANGE_APPEND_ONLY';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER os_customer_conversation_state_changes_append_only_trg
  BEFORE UPDATE OR DELETE ON os_customer_conversation_state_changes
  FOR EACH ROW EXECUTE FUNCTION os_customer_conversation_state_changes_append_only();

-- 3. Team-only notes. Append-only.
CREATE TABLE os_customer_conversation_notes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES os_customer_conversations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  author_member_id TEXT NOT NULL,
  author_label TEXT NOT NULL,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'team_only',
  request_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_conversation_notes_visibility_chk CHECK (visibility = 'team_only'),
  CONSTRAINT os_conversation_notes_body_chk CHECK (length(btrim(body)) > 0 AND length(body) <= 4000),
  CONSTRAINT os_conversation_notes_author_chk
    CHECK (length(btrim(author_member_id)) > 0 AND length(btrim(author_label)) > 0),
  CONSTRAINT os_conversation_notes_request_key_chk CHECK (length(btrim(request_key)) >= 8)
);

CREATE UNIQUE INDEX os_conversation_notes_request_key_uq
  ON os_customer_conversation_notes (organization_id, conversation_id, author_member_id, request_key);

CREATE INDEX os_conversation_notes_conversation_idx
  ON os_customer_conversation_notes (organization_id, conversation_id, created_at);

CREATE FUNCTION os_customer_conversation_notes_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'CONVERSATION_NOTE_APPEND_ONLY';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER os_customer_conversation_notes_append_only_trg
  BEFORE UPDATE OR DELETE ON os_customer_conversation_notes
  FOR EACH ROW EXECUTE FUNCTION os_customer_conversation_notes_append_only();
