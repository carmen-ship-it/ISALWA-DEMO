-- Reported operational facts. Additive CREATE only.
-- Does not ALTER party, quote, order, location, commercial, or import tables.
-- Does not attach rows to imported customers. Does not geocode. Does not post a ledger.
-- A row here is not a confirmed payment, authoritative logistics, or an inventory movement.
-- confirmation cannot become confirmed on this table. A future finance confirmation is a different record.

CREATE TABLE os_reported_operational_facts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  kind TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL,
  reported_by_member_id TEXT,
  reported_by_label TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  confirmation TEXT NOT NULL DEFAULT 'pending',
  activity TEXT NOT NULL DEFAULT 'active',
  reversal_reason TEXT,
  source_reference TEXT,
  note TEXT,
  payload_json JSONB NOT NULL,
  corrects_fact_id TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_reported_operational_facts_kind_chk
    CHECK (kind IN ('payment', 'dispatch', 'stock')),
  CONSTRAINT os_reported_operational_facts_subject_chk
    CHECK (subject_type IN ('party', 'quote', 'order', 'item')),
  CONSTRAINT os_reported_operational_facts_source_chk
    CHECK (source = 'manual'),
  CONSTRAINT os_reported_operational_facts_confirmation_chk
    CHECK (confirmation = 'pending'),
  CONSTRAINT os_reported_operational_facts_activity_chk
    CHECK (activity IN ('active', 'reversed')),
  CONSTRAINT os_reported_operational_facts_reversal_chk
    CHECK (
      (activity = 'active' AND reversal_reason IS NULL)
      OR (
        activity = 'reversed'
        AND reversal_reason IS NOT NULL
        AND length(btrim(reversal_reason)) > 0
      )
    ),
  CONSTRAINT os_reported_operational_facts_payload_chk
    CHECK (jsonb_typeof(payload_json) = 'object'),
  CONSTRAINT os_reported_operational_facts_corrects_fk
    FOREIGN KEY (corrects_fact_id) REFERENCES os_reported_operational_facts(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX os_reported_operational_facts_org_idempotency_uidx
  ON os_reported_operational_facts (organization_id, idempotency_key);
CREATE INDEX os_reported_operational_facts_org_subject_idx
  ON os_reported_operational_facts (organization_id, subject_type, subject_id);
CREATE INDEX os_reported_operational_facts_org_kind_activity_idx
  ON os_reported_operational_facts (organization_id, kind, activity);
CREATE INDEX os_reported_operational_facts_org_reported_idx
  ON os_reported_operational_facts (organization_id, reported_at);

-- subject_id is opaque. No foreign key to os_parties, os_quotes, os_orders, or os_locations.
-- Inserting or reversing a report must not update those tables.
