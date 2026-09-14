-- Manufacturing trace. Product id is the join key.
-- A quema mixes products. It is not tied to a customer order.
-- Finished-goods receipt is warehouse Listo (Almacén de Productos Terminados).
-- It does not assign a product to a customer order. Allocation is another lane.
-- Consumption does not post stock. Input stock is not a ledger here.
-- % good and % lost are not columns. Derive them only from good_count and lost_count
-- when both exist. Do not invent a planned yield or another denominator.
-- Append-only. Corrections are new rows. This migration does not ALTER other tables.

CREATE TABLE os_production_quemas (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  actor_member_id TEXT,
  actor_label TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  evidence_json JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT,
  CONSTRAINT os_production_quemas_source_chk CHECK (source = 'manual'),
  CONSTRAINT os_production_quemas_actor_chk CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT os_production_quemas_evidence_chk CHECK (jsonb_typeof(evidence_json) = 'object')
);

CREATE UNIQUE INDEX os_production_quemas_org_idempotency_uidx
  ON os_production_quemas (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- started and ended times are facts. They are not updated in place.
CREATE TABLE os_production_quema_times (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  quema_id TEXT NOT NULL REFERENCES os_production_quemas(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  phase TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL,
  actor_member_id TEXT,
  actor_label TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  evidence_json JSONB NOT NULL,
  corrects_time_id TEXT,
  correction_reason TEXT,
  CONSTRAINT os_production_quema_times_phase_chk CHECK (phase IN ('start', 'end')),
  CONSTRAINT os_production_quema_times_source_chk CHECK (source = 'manual'),
  CONSTRAINT os_production_quema_times_actor_chk CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT os_production_quema_times_evidence_chk CHECK (jsonb_typeof(evidence_json) = 'object'),
  CONSTRAINT os_production_quema_times_correction_chk CHECK (
    (corrects_time_id IS NULL AND correction_reason IS NULL)
    OR (
      corrects_time_id IS NOT NULL
      AND correction_reason IS NOT NULL
      AND length(btrim(correction_reason)) > 0
    )
  ),
  CONSTRAINT os_production_quema_times_corrects_fk
    FOREIGN KEY (corrects_time_id) REFERENCES os_production_quema_times(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX os_production_quema_times_org_quema_idx
  ON os_production_quema_times (organization_id, quema_id, phase);

-- Product id is required. Quantity may be attached later. No customer-order column.
CREATE TABLE os_production_quema_products (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  quema_id TEXT NOT NULL REFERENCES os_production_quemas(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  product_id TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  actor_member_id TEXT,
  actor_label TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  evidence_json JSONB NOT NULL,
  corrects_link_id TEXT,
  correction_reason TEXT,
  CONSTRAINT os_production_quema_products_product_chk CHECK (length(btrim(product_id)) > 0),
  CONSTRAINT os_production_quema_products_source_chk CHECK (source = 'manual'),
  CONSTRAINT os_production_quema_products_actor_chk CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT os_production_quema_products_evidence_chk CHECK (jsonb_typeof(evidence_json) = 'object'),
  CONSTRAINT os_production_quema_products_quantity_chk CHECK (
    quantity IS NULL OR quantity ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'
  ),
  CONSTRAINT os_production_quema_products_unit_chk CHECK (
    (quantity IS NULL AND unit IS NULL)
    OR (quantity IS NOT NULL AND (unit IS NULL OR length(btrim(unit)) > 0))
  ),
  CONSTRAINT os_production_quema_products_correction_chk CHECK (
    (corrects_link_id IS NULL AND correction_reason IS NULL)
    OR (
      corrects_link_id IS NOT NULL
      AND correction_reason IS NOT NULL
      AND length(btrim(correction_reason)) > 0
    )
  ),
  CONSTRAINT os_production_quema_products_corrects_fk
    FOREIGN KEY (corrects_link_id) REFERENCES os_production_quema_products(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX os_production_quema_products_org_quema_idx
  ON os_production_quema_products (organization_id, quema_id);
CREATE INDEX os_production_quema_products_org_product_idx
  ON os_production_quema_products (organization_id, product_id);

CREATE TABLE os_production_trace_entries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  kind TEXT NOT NULL,
  product_id TEXT,
  step_key TEXT,
  quema_id TEXT,
  actor_member_id TEXT,
  actor_label TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  evidence_json JSONB NOT NULL,
  quantity_lost TEXT,
  percentage_lost TEXT,
  loss_reason TEXT,
  consumption_category TEXT,
  consumption_description TEXT,
  consumption_reference TEXT,
  consumption_quantity TEXT,
  consumption_unit TEXT,
  inventory_effect TEXT,
  good_count INTEGER,
  lost_count INTEGER,
  receipt_quantity TEXT,
  note TEXT,
  corrects_entry_id TEXT,
  correction_reason TEXT,
  idempotency_key TEXT,
  CONSTRAINT os_production_trace_entries_kind_chk CHECK (
    kind IN (
      'process_record',
      'loss',
      'consumption',
      'classification',
      'finished_goods_receipt'
    )
  ),
  CONSTRAINT os_production_trace_entries_source_chk CHECK (source = 'manual'),
  CONSTRAINT os_production_trace_entries_actor_chk CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT os_production_trace_entries_evidence_chk CHECK (jsonb_typeof(evidence_json) = 'object'),
  CONSTRAINT os_production_trace_entries_step_chk CHECK (
    step_key IS NULL
    OR step_key IN (
      'laboratorio',
      'molienda',
      'colaje',
      'secado',
      'pulido',
      'esmaltado',
      'carga_y_limpieza',
      'horno',
      'resane',
      'clasificacion',
      'almacen_productos_terminados'
    )
  ),
  CONSTRAINT os_production_trace_entries_product_chk CHECK (
    (
      kind IN ('process_record', 'classification', 'finished_goods_receipt')
      AND product_id IS NOT NULL
      AND length(btrim(product_id)) > 0
    )
    OR (kind = 'loss' AND (product_id IS NULL OR length(btrim(product_id)) > 0))
    OR (kind = 'consumption' AND product_id IS NULL)
  ),
  CONSTRAINT os_production_trace_entries_process_chk CHECK (
    kind <> 'process_record'
    OR (
      step_key IS NOT NULL
      AND receipt_quantity IS NULL
      AND quantity_lost IS NULL
      AND good_count IS NULL
      AND lost_count IS NULL
      AND inventory_effect IS NULL
    )
  ),
  CONSTRAINT os_production_trace_entries_quema_fk
    FOREIGN KEY (quema_id) REFERENCES os_production_quemas(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT os_production_trace_entries_quema_chk CHECK (
    quema_id IS NULL OR kind = 'process_record'
  ),
  CONSTRAINT os_production_trace_entries_loss_chk CHECK (
    (
      kind = 'loss'
      AND step_key IS NOT NULL
      AND quantity_lost IS NOT NULL
      AND percentage_lost IS NOT NULL
      AND loss_reason IS NOT NULL
      AND length(btrim(loss_reason)) > 0
      AND quantity_lost ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'
      AND percentage_lost ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'
    )
    OR (
      kind <> 'loss'
      AND quantity_lost IS NULL
      AND percentage_lost IS NULL
      AND loss_reason IS NULL
    )
  ),
  CONSTRAINT os_production_trace_entries_consumption_chk CHECK (
    (
      kind = 'consumption'
      AND step_key IS NOT NULL
      AND consumption_category IN ('raw_material', 'supply', 'fuel')
      AND consumption_description IS NOT NULL
      AND length(btrim(consumption_description)) > 0
      AND consumption_quantity IS NOT NULL
      AND consumption_quantity ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'
      AND consumption_unit IS NOT NULL
      AND length(btrim(consumption_unit)) > 0
      AND inventory_effect = 'none'
    )
    OR (
      kind <> 'consumption'
      AND consumption_category IS NULL
      AND consumption_description IS NULL
      AND consumption_reference IS NULL
      AND consumption_quantity IS NULL
      AND consumption_unit IS NULL
      AND inventory_effect IS NULL
    )
  ),
  CONSTRAINT os_production_trace_entries_classification_chk CHECK (
    (
      kind = 'classification'
      AND step_key = 'clasificacion'
      AND (good_count IS NULL OR good_count >= 0)
      AND (lost_count IS NULL OR lost_count >= 0)
    )
    OR (
      kind <> 'classification'
      AND good_count IS NULL
      AND lost_count IS NULL
    )
  ),
  CONSTRAINT os_production_trace_entries_receipt_chk CHECK (
    (
      kind = 'finished_goods_receipt'
      AND receipt_quantity IS NOT NULL
      AND receipt_quantity ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'
      AND receipt_quantity <> '0'
      AND step_key IS NULL
    )
    OR (kind <> 'finished_goods_receipt' AND receipt_quantity IS NULL)
  ),
  CONSTRAINT os_production_trace_entries_correction_chk CHECK (
    (corrects_entry_id IS NULL AND correction_reason IS NULL)
    OR (
      corrects_entry_id IS NOT NULL
      AND correction_reason IS NOT NULL
      AND length(btrim(correction_reason)) > 0
    )
  ),
  CONSTRAINT os_production_trace_entries_corrects_fk
    FOREIGN KEY (corrects_entry_id) REFERENCES os_production_trace_entries(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX os_production_trace_entries_org_idempotency_uidx
  ON os_production_trace_entries (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX os_production_trace_entries_org_product_idx
  ON os_production_trace_entries (organization_id, product_id);
CREATE INDEX os_production_trace_entries_org_kind_idx
  ON os_production_trace_entries (organization_id, kind);
CREATE INDEX os_production_trace_entries_corrects_idx
  ON os_production_trace_entries (organization_id, corrects_entry_id);

-- product_id is an opaque join key. No product name, SKU, or price column.
-- No foreign key to a customer order. No allocation table. No inventory movement table.

CREATE OR REPLACE FUNCTION os_production_trace_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'production trace is append-only';
END;
$$;

CREATE TRIGGER os_production_quemas_append_only
  BEFORE UPDATE OR DELETE ON os_production_quemas
  FOR EACH ROW
  EXECUTE FUNCTION os_production_trace_reject_mutation();

CREATE TRIGGER os_production_quema_times_append_only
  BEFORE UPDATE OR DELETE ON os_production_quema_times
  FOR EACH ROW
  EXECUTE FUNCTION os_production_trace_reject_mutation();

CREATE TRIGGER os_production_quema_products_append_only
  BEFORE UPDATE OR DELETE ON os_production_quema_products
  FOR EACH ROW
  EXECUTE FUNCTION os_production_trace_reject_mutation();

CREATE TRIGGER os_production_trace_entries_append_only
  BEFORE UPDATE OR DELETE ON os_production_trace_entries
  FOR EACH ROW
  EXECUTE FUNCTION os_production_trace_reject_mutation();
