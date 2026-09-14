-- Pedido especial. Additive CREATE only.
-- Does not ALTER os_orders, party, quote, finance, or date tables.
-- Does not add customer date or production date onto os_orders.
-- order_id is opaque. No foreign key to os_orders.
-- classification is explicit: normal or special. There is no numeric threshold column.
-- requires_production_planning is independent. Special does not set it.
-- source stays human_explicit. A later rule would be a new migration, not a quantity check.
-- Audit is the actor, source, timestamp, and previous values. Rows are not rewritten.

CREATE TABLE os_special_order_classifications (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  order_id TEXT NOT NULL,
  classification TEXT NOT NULL,
  requires_production_planning BOOLEAN NOT NULL,
  actor_member_id TEXT,
  actor_label TEXT NOT NULL,
  source TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  previous_classification TEXT,
  previous_requires_production_planning BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_special_order_classifications_order_chk
    CHECK (length(btrim(order_id)) > 0),
  CONSTRAINT os_special_order_classifications_classification_chk
    CHECK (classification IN ('normal', 'special')),
  CONSTRAINT os_special_order_classifications_previous_chk
    CHECK (
      previous_classification IS NULL
      OR previous_classification IN ('normal', 'special')
    ),
  CONSTRAINT os_special_order_classifications_source_chk
    CHECK (source = 'human_explicit'),
  CONSTRAINT os_special_order_classifications_actor_chk
    CHECK (length(btrim(actor_label)) > 0)
);

CREATE INDEX os_special_order_classifications_org_order_idx
  ON os_special_order_classifications (organization_id, order_id, recorded_at);
