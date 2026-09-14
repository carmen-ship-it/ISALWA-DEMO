-- Delivery boundary. Additive CREATE only.
-- Warehouse exit (nota de salida) and customer delivery (nota de entrega) are different tables.
-- Recording one does not insert the other.
-- Numbering policy is unknown: no note number column and no allocated format.
-- Not an invoice. No tax identifier and no fiscal columns. No signature method column.
-- Payment is not required. confirmed_ledger_payment cannot become true.
-- An authorized exception is not a ledger posting. This migration does not touch finance tables.
-- Does not ALTER os_orders, os_quotes, or schema owned by other lanes.
-- order_line_id is an opaque copy. No FK to an order-line table this lane does not own.

CREATE TABLE os_warehouse_exits (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  order_id TEXT NOT NULL REFERENCES os_orders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  exited_at TIMESTAMPTZ NOT NULL,
  recorded_by_member_id TEXT NOT NULL REFERENCES os_organization_members(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  source TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_warehouse_exits_source_chk CHECK (source = 'employee_recorded')
);

CREATE TABLE os_warehouse_outbound_notes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  warehouse_exit_id TEXT NOT NULL REFERENCES os_warehouse_exits(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  order_id TEXT NOT NULL REFERENCES os_orders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  document_kind TEXT NOT NULL,
  numbering_policy TEXT NOT NULL,
  exited_at TIMESTAMPTZ NOT NULL,
  born_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_warehouse_outbound_notes_kind_chk CHECK (document_kind = 'nota_de_salida'),
  CONSTRAINT os_warehouse_outbound_notes_numbering_chk CHECK (numbering_policy = 'unknown'),
  CONSTRAINT os_warehouse_outbound_notes_timing_chk CHECK (born_at >= exited_at),
  CONSTRAINT os_warehouse_outbound_notes_exit_uidx UNIQUE (warehouse_exit_id)
);

CREATE TABLE os_warehouse_outbound_note_lines (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  outbound_note_id TEXT NOT NULL REFERENCES os_warehouse_outbound_notes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  order_line_id TEXT NOT NULL,
  product_ref TEXT,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_warehouse_outbound_note_lines_quantity_chk CHECK (quantity >= 1),
  CONSTRAINT os_warehouse_outbound_note_lines_description_chk CHECK (length(btrim(description)) > 0)
);

CREATE TABLE os_deliveries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  order_id TEXT NOT NULL REFERENCES os_orders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  delivered_at TIMESTAMPTZ NOT NULL,
  delivered_to TEXT,
  recorded_by_member_id TEXT NOT NULL REFERENCES os_organization_members(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  source TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_deliveries_source_chk CHECK (source = 'employee_recorded'),
  CONSTRAINT os_deliveries_delivered_to_chk CHECK (
    delivered_to IS NULL OR length(btrim(delivered_to)) > 0
  )
);

CREATE TABLE os_delivery_notes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  delivery_id TEXT NOT NULL REFERENCES os_deliveries(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  order_id TEXT NOT NULL REFERENCES os_orders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  document_kind TEXT NOT NULL,
  numbering_policy TEXT NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL,
  born_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_delivery_notes_kind_chk CHECK (document_kind = 'nota_de_entrega'),
  CONSTRAINT os_delivery_notes_numbering_chk CHECK (numbering_policy = 'unknown'),
  CONSTRAINT os_delivery_notes_timing_chk CHECK (born_at >= delivered_at),
  CONSTRAINT os_delivery_notes_delivery_uidx UNIQUE (delivery_id)
);

CREATE TABLE os_delivery_note_lines (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  delivery_note_id TEXT NOT NULL REFERENCES os_delivery_notes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  order_line_id TEXT NOT NULL,
  product_ref TEXT,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_delivery_note_lines_quantity_chk CHECK (quantity >= 1),
  CONSTRAINT os_delivery_note_lines_description_chk CHECK (length(btrim(description)) > 0)
);

CREATE TABLE os_delivery_evidence (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  role TEXT NOT NULL,
  recorded_by_member_id TEXT NOT NULL REFERENCES os_organization_members(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  reference TEXT,
  note TEXT,
  payment_state TEXT,
  exception_reason TEXT,
  authorized_by_member_id TEXT,
  recipient TEXT,
  signature_reference TEXT,
  confirmed_ledger_payment BOOLEAN NOT NULL,
  ledger_posting TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_delivery_evidence_subject_chk CHECK (subject_type IN ('warehouse_exit', 'delivery')),
  CONSTRAINT os_delivery_evidence_role_chk CHECK (
    role IN (
      'commercial_coordination',
      'accounting_payment',
      'warehouse_outbound',
      'delivery_confirmation'
    )
  ),
  CONSTRAINT os_delivery_evidence_exit_role_chk CHECK (
    subject_type <> 'warehouse_exit' OR role = 'warehouse_outbound'
  ),
  CONSTRAINT os_delivery_evidence_confirmation_subject_chk CHECK (
    role <> 'delivery_confirmation' OR subject_type = 'delivery'
  ),
  CONSTRAINT os_delivery_evidence_payment_role_chk CHECK (
    (role = 'accounting_payment' AND payment_state IN ('reference', 'authorized_exception'))
    OR (role <> 'accounting_payment' AND payment_state IS NULL AND exception_reason IS NULL AND authorized_by_member_id IS NULL)
  ),
  CONSTRAINT os_delivery_evidence_payment_reference_chk CHECK (
    payment_state IS DISTINCT FROM 'reference'
    OR (reference IS NOT NULL AND length(btrim(reference)) > 0)
  ),
  CONSTRAINT os_delivery_evidence_exception_chk CHECK (
    payment_state IS DISTINCT FROM 'authorized_exception'
    OR (
      exception_reason IS NOT NULL
      AND length(btrim(exception_reason)) > 0
      AND authorized_by_member_id IS NOT NULL
    )
  ),
  CONSTRAINT os_delivery_evidence_recipient_chk CHECK (
    role = 'delivery_confirmation' OR (recipient IS NULL AND signature_reference IS NULL)
  ),
  CONSTRAINT os_delivery_evidence_ledger_chk CHECK (confirmed_ledger_payment = false),
  CONSTRAINT os_delivery_evidence_posting_chk CHECK (ledger_posting = 'none')
);

CREATE INDEX os_warehouse_exits_org_order_idx ON os_warehouse_exits (organization_id, order_id);
CREATE INDEX os_warehouse_outbound_notes_org_order_idx ON os_warehouse_outbound_notes (organization_id, order_id);
CREATE INDEX os_warehouse_outbound_note_lines_org_note_idx ON os_warehouse_outbound_note_lines (organization_id, outbound_note_id);
CREATE INDEX os_deliveries_org_order_idx ON os_deliveries (organization_id, order_id);
CREATE INDEX os_delivery_notes_org_order_idx ON os_delivery_notes (organization_id, order_id);
CREATE INDEX os_delivery_note_lines_org_note_idx ON os_delivery_note_lines (organization_id, delivery_note_id);
CREATE INDEX os_delivery_evidence_org_subject_idx ON os_delivery_evidence (organization_id, subject_type, subject_id, role);
