-- Finished-goods allocation. Receipt into Almacén de Productos Terminados is not this table.
-- A receipt does not assign a product to a Pedido. Allocation is an explicit later command.
-- Quantity may be partial. Several rows may later satisfy one order line.
-- This is not a delivery workflow and not an inventory ledger. Availability is not a column.
-- product_id and order_line_id are opaque. No foreign key to product master or os_order_lines.
-- finished_goods_receipt_id is an optional citation. It does not create or allocate a receipt.
-- This migration does not ALTER production, order, or inventory tables.

CREATE TABLE os_order_allocations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  product_id TEXT NOT NULL,
  goods_kind TEXT NOT NULL DEFAULT 'finished',
  quantity TEXT NOT NULL,
  order_line_id TEXT NOT NULL,
  allocated_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  actor_member_id TEXT,
  actor_label TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'explicit_command',
  finished_goods_receipt_id TEXT,
  idempotency_key TEXT,
  CONSTRAINT os_order_allocations_product_chk CHECK (length(btrim(product_id)) > 0),
  CONSTRAINT os_order_allocations_goods_kind_chk CHECK (goods_kind = 'finished'),
  CONSTRAINT os_order_allocations_line_chk CHECK (length(btrim(order_line_id)) > 0),
  CONSTRAINT os_order_allocations_quantity_chk CHECK (
    quantity ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'
    AND quantity::numeric > 0
  ),
  CONSTRAINT os_order_allocations_source_chk CHECK (source = 'explicit_command'),
  CONSTRAINT os_order_allocations_actor_chk CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT os_order_allocations_receipt_chk CHECK (
    finished_goods_receipt_id IS NULL OR length(btrim(finished_goods_receipt_id)) > 0
  )
);

CREATE UNIQUE INDEX os_order_allocations_org_idempotency_uidx
  ON os_order_allocations (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX os_order_allocations_org_product_idx
  ON os_order_allocations (organization_id, product_id, allocated_at);

CREATE INDEX os_order_allocations_org_line_idx
  ON os_order_allocations (organization_id, order_line_id, allocated_at);
