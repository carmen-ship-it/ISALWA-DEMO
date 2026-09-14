-- Purchase requests. Additive CREATE only.
-- Does not ALTER inventory, orders, parties, production, finance, or commercial tables.
-- A row is a request from an area to the buyer. It is not official stock.
-- stock_authority = not_official does not mean stock is zero and does not mean there is a shortage.
-- reorder_policy = none means this row never creates another purchase.
-- There is no supplier party, approval threshold, reorder point, or purchase-order ledger.

CREATE TABLE os_purchase_requests (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  requesting_area TEXT NOT NULL,
  requested_by_label TEXT NOT NULL,
  requested_by_member_id TEXT,
  description TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  production_context_id TEXT,
  order_id TEXT,
  reason TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  buyer_label TEXT,
  buyer_member_id TEXT,
  actor_label TEXT NOT NULL,
  actor_member_id TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  stock_authority TEXT NOT NULL DEFAULT 'not_official',
  reorder_policy TEXT NOT NULL DEFAULT 'none',
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT os_purchase_requests_area_chk
    CHECK (length(btrim(requesting_area)) > 0),
  CONSTRAINT os_purchase_requests_requested_by_chk
    CHECK (length(btrim(requested_by_label)) > 0),
  CONSTRAINT os_purchase_requests_description_chk
    CHECK (length(btrim(description)) > 0),
  CONSTRAINT os_purchase_requests_reason_chk
    CHECK (length(btrim(reason)) > 0),
  CONSTRAINT os_purchase_requests_actor_chk
    CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT os_purchase_requests_status_chk
    CHECK (status IN ('requested', 'in_progress', 'received', 'cancelled')),
  CONSTRAINT os_purchase_requests_source_chk
    CHECK (source = 'manual'),
  CONSTRAINT os_purchase_requests_stock_authority_chk
    CHECK (stock_authority = 'not_official'),
  CONSTRAINT os_purchase_requests_reorder_policy_chk
    CHECK (reorder_policy = 'none'),
  CONSTRAINT os_purchase_requests_quantity_chk
    CHECK (quantity IS NULL OR length(btrim(quantity)) > 0),
  CONSTRAINT os_purchase_requests_unit_chk
    CHECK (unit IS NULL OR length(btrim(unit)) > 0),
  CONSTRAINT os_purchase_requests_context_chk
    CHECK (production_context_id IS NULL OR length(btrim(production_context_id)) > 0),
  CONSTRAINT os_purchase_requests_order_chk
    CHECK (order_id IS NULL OR length(btrim(order_id)) > 0),
  CONSTRAINT os_purchase_requests_buyer_chk
    CHECK (buyer_label IS NULL OR length(btrim(buyer_label)) > 0)
);

-- Spanish UI labels are not stored. Status ids stay requested, in_progress, received, cancelled.
-- production_context_id and order_id are opaque and optional. No foreign key to orders or production.
-- requested_by_member_id and buyer_member_id are opaque. No foreign key to members or parties.
-- No supplier_party_id, approval threshold, reorder point, or stock-on-hand column.

-- Null idempotency keys stay distinct: a request without a key is not a duplicate.
-- Named like the fragment unique so a later schema merge can adopt this index.
CREATE UNIQUE INDEX os_purchase_requests_organization_id_idempotency_key_key
  ON os_purchase_requests (organization_id, idempotency_key);
CREATE INDEX os_purchase_requests_org_status_requested_idx
  ON os_purchase_requests (organization_id, status, requested_at);
CREATE INDEX os_purchase_requests_org_area_idx
  ON os_purchase_requests (organization_id, requesting_area);

CREATE TABLE os_purchase_request_status_history (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  purchase_request_id TEXT NOT NULL REFERENCES os_purchase_requests(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL,
  actor_label TEXT NOT NULL,
  actor_member_id TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  note TEXT,
  CONSTRAINT os_purchase_request_status_history_status_chk
    CHECK (
      to_status IN ('requested', 'in_progress', 'received', 'cancelled')
      AND (
        from_status IS NULL
        OR from_status IN ('requested', 'in_progress', 'received', 'cancelled')
      )
      AND (from_status IS NULL OR from_status <> to_status)
    ),
  CONSTRAINT os_purchase_request_status_history_open_chk
    CHECK (from_status IS NOT NULL OR to_status = 'requested'),
  CONSTRAINT os_purchase_request_status_history_actor_chk
    CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT os_purchase_request_status_history_source_chk
    CHECK (source = 'manual')
);

CREATE INDEX os_purchase_request_status_history_request_idx
  ON os_purchase_request_status_history (organization_id, purchase_request_id, changed_at);

CREATE TABLE os_purchase_request_notes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  purchase_request_id TEXT NOT NULL REFERENCES os_purchase_requests(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  body TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  actor_label TEXT NOT NULL,
  actor_member_id TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  evidence_reference TEXT,
  CONSTRAINT os_purchase_request_notes_body_chk
    CHECK (length(btrim(body)) > 0),
  CONSTRAINT os_purchase_request_notes_actor_chk
    CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT os_purchase_request_notes_source_chk
    CHECK (source = 'manual'),
  CONSTRAINT os_purchase_request_notes_evidence_chk
    CHECK (evidence_reference IS NULL OR length(btrim(evidence_reference)) > 0)
);

-- evidence_reference is a human pointer. It is not a stock count and not a shortage proof.
CREATE INDEX os_purchase_request_notes_request_idx
  ON os_purchase_request_notes (organization_id, purchase_request_id, recorded_at);

-- History and notes are append-only. Do not UPDATE or DELETE them to rewrite a status change.
CREATE OR REPLACE FUNCTION os_purchase_request_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'purchase request history is append-only';
END;
$$;

CREATE TRIGGER os_purchase_request_status_history_append_only
  BEFORE UPDATE OR DELETE ON os_purchase_request_status_history
  FOR EACH ROW EXECUTE FUNCTION os_purchase_request_append_only();

CREATE TRIGGER os_purchase_request_notes_append_only
  BEFORE UPDATE OR DELETE ON os_purchase_request_notes
  FOR EACH ROW EXECUTE FUNCTION os_purchase_request_append_only();
