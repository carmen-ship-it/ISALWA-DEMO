-- Additive Listo foundation. Not applied by this pass.
-- A receipt into Almacén de Productos Terminados is not allocation, delivery, payment, or stock-ledger truth.
-- Production stays independent of Pedido. This table has no order_id and does not create Order → ProductionRun.
-- product_id is opaque. No SKU, valuation, cost, tax, or availability formula.
-- production_trace_entry_id and quema_id are optional citations. They are not foreign keys and not order links.
-- Corrections append. They do not update a prior quantity in place.
-- Does not alter 20260916140000_os_purchase_status_workflow.

CREATE TABLE os_finished_goods_receipts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  product_id TEXT NOT NULL,
  quantity TEXT NOT NULL,
  warehouse_label TEXT NOT NULL DEFAULT 'Almacén de Productos Terminados',
  received_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  actor_member_id TEXT,
  actor_label TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'explicit_command',
  production_trace_entry_id TEXT,
  quema_id TEXT,
  corrects_receipt_id TEXT,
  correction_reason TEXT,
  idempotency_key TEXT,
  CONSTRAINT os_finished_goods_receipts_product_chk CHECK (length(btrim(product_id)) > 0),
  CONSTRAINT os_finished_goods_receipts_warehouse_chk CHECK (
    warehouse_label = 'Almacén de Productos Terminados'
  ),
  CONSTRAINT os_finished_goods_receipts_quantity_chk CHECK (
    quantity ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'
    AND quantity::numeric > 0
  ),
  CONSTRAINT os_finished_goods_receipts_source_chk CHECK (source = 'explicit_command'),
  CONSTRAINT os_finished_goods_receipts_actor_chk CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT os_finished_goods_receipts_trace_chk CHECK (
    production_trace_entry_id IS NULL OR length(btrim(production_trace_entry_id)) > 0
  ),
  CONSTRAINT os_finished_goods_receipts_quema_chk CHECK (
    quema_id IS NULL OR length(btrim(quema_id)) > 0
  ),
  CONSTRAINT os_finished_goods_receipts_correction_chk CHECK (
    (corrects_receipt_id IS NULL AND correction_reason IS NULL)
    OR (
      corrects_receipt_id IS NOT NULL
      AND length(btrim(corrects_receipt_id)) > 0
      AND correction_reason IS NOT NULL
      AND length(btrim(correction_reason)) > 0
    )
  )
);

CREATE UNIQUE INDEX os_finished_goods_receipts_org_idempotency_uidx
  ON os_finished_goods_receipts (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX os_finished_goods_receipts_org_product_received_idx
  ON os_finished_goods_receipts (organization_id, product_id, received_at);

CREATE INDEX os_finished_goods_receipts_org_received_idx
  ON os_finished_goods_receipts (organization_id, received_at);
