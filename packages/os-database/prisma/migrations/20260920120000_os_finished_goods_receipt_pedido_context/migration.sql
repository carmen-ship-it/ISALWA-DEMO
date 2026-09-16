-- Additive Pedido context columns on finished-goods physical receipt.
-- Not allocation, FIFO, valuation, stock ledger, or delivery.
-- Depends on 20260917120000_os_finished_goods_receipt (table may still be unapplied on hosted).
-- Does not touch DELIVERY / AllocateFinishedGoods surfaces.

ALTER TABLE os_finished_goods_receipts
  ADD COLUMN IF NOT EXISTS context_order_id TEXT,
  ADD COLUMN IF NOT EXISTS context_order_line_id TEXT,
  ADD COLUMN IF NOT EXISTS context_party_id TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE os_finished_goods_receipts
  DROP CONSTRAINT IF EXISTS os_finished_goods_receipts_context_pair_chk;

ALTER TABLE os_finished_goods_receipts
  ADD CONSTRAINT os_finished_goods_receipts_context_pair_chk CHECK (
    (context_order_id IS NULL AND context_order_line_id IS NULL)
    OR (
      context_order_id IS NOT NULL
      AND length(btrim(context_order_id)) > 0
      AND context_order_line_id IS NOT NULL
      AND length(btrim(context_order_line_id)) > 0
    )
  );

CREATE INDEX IF NOT EXISTS os_finished_goods_receipts_org_context_order_received_idx
  ON os_finished_goods_receipts (organization_id, context_order_id, received_at);
