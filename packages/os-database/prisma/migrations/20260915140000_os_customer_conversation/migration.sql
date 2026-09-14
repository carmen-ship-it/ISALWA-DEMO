-- Manual customer conversation. Additive CREATE only.
-- Does not ALTER party, quote, order, opportunity, commercial, or import tables.
-- Does not connect WhatsApp. Does not call a model. Does not send a message.
-- A message is evidence. This table cannot confirm a payment, stock, a delivery,
-- completed production, or an approved discount. Those states are not columns.
-- WhatsApp uses the corporate number of the sales advisor. That number was not
-- provided. Status stays WHATSAPP_NUMBER_PENDING. There is no phone column.

CREATE TABLE os_customer_conversations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  customer_id TEXT NOT NULL,
  customer_label TEXT NOT NULL,
  contact_label TEXT,
  channel TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  entered_by_member_id TEXT,
  entered_by_label TEXT NOT NULL,
  summary TEXT NOT NULL,
  pasted_evidence TEXT,
  opportunity_id TEXT,
  quote_id TEXT,
  order_id TEXT,
  customer_question TEXT,
  commitment_candidate TEXT,
  possible_requested_date DATE,
  next_action TEXT,
  source TEXT NOT NULL DEFAULT 'employee_entered',
  provenance TEXT NOT NULL DEFAULT 'company_entered',
  advisor_number_status TEXT NOT NULL DEFAULT 'WHATSAPP_NUMBER_PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_customer_conversations_channel_chk
    CHECK (channel IN ('whatsapp', 'manual')),
  CONSTRAINT os_customer_conversations_source_chk
    CHECK (source = 'employee_entered'),
  CONSTRAINT os_customer_conversations_provenance_chk
    CHECK (provenance = 'company_entered'),
  CONSTRAINT os_customer_conversations_advisor_number_chk
    CHECK (advisor_number_status = 'WHATSAPP_NUMBER_PENDING'),
  CONSTRAINT os_customer_conversations_customer_chk
    CHECK (length(btrim(customer_id)) > 0 AND length(btrim(customer_label)) > 0),
  CONSTRAINT os_customer_conversations_summary_chk
    CHECK (length(btrim(summary)) > 0),
  CONSTRAINT os_customer_conversations_entered_by_chk
    CHECK (length(btrim(entered_by_label)) > 0),
  CONSTRAINT os_customer_conversations_contact_chk
    CHECK (contact_label IS NULL OR length(btrim(contact_label)) > 0),
  CONSTRAINT os_customer_conversations_evidence_chk
    CHECK (pasted_evidence IS NULL OR length(btrim(pasted_evidence)) > 0),
  CONSTRAINT os_customer_conversations_question_chk
    CHECK (customer_question IS NULL OR length(btrim(customer_question)) > 0),
  CONSTRAINT os_customer_conversations_commitment_chk
    CHECK (commitment_candidate IS NULL OR length(btrim(commitment_candidate)) > 0),
  CONSTRAINT os_customer_conversations_next_action_chk
    CHECK (next_action IS NULL OR length(btrim(next_action)) > 0),
  CONSTRAINT os_customer_conversations_link_chk
    CHECK (
      (opportunity_id IS NULL OR length(btrim(opportunity_id)) > 0)
      AND (quote_id IS NULL OR length(btrim(quote_id)) > 0)
      AND (order_id IS NULL OR length(btrim(order_id)) > 0)
    )
);

CREATE INDEX os_customer_conversations_org_customer_occurred_idx
  ON os_customer_conversations (organization_id, customer_id, occurred_at DESC);
CREATE INDEX os_customer_conversations_org_occurred_idx
  ON os_customer_conversations (organization_id, occurred_at DESC);

-- customer_id, opportunity_id, quote_id, and order_id are opaque required-or-absent links.
-- No foreign key to os_parties, os_opportunities, os_quotes, or os_orders.
-- Inserting a row must not update those tables and must not confirm a payment or a delivery.
